import { Hono } from 'hono';
import { COMBO_NAMES_UZ, describeOptionsUz } from '../../shared/describe.js';
import type { OrderLine } from '../../shared/types.js';
import { orderRequestSchema } from '../../shared/validation.js';
import { get, isUniqueError, run, tx } from '../db.js';
import { getEnv } from '../env.js';
import { decrypt, encrypt, randomCode, randomToken, safeEqual, sha256 } from '../lib/crypto.js';
import { ApiError, badRequest, conflict } from '../lib/errors.js';
import { body, param, RE } from '../lib/http.js';
import { enforce } from '../lib/rateLimit.js';
import { cleanText } from '../lib/sanitize.js';
import { ownOrigin } from '../middleware/security.js';
import { currentUser, loadUser, requireUser } from '../middleware/auth.js';
import { orders, type OrderRecord } from '../models.js';
import { changeBonus } from '../services/bonus.js';
import { buildQuote } from '../services/checkout.js';
import { paymentConfigured, paymentUrl } from '../services/payments.js';
import { toOrder } from '../services/serialize.js';
import { notifyNewOrder } from '../services/telegram.js';
import type { AppEnv } from '../types.js';

export const orderRoutes = new Hono<AppEnv>();

const TZ_OFFSET = '+05:00'; // Asia/Tashkent

/** Taxminiy yetkazish vaqti: hudud vaqti + fast-food tayyorlanishi yoki tanlangan vaqt oralig'i */
function computeEta(deliveryTime: string, minutes: number): number {
  const now = Date.now();
  if (deliveryTime === 'asap') return now + minutes * 60_000;
  const start = deliveryTime.slice(0, 5);
  const today = new Date(now + 5 * 3600_000).toISOString().slice(0, 10);
  let eta = Date.parse(`${today}T${start}:00${TZ_OFFSET}`);
  if (eta < now) eta += 86_400_000;
  return eta;
}

interface IdemRow {
  order_id: string;
  track_token_enc: string;
  payment_url: string | null;
}

