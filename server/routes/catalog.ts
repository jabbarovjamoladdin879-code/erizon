import { Hono } from 'hono';
import { eventSchema, quoteRequestSchema, reviewRequestSchema } from '../../shared/validation.js';
import { all, get, isUniqueError, newId, run, tx } from '../db.js';
import { getEnv } from '../env.js';
import { ApiError, conflict, notFound } from '../lib/errors.js';
import { body, param, RE } from '../lib/http.js';
import { enforce, hit } from '../lib/rateLimit.js';
import { cleanText } from '../lib/sanitize.js';
import { currentUser, loadUser, requireUser } from '../middleware/auth.js';
import { products } from '../models.js';
import { buildQuote, getActiveDeal } from '../services/checkout.js';
import { toProduct, toReview, type ReviewRow } from '../services/serialize.js';
import type { AppEnv } from '../types.js';

export const catalogRoutes = new Hono<AppEnv>();

/** Ommaviy katalog — CDN'da qisqa muddat keshlanadi */
catalogRoutes.get('/catalog', (c) => {
  c.header('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=120');
  return c.json({ products: products.all().map((p) => toProduct(p)), deal: getActiveDeal(), serverTime: new Date().toISOString() });
});

catalogRoutes.get('/config', (c) => {
  const env = getEnv();
  c.header('Cache-Control', 'public, max-age=60');
  return c.json({ payments: { cash: true, click: env.click, payme: env.payme }, demoOtp: env.demoOtp });
});

catalogRoutes.get('/products/:id/reviews', (c) => {
  const productId = param(c, 'id', RE.productId);
  const order = c.req.query('sort') === 'helpful' ? 'helpful DESC, created_at DESC' : 'created_at DESC';
  const list = all<ReviewRow>(`SELECT * FROM reviews WHERE product_id = ? ORDER BY ${order} LIMIT 50`, [productId]);
  const user = loadUser(c);
  let voted = new Set<string>();
  if (user && list.length) {
    const ids = list.map((r) => `${r.id}:${user.id}`);
    voted = new Set(all<{ id: string }>(`SELECT id FROM review_votes WHERE id IN (${ids.map(() => '?').join(',')})`, ids).map((v) => v.id.split(':')[0]));
  }
  return c.json({ reviews: list.map((r) => toReview(r, user?.id, voted.has(r.id))) });
});

catalogRoutes.post('/products/:id/reviews', requireUser, async (c) => {
  const productId = param(c, 'id', RE.productId);
  const user = currentUser(c);
  enforce('review', user.id, 5, 3600);
  const input = await body(c, reviewRequestSchema);
  const text = cleanText(input.text, 500, true);
  if (text.length < 10) throw new ApiError(400, 'v.reviewMin');
  const row: ReviewRow = {
    id: newId(),
    product_id: productId,
    user_id: user.id,
    author: cleanText(user.name, 50),
    rating: input.rating,
    text,
    helpful: 0,
    created_at: Date.now(),
  };
  try {
    tx(() => {
      const product = products.byId(productId);
      if (!product) throw notFound();
      run('INSERT INTO reviews (id, product_id, user_id, author, rating, text, helpful, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)', [
        row.id,
        row.product_id,
        row.user_id,
        row.author,
        row.rating,
        row.text,
        row.created_at,
      ]);
      // O'rtacha reytingni yangilash (tranzaksiya ichida — atomik)
      const count = product.reviewsCount + 1;
      product.rating = Math.round(((product.rating * product.reviewsCount + input.rating) / count) * 100) / 100;
      product.reviewsCount = count;
      products.save(product);
    });
  } catch (err) {
    if (isUniqueError(err)) throw conflict('review.exists');
    throw err;
  }
  return c.json({ review: toReview(row, user.id, false) }, 201);
});

catalogRoutes.post('/reviews/:id/helpful', requireUser, (c) => {
  const id = param(c, 'id', RE.objectId);
  const user = currentUser(c);
  enforce('vote', user.id, 60, 3600);
  const review = get<ReviewRow>('SELECT * FROM reviews WHERE id = ?', [id]);
  if (!review) throw notFound();
  if (review.user_id === user.id) throw new ApiError(400, 'review.ownVote');
  const voteId = `${id}:${user.id}`;
  const voted = tx(() => {
    const removed = run('DELETE FROM review_votes WHERE id = ?', [voteId]);
    if (removed) {
      run('UPDATE reviews SET helpful = MAX(0, helpful - 1) WHERE id = ?', [id]);
      return false;
    }
    run('INSERT INTO review_votes (id, created_at) VALUES (?, ?)', [voteId, Date.now()]);
    run('UPDATE reviews SET helpful = helpful + 1 WHERE id = ?', [id]);
    return true;
  });
  const fresh = get<{ helpful: number }>('SELECT helpful FROM reviews WHERE id = ?', [id]);
  return c.json({ helpful: fresh?.helpful ?? 0, voted });
});

/** Savat summasini server hisoblaydi (promokod, bonus, yetkazish) */
catalogRoutes.post('/cart/quote', async (c) => {
  enforce('quote', c.get('ipHash'), 120, 600);
  const input = await body(c, quoteRequestSchema);
  const user = loadUser(c);
  if (input.promoCode) enforce('promo-check', user?.id ?? c.get('ipHash'), 20, 600, 'promo.locked');
  const { quote } = buildQuote({ ...input, promoCode: input.promoCode || undefined }, user);
  return c.json({ quote });
});

/** Mahsulot ko'rishlar statistikasi (bir IP dan bitta mahsulotga 10 daqiqada 1 marta hisoblanadi) */
catalogRoutes.post('/events', async (c) => {
  const input = await body(c, eventSchema);
  const r = hit('view', `${c.get('ipHash')}:${input.productId}`, 1, 600);
  if (r.ok) run('UPDATE products SET views = views + 1 WHERE id = ?', [input.productId]);
  return c.json({ ok: true });
});
