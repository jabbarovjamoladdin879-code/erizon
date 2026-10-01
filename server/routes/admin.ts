import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { CATEGORY_MAP } from '../../shared/categories.js';
import { formatSum } from '../../shared/describe.js';
import { ORDER_STATUSES, type OrderStatus, type Product } from '../../shared/types.js';
import {
  adminDealSchema,
  adminGiftSchema,
  adminProductSchema,
  adminPromoSchema,
  adminStatusSchema,
  totpCodeRequestSchema,
} from '../../shared/validation.js';
import { all, deleteSetting, get, newId, run, setSetting, tx } from '../db.js';
import { randomCode, sha256 } from '../lib/crypto.js';
import { ApiError, badRequest, notFound } from '../lib/errors.js';
import { body, param, RE } from '../lib/http.js';
import { enforce } from '../lib/rateLimit.js';
import { cleanText } from '../lib/sanitize.js';
import { setAccessCookie } from '../lib/tokens.js';
import { currentUser, reloadUser, requireAdmin } from '../middleware/auth.js';
import { orders, products, users, type ProductRecord } from '../models.js';
import { audit } from '../services/audit.js';
import { changeBonus } from '../services/bonus.js';
import type { DealSetting } from '../services/checkout.js';
import { toOrder, toProduct, toPromo, toPublicUser, type PromoRow } from '../services/serialize.js';
import { createTotpSetup, verifyTotp } from '../services/totp.js';
import type { AppEnv } from '../types.js';
import { REFERRAL_BONUS } from './auth.js';

export const adminRoutes = new Hono<AppEnv>();

/* ------------------------- 2FA (sozlash) ------------------------- */
// Bu marshrutlar 2FA hali yoqilmagan admin uchun ham ochiq (aks holda yoqib bo'lmaydi)
const twoFa = new Hono<AppEnv>();
twoFa.use('*', requireAdmin({ allowWithout2fa: true }));

twoFa.post('/setup', async (c) => {
  const user = currentUser(c);
  if (user.totpEnabled) throw new ApiError(400, 'admin.2faAlready');
  return c.json(await createTotpSetup(user));
});

twoFa.post('/enable', async (c) => {
  const user = currentUser(c);
  enforce('totp', user.id, 5, 300, 'auth.tooMany');
  const { code } = await body(c, totpCodeRequestSchema);
  const fresh = users.byId(user.id) ?? user;
  if (!fresh.totpPendingEnc || !verifyTotp(fresh, code, 'pending')) throw new ApiError(400, 'auth.totpInvalid');
  run('UPDATE users SET totp_secret_enc = totp_pending_enc, totp_pending_enc = NULL, totp_enabled = 1, updated_at = ? WHERE id = ?', [Date.now(), user.id]);
  const updated = reloadUser(c);
  if (updated) await setAccessCookie(c, updated, true, c.get('claims')?.sid ?? '');
  audit(c, '2fa.enable');
  return c.json({ user: updated ? toPublicUser(updated) : null });
});

twoFa.post('/disable', async (c) => {
  const user = currentUser(c);
  enforce('totp', user.id, 5, 300, 'auth.tooMany');
  const { code } = await body(c, totpCodeRequestSchema);
  if (!user.totpEnabled || !verifyTotp(user, code)) throw new ApiError(400, 'auth.totpInvalid');
  run('UPDATE users SET totp_enabled = 0, totp_secret_enc = NULL, totp_last_step = NULL, updated_at = ? WHERE id = ?', [Date.now(), user.id]);
  audit(c, '2fa.disable');
  const updated = reloadUser(c);
  return c.json({ user: updated ? toPublicUser(updated) : null });
});

adminRoutes.route('/2fa', twoFa);

/* --------------- Qolgan barcha admin marshrutlari --------------- */
const admin = new Hono<AppEnv>();
const strictAdmin = requireAdmin();
admin.use('*', (c, next) => (c.req.path.startsWith('/api/admin/2fa/') ? next() : strictAdmin(c, next)));

