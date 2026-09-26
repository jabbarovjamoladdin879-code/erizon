import { Hono } from 'hono';
import { addressRequestSchema, giftRedeemSchema, profileUpdateSchema } from '../../shared/validation.js';
import { all, get, newId, run, tx } from '../db.js';
import { ApiError, notFound } from '../lib/errors.js';
import { body, param, RE } from '../lib/http.js';
import { enforce } from '../lib/rateLimit.js';
import { cleanText } from '../lib/sanitize.js';
import { currentUser, reloadUser, requireUser } from '../middleware/auth.js';
import { products, users } from '../models.js';
import { changeBonus } from '../services/bonus.js';
import { toPublicUser } from '../services/serialize.js';
import type { AppEnv } from '../types.js';

export const meRoutes = new Hono<AppEnv>();
meRoutes.use('*', requireUser);

meRoutes.patch('/', async (c) => {
  const user = currentUser(c);
  const { name } = await body(c, profileUpdateSchema);
  run('UPDATE users SET name = ?, updated_at = ? WHERE id = ?', [cleanText(name, 50), Date.now(), user.id]);
  return c.json({ user: toPublicUser(users.byId(user.id) ?? user) });
});

meRoutes.post('/addresses', async (c) => {
  const user = currentUser(c);
  const input = await body(c, addressRequestSchema);
  // Sinxron o'qish + yozish (oraliqda boshqa so'rov aralasha olmaydi)
  const fresh = users.byId(user.id) ?? user;
  if (fresh.addresses.length >= 10) throw new ApiError(400, 'profile.addressLimit');
  const address = { id: newId(), label: cleanText(input.label, 30), zoneId: input.zoneId, address: cleanText(input.address, 200) };
  run('UPDATE users SET addresses = ?, updated_at = ? WHERE id = ?', [JSON.stringify([...fresh.addresses, address]), Date.now(), user.id]);
  return c.json({ user: toPublicUser(users.byId(user.id) ?? user) }, 201);
});

meRoutes.delete('/addresses/:id', (c) => {
  const user = currentUser(c);
  const id = param(c, 'id', RE.objectId);
  const fresh = users.byId(user.id) ?? user;
  run('UPDATE users SET addresses = ?, updated_at = ? WHERE id = ?', [JSON.stringify(fresh.addresses.filter((a) => a.id !== id)), Date.now(), user.id]);
  return c.json({ user: toPublicUser(users.byId(user.id) ?? user) });
});

meRoutes.get('/bonus', (c) => {
  const user = currentUser(c);
  const entries = all<{ id: string; delta: number; reason: string; order_id: string | null; created_at: number }>(
    'SELECT * FROM bonus_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
    [user.id],
  );
  return c.json({
    balance: user.bonus,
    entries: entries.map((e) => ({ id: e.id, delta: e.delta, reason: e.reason, orderId: e.order_id ?? undefined, createdAt: new Date(e.created_at).toISOString() })),
  });
});

/** Sovg'a sertifikatini faollashtirish — kod bir marta ishlatiladi (atomik) */
meRoutes.post('/gift', async (c) => {
  const user = currentUser(c);
  enforce('gift', user.id, 10, 3600, 'gift.tooMany');
  const { code } = await body(c, giftRedeemSchema);
  const value = tx(() => {
    const now = Date.now();
    const gift = get<{ value: number }>('SELECT value FROM gift_cards WHERE code = ? AND used_at IS NULL AND expires_at > ?', [code, now]);
    if (!gift) throw new ApiError(400, 'gift.invalid');
    const claimed = run('UPDATE gift_cards SET used_at = ?, used_by = ? WHERE code = ? AND used_at IS NULL', [now, user.id, code]);
    if (!claimed) throw new ApiError(400, 'gift.invalid');
    changeBonus(user.id, gift.value, 'gift');
    return gift.value;
  });
  return c.json({ added: value, balance: reloadUser(c)?.bonus ?? user.bonus + value });
});

meRoutes.get('/notifications', (c) => {
  const user = currentUser(c);
  const list = all<{ id: string; type: string; product_id: string | null; order_id: string | null; text: string; read: number; created_at: number }>(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30',
    [user.id],
  );
  const unread = get<{ n: number }>('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read = 0', [user.id])?.n ?? 0;
  return c.json({
    unread,
    notifications: list.map((n) => ({
      id: n.id,
      type: n.type,
      productId: n.product_id ?? undefined,
      orderId: n.order_id ?? undefined,
      text: n.text,
      read: !!n.read,
      createdAt: new Date(n.created_at).toISOString(),
    })),
  });
});

meRoutes.post('/notifications/read', (c) => {
  run('UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0', [currentUser(c).id]);
  return c.json({ ok: true });
});

/** "Kelganda xabar berish" obunalari */
meRoutes.get('/alerts', (c) => {
  const list = all<{ product_id: string }>('SELECT product_id FROM stock_alerts WHERE user_id = ? LIMIT 200', [currentUser(c).id]);
  return c.json({ productIds: list.map((a) => a.product_id) });
});

meRoutes.post('/alerts/:productId', (c) => {
  const user = currentUser(c);
  const productId = param(c, 'productId', RE.productId);
  enforce('alert', user.id, 30, 3600);
  const product = products.byId(productId);
  if (!product) throw notFound();
  if (product.inStock) throw new ApiError(400, 'alert.inStock');
  run('INSERT OR IGNORE INTO stock_alerts (id, product_id, user_id, created_at) VALUES (?, ?, ?, ?)', [`${productId}:${user.id}`, productId, user.id, Date.now()]);
  return c.json({ ok: true });
});

meRoutes.delete('/alerts/:productId', (c) => {
  const user = currentUser(c);
  const productId = param(c, 'productId', RE.productId);
  run('DELETE FROM stock_alerts WHERE id = ?', [`${productId}:${user.id}`]);
  return c.json({ ok: true });
});