orderRoutes.post('/', async (c) => {
  const env = getEnv();
  const user = loadUser(c);
  const idemKey = c.req.header('idempotency-key') ?? '';
  if (!/^[A-Za-z0-9-]{16,64}$/.test(idemKey)) throw badRequest('err.idempotency');
  enforce('order-ip', c.get('ipHash'), 10, 600);
  const input = await body(c, orderRequestSchema);
  enforce('order-phone', input.phone, 5, 600);

  const idemId = sha256(`${idemKey}:${user?.id ?? c.get('ipHash')}`);
  const replay = get<IdemRow>('SELECT order_id, track_token_enc, payment_url FROM idempotency WHERE id = ?', [idemId]);
  if (replay) {
    const existing = orders.byId(replay.order_id);
    if (existing) return c.json({ order: toOrder(existing), trackToken: decrypt(replay.track_token_enc, 'track'), paymentUrl: replay.payment_url ?? undefined });
  }

  if (!paymentConfigured(input.paymentMethod)) throw new ApiError(400, 'pay.unavailable');

  const trackToken = randomToken(18);
  const origin = env.origins[0] ?? ownOrigin(c);

  // Butun buyurtma bitta sinxron tranzaksiyada: narx hisobi → bonus → promokod → saqlash.
  // Xato bo'lsa hammasi bekor qilinadi; boshqa so'rovlar oraliqda aralasha olmaydi.
  const { order, payUrl } = tx(() => {
    const q = buildQuote(
      { items: input.items, promoCode: input.promoCode || undefined, useBonus: input.useBonus, deliveryMethod: input.deliveryMethod, zoneId: input.zoneId, phone: input.phone },
      user,
    );
    if (q.promoError) throw new ApiError(400, q.promoError, { minOrder: q.quote.promo?.minOrder });
    const lines = q.lines.filter((l) => l.available);
    if (lines.length === 0) throw new ApiError(400, 'checkout.emptyError');
    if (input.deliveryMethod === 'delivery' && !q.zone) throw new ApiError(400, 'checkout.zoneRequired');

    let orderId = `EM-${randomCode(8)}`;
    while (orders.byId(orderId)) orderId = `EM-${randomCode(8)}`;

    // 1) Bonus — atomik yechish (balans yetmasa rad etiladi)
    if (user && q.quote.bonusUsed > 0 && !changeBonus(user.id, -q.quote.bonusUsed, 'order_spent', orderId)) {
      throw conflict('order.bonusChanged');
    }
    // 2) Promokod — umumiy limit va "faqat birinchi xarid"
    if (q.promo) {
      const used = run('UPDATE promos SET used_count = used_count + 1 WHERE code = ? AND (max_uses IS NULL OR used_count < max_uses)', [q.promo.code]);
      if (!used) throw new ApiError(400, 'promo.exhausted');
      if (q.promo.firstOrderOnly) {
        try {
          run('INSERT INTO promo_uses (id, order_id, created_at) VALUES (?, ?, ?)', [`${q.promo.code}:${input.phone}`, orderId, Date.now()]);
        } catch (err) {
          if (isUniqueError(err)) throw new ApiError(400, 'promo.firstOnly');
          throw err;
        }
      }
    }

    const orderLines: OrderLine[] = lines.map((l) => ({
      kind: l.item.kind,
      refId: l.item.refId,
      name: l.combo ? COMBO_NAMES_UZ[l.combo.nameKey] : (l.product?.name ?? ''),
      qty: l.item.qty,
      unit: l.unit,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
      optionsLabel: describeOptionsUz(l.product, l.item.options),
      options: l.item.options,
    }));
    const prep = Math.max(0, ...lines.map((l) => l.product?.prepTime ?? 0));
    const baseMinutes = input.deliveryMethod === 'delivery' ? (q.zone?.minutes ?? 40) : input.deliveryMethod === 'pickup' ? 20 : 30;
    const now = Date.now();
    const record: OrderRecord = {
      id: orderId,
      createdAt: now,
      userId: user?.id,
      customerName: cleanText(input.customerName, 50),
      phone: input.phone,
      lines: orderLines,
      subtotal: q.quote.subtotal,
      discount: q.quote.discount,
      promoCode: q.promo?.code,
      bonusUsed: q.quote.bonusUsed,
      bonusEarned: q.quote.bonusEarned,
      bonusCredited: false,
      deliveryFee: q.quote.deliveryFee,
      total: q.quote.total,
      deliveryMethod: input.deliveryMethod,
      zoneId: q.zone?.id,
      address: input.deliveryMethod === 'delivery' && input.address ? cleanText(input.address, 200) : undefined,
      deliveryTime: input.deliveryTime,
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentMethod === 'cash' ? 'cash' : 'pending',
      comment: input.comment ? cleanText(input.comment, 300, true) || undefined : undefined,
      status: 'accepted',
      statusHistory: [{ status: 'accepted', at: now }],
      etaAt: computeEta(input.deliveryTime, baseMinutes + Math.min(prep, 30)),
      hasFastFood: lines.some((l) => l.isFastFood),
      trackTokenHash: sha256(trackToken),
    };
    orders.insert(record);
    const url = paymentUrl(record, `${origin}/order/success/${orderId}?t=${trackToken}`);
    run('INSERT OR IGNORE INTO idempotency (id, order_id, track_token_enc, payment_url, expires_at) VALUES (?, ?, ?, ?, ?)', [
      idemId,
      orderId,
      encrypt(trackToken, 'track'),
      url ?? null,
      now + 24 * 3600_000,
    ]);
    return { order: record, payUrl: url };
  });

  await notifyNewOrder(order);
  return c.json({ order: toOrder(order), trackToken, paymentUrl: payUrl }, 201);
});

orderRoutes.get('/mine', requireUser, (c) => {
  const user = currentUser(c);
  return c.json({ orders: orders.list('WHERE user_id = ? OR phone = ?', [user.id, user.phone], 50).map(toOrder) });
});

/**
 * Buyurtmani kuzatish: egasi (sessiya), admin yoki maxfiy track token egasi ko'ra oladi.
 * Topilmasa YOKI ruxsat bo'lmasa — bir xil javob `{ order: null }` (buyurtma mavjudligini
 * oshkor qilmaslik uchun). Bu oddiy "qidiruv natijasi yo'q" holati, shuning uchun HTTP 200.
 */
orderRoutes.get('/:id', (c) => {
  enforce('track', c.get('ipHash'), 60, 600);
  const id = param(c, 'id', RE.orderId);
  const token = c.req.query('t') ?? '';
  const order = orders.byId(id);
  const user = loadUser(c);
  const owner = !!order && !!user && (order.userId === user.id || order.phone === user.phone || user.role === 'admin');
  const tokenOk = !!order && token.length > 10 && token.length < 64 && safeEqual(order.trackTokenHash, sha256(token));
  return c.json({ order: order && (owner || tokenOk) ? toOrder(order) : null });
});