/** Toshkent vaqti bo'yicha kun boshi (ms) */
function tashkentDay(offsetDays = 0): number {
  const day = new Date(Date.now() + 5 * 3600_000 - offsetDays * 86_400_000).toISOString().slice(0, 10);
  return Date.parse(`${day}T00:00:00+05:00`);
}

admin.get('/stats', (c) => {
  const today = tashkentDay(0);
  const since = tashkentDay(6);
  const todayAgg = get<{ n: number; s: number | null }>("SELECT COUNT(*) AS n, SUM(total) AS s FROM orders WHERE status != 'cancelled' AND created_at >= ?", [today]);
  const totalAgg = get<{ n: number; s: number | null }>("SELECT COUNT(*) AS n, SUM(total) AS s FROM orders WHERE status != 'cancelled'");
  const days = all<{ day: string; s: number }>(
    `SELECT date((created_at / 1000) + 18000, 'unixepoch') AS day, SUM(total) AS s FROM orders
     WHERE status != 'cancelled' AND created_at >= ? GROUP BY day`,
    [since],
  );
  const byStatus = all<{ status: OrderStatus; n: number }>('SELECT status, COUNT(*) AS n FROM orders GROUP BY status');
  const topViewed = all<{ id: string; views: number; data: string }>('SELECT id, views, data FROM products ORDER BY views DESC LIMIT 6');

  // Ko'p sotilganlar (buyurtma qatorlari JSON ichida — JS'da yig'amiz)
  const sold = new Map<string, { name: string; qty: number }>();
  for (const o of orders.list("WHERE status != 'cancelled'", [], 500)) {
    for (const l of o.lines) {
      const cur = sold.get(l.refId) ?? { name: l.name, qty: 0 };
      cur.qty += l.qty;
      sold.set(l.refId, cur);
    }
  }
  const dayMap = new Map(days.map((d) => [d.day, d.s]));
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(since + i * 86_400_000 + 5 * 3600_000).toISOString().slice(0, 10);
    return { day: d, sum: dayMap.get(d) ?? 0 };
  });
  const totalCount = totalAgg?.n ?? 0;
  return c.json({
    todayCount: todayAgg?.n ?? 0,
    todayRevenue: todayAgg?.s ?? 0,
    avgCheck: totalCount ? Math.round((totalAgg?.s ?? 0) / totalCount) : 0,
    totalOrders: byStatus.reduce((s, b) => s + b.n, 0),
    users: users.count(),
    outOfStock: get<{ n: number }>('SELECT COUNT(*) AS n FROM products WHERE in_stock = 0')?.n ?? 0,
    last7,
    topProducts: [...sold.values()].sort((a, b) => b.qty - a.qty).slice(0, 6).map((t) => ({ name: t.name, value: t.qty })),
    topViewed: topViewed.map((p) => ({ name: (JSON.parse(p.data) as { name: string }).name, value: p.views })),
    byStatus: Object.fromEntries(byStatus.map((b) => [b.status, b.n])),
  });
});

/* ----------------------------- Mahsulotlar ----------------------------- */
admin.get('/products', (c) => c.json({ products: products.all().map((p) => toProduct(p, true)) }));

type ProductInput = ReturnType<typeof adminProductSchema.parse>;

function applyInput(base: Partial<ProductRecord>, input: ProductInput): Omit<Product, 'id' | 'createdAt' | 'rating' | 'reviewsCount' | 'popularity' | 'hue'> {
  const out = {
    ...base,
    name: cleanText(input.name, 80),
    categoryId: input.categoryId,
    price: input.price,
    oldPrice: input.oldPrice ?? undefined,
    unit: input.unit,
    inStock: input.inStock,
    description: cleanText(input.description, 600),
    icon: input.icon,
    manufacturer: input.manufacturer ? cleanText(input.manufacturer, 80) : undefined,
    expiry: input.expiry ? cleanText(input.expiry, 60) : undefined,
    halal: input.halal || undefined,
    images: input.images?.length ? input.images : undefined,
    prepTime: input.categoryId === 'fastfood' && input.prepTime ? input.prepTime : undefined,
    cuttable: input.categoryId === 'meat' && input.unit === 'kg' ? (base.cuttable ?? true) : undefined,
  };
  return out;
}

admin.post('/products', async (c) => {
  const input = await body(c, adminProductSchema);
  const product: Product = {
    ...applyInput({}, input),
    id: `p-${randomCode(6).toLowerCase()}`,
    rating: 5,
    reviewsCount: 0,
    popularity: 0,
    hue: CATEGORY_MAP[input.categoryId]?.hue ?? 260,
    createdAt: new Date().toISOString(),
  };
  products.save(product);
  audit(c, 'product.create', product.id);
  const saved = products.byId(product.id);
  return c.json({ product: saved ? toProduct(saved, true) : product }, 201);
});

/** Mahsulot omborga qaytganda — obuna bo'lganlarga bildirishnoma */
function notifyBackInStock(productId: string, name: string): void {
  const alerts = all<{ user_id: string }>('SELECT user_id FROM stock_alerts WHERE product_id = ? LIMIT 5000', [productId]);
  if (!alerts.length) return;
  tx(() => {
    const now = Date.now();
    for (const a of alerts) {
      run("INSERT INTO notifications (id, user_id, type, product_id, text, read, created_at) VALUES (?, ?, 'back_in_stock', ?, ?, 0, ?)", [
        newId(),
        a.user_id,
        productId,
        name,
        now,
      ]);
    }
    run('DELETE FROM stock_alerts WHERE product_id = ?', [productId]);
  });
}

admin.patch('/products/:id', async (c) => {
  const id = param(c, 'id', RE.productId);
  const input = await body(c, adminProductSchema);
  const before = products.byId(id);
  if (!before) throw notFound();
  const updated: ProductRecord = { ...before, ...applyInput(before, input), id, createdAt: before.createdAt };
  products.save(updated);
  if (!before.inStock && updated.inStock) notifyBackInStock(id, updated.name);
  audit(c, 'product.update', id);
  const saved = products.byId(id);
  return c.json({ product: toProduct(saved ?? updated, true) });
});

admin.post('/products/:id/toggle-stock', (c) => {
  const id = param(c, 'id', RE.productId);
  if (!run('UPDATE products SET in_stock = 1 - in_stock, updated_at = ? WHERE id = ?', [Date.now(), id])) throw notFound();
  const updated = products.byId(id);
  if (!updated) throw notFound();
  if (updated.inStock) notifyBackInStock(id, updated.name);
  audit(c, updated.inStock ? 'product.inStock' : 'product.outOfStock', id);
  return c.json({ product: toProduct(updated, true) });
});

admin.delete('/products/:id', (c) => {
  const id = param(c, 'id', RE.productId);
  tx(() => {
    if (!run('DELETE FROM products WHERE id = ?', [id])) throw notFound();
    run('DELETE FROM stock_alerts WHERE product_id = ?', [id]);
    const deal = get<{ value: string }>("SELECT value FROM settings WHERE key = 'deal'");
    if (deal && (JSON.parse(deal.value) as DealSetting).productId === id) deleteSetting('deal');
  });
  audit(c, 'product.delete', id);
  return c.json({ ok: true });
});

/* ------------------------------ Rasmlar ------------------------------ */
const MAX_IMAGE = 1_500_000;

function detectImage(buf: Buffer): 'image/png' | 'image/jpeg' | 'image/webp' | null {
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length > 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

admin.post(
  '/images',
  bodyLimit({
    maxSize: MAX_IMAGE,
    onError: () => {
      throw new ApiError(413, 'admin.imageTooLarge');
    },
  }),
  async (c) => {
    const user = currentUser(c);
    enforce('upload', user.id, 30, 3600);
    const buf = Buffer.from(await c.req.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_IMAGE) throw new ApiError(413, 'admin.imageTooLarge');
    // Turi fayl mazmunidan (magic bytes) aniqlanadi — yuborilgan Content-Type'ga ishonilmaydi
    const contentType = detectImage(buf);
    if (!contentType) throw new ApiError(415, 'admin.imageType');
    const id = newId();
    run('INSERT INTO images (id, content_type, data, size, sha256, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      id,
      contentType,
      new Uint8Array(buf),
      buf.length,
      sha256(buf.toString('base64')),
      Date.now(),
      user.id,
    ]);
    audit(c, 'image.upload', id);
    return c.json({ url: `/api/images/${id}` }, 201);
  },
);

/* ----------------------------- Buyurtmalar ----------------------------- */
admin.get('/orders', (c) => {
  const status = c.req.query('status');
  const valid = status && (ORDER_STATUSES as readonly string[]).includes(status);
  const list = valid ? orders.list('WHERE status = ?', [status], 200) : orders.list('', [], 200);
  return c.json({ orders: list.map(toOrder) });
});

const STATUS_TEXT: Record<OrderStatus, string> = {
  accepted: 'Qabul qilindi',
  preparing: 'Tayyorlanmoqda',
  on_the_way: "Yo'lda",
  delivered: 'Yetkazildi',
  cancelled: 'Bekor qilindi',
};

admin.patch('/orders/:id/status', async (c) => {
  const id = param(c, 'id', RE.orderId);
  const { status } = await body(c, adminStatusSchema);
  // Holat o'zgarishi, bonus va bildirishnomalar bitta tranzaksiyada
  const order = tx(() => {
    const o = orders.byId(id);
    // Yakunlangan buyurtmani qayta o'zgartirib bo'lmaydi (bonus ikki marta berilmasligi uchun)
    if (!o || o.status === 'delivered' || o.status === 'cancelled') throw badRequest('admin.statusLocked');
    o.status = status;
    o.statusHistory.push({ status, at: Date.now() });
    if (o.userId) {
      if (status === 'delivered' && o.bonusEarned > 0 && !o.bonusCredited) {
        o.bonusCredited = true;
        changeBonus(o.userId, o.bonusEarned, 'order_earned', id);
      }
      if (status === 'delivered') {
        // Taklif qilgan do'stga bonus — taklif qilingan foydalanuvchining birinchi yetkazilgan buyurtmasidan keyin
        const buyer = users.byId(o.userId);
        if (buyer?.referredBy && !buyer.referralRewarded) {
          run('UPDATE users SET referral_rewarded = 1 WHERE id = ? AND referral_rewarded = 0', [buyer.id]);
          changeBonus(buyer.referredBy, REFERRAL_BONUS, 'referral', id);
        }
      }
      if (status === 'cancelled' && o.bonusUsed > 0) changeBonus(o.userId, o.bonusUsed, 'order_refund', id);
      run("INSERT INTO notifications (id, user_id, type, order_id, text, read, created_at) VALUES (?, ?, 'order_status', ?, ?, 0, ?)", [
        newId(),
        o.userId,
        id,
        `${id}: ${STATUS_TEXT[status]}`,
        Date.now(),
      ]);
    }
    orders.update(o);
    return o;
  });
  audit(c, `order.${status}`, id);
  return c.json({ order: toOrder(order) });
});

/* ----------------------------- Promokodlar ----------------------------- */
admin.get('/promos', (c) => c.json({ promos: all<PromoRow>('SELECT * FROM promos ORDER BY created_at DESC').map(toPromo) }));

admin.put('/promos', async (c) => {
  const p = await body(c, adminPromoSchema);
  run(
    `INSERT INTO promos (code, type, value, min_order, expires_at, active, first_order_only, max_discount, max_uses, used_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
     ON CONFLICT(code) DO UPDATE SET type = excluded.type, value = excluded.value, min_order = excluded.min_order,
       expires_at = excluded.expires_at, active = excluded.active, first_order_only = excluded.first_order_only,
       max_discount = excluded.max_discount, max_uses = excluded.max_uses`,
    [p.code, p.type, p.value, p.minOrder, Date.parse(p.expiresAt), p.active, p.firstOrderOnly, p.maxDiscount ?? null, p.maxUses ?? null, Date.now()],
  );
  audit(c, 'promo.save', p.code);
  return c.json({ ok: true });
});

admin.post('/promos/:code/toggle', (c) => {
  const code = param(c, 'code', RE.promo);
  if (!run('UPDATE promos SET active = 1 - active WHERE code = ?', [code])) throw notFound();
  audit(c, 'promo.toggle', code);
  return c.json({ ok: true });
});

admin.delete('/promos/:code', (c) => {
  const code = param(c, 'code', RE.promo);
  run('DELETE FROM promos WHERE code = ?', [code]);
  audit(c, 'promo.delete', code);
  return c.json({ ok: true });
});

/* ----------------------------- Kun aksiyasi ----------------------------- */
admin.put('/deal', async (c) => {
  const { productId, dealPrice, hours } = await body(c, adminDealSchema);
  const product = products.byId(productId);
  if (!product) throw notFound();
  if (dealPrice >= product.price) throw badRequest('admin.dealPrice');
  setSetting('deal', { productId, dealPrice, endsAt: Date.now() + hours * 3600_000, auto: false } satisfies DealSetting);
  audit(c, 'deal.set', productId);
  return c.json({ ok: true });
});

admin.delete('/deal', (c) => {
  deleteSetting('deal');
  audit(c, 'deal.end');
  return c.json({ ok: true });
});

/* ------------------------- Sovg'a sertifikatlari ------------------------- */
admin.get('/gifts', (c) => {
  const list = all<{ code: string; value: number; expires_at: number; used_at: number | null; created_at: number }>(
    'SELECT code, value, expires_at, used_at, created_at FROM gift_cards ORDER BY created_at DESC LIMIT 200',
  );
  return c.json({
    gifts: list.map((g) => ({
      code: g.code,
      value: g.value,
      expiresAt: new Date(g.expires_at).toISOString(),
      usedAt: g.used_at ? new Date(g.used_at).toISOString() : undefined,
      createdAt: new Date(g.created_at).toISOString(),
    })),
  });
});

admin.post('/gifts', async (c) => {
  const user = currentUser(c);
  const { value, count, days } = await body(c, adminGiftSchema);
  const now = Date.now();
  const codes = tx(() => {
    const out: string[] = [];
    while (out.length < count) {
      // ~60 bit entropiya: ERZ-XXXX-XXXX-XXXX
      const code = `ERZ-${randomCode(4)}-${randomCode(4)}-${randomCode(4)}`;
      if (run('INSERT OR IGNORE INTO gift_cards (code, value, expires_at, created_at, created_by) VALUES (?, ?, ?, ?, ?)', [code, value, now + days * 86_400_000, now, user.id])) {
        out.push(code);
      }
    }
    return out;
  });
  audit(c, 'gift.create', `${count} × ${formatSum(value)}`);
  return c.json({ codes }, 201);
});

admin.delete('/gifts/:code', (c) => {
  const code = param(c, 'code', RE.gift);
  run('DELETE FROM gift_cards WHERE code = ? AND used_at IS NULL', [code]);
  audit(c, 'gift.delete', code);
  return c.json({ ok: true });
});

/* ------------------------------ Audit ------------------------------ */
admin.get('/audit', (c) => {
  const list = all<{ id: string; admin_name: string; action: string; target: string | null; created_at: number }>(
    'SELECT id, admin_name, action, target, created_at FROM audit ORDER BY created_at DESC LIMIT 200',
  );
  return c.json({
    entries: list.map((a) => ({ id: a.id, adminName: a.admin_name, action: a.action, target: a.target ?? undefined, createdAt: new Date(a.created_at).toISOString() })),
  });
});

adminRoutes.route('/', admin);
