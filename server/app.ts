import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { cleanupExpired, flush, get } from './db.js';
import { getEnv } from './env.js';
import { bootstrap } from './seed.js';
import { ApiError } from './lib/errors.js';
import { authContext } from './middleware/auth.js';
import { csrfProtection, requestContext, securityHeaders } from './middleware/security.js';
import { adminRoutes } from './routes/admin.js';
import { authRoutes } from './routes/auth.js';
import { catalogRoutes } from './routes/catalog.js';
import { meRoutes } from './routes/me.js';
import { orderRoutes } from './routes/orders.js';
import { paymentRoutes } from './routes/payments.js';
import { publicRoutes } from './routes/public.js';
import type { AppEnv } from './types.js';

export const app = new Hono<AppEnv>();

// Baza (SQLite) tayyorligi va har so'rovdan keyin o'zgarishlarni diskka atomik yozish
app.use('*', async (_c, next) => {
  await bootstrap();
  cleanupExpired();
  try {
    await next();
  } finally {
    try {
      flush();
    } catch (err) {
      console.error('[db] flush failed', err instanceof Error ? err.message : err);
    }
  }
});
app.use('*', requestContext);
app.use('*', securityHeaders);
// So'rov tanasi hajmi cheklovi (rasm yuklash o'z cheklovi bilan)
app.use('/api/*', async (c, next) => {
  if (c.req.path === '/api/admin/images') return next();
  return bodyLimit({ maxSize: 64 * 1024, onError: () => { throw new ApiError(413, 'err.tooLarge'); } })(c, next);
});
app.use('/api/*', csrfProtection);
app.use('/api/*', authContext);

app.get('/api/health', (c) => {
  try {
    const n = get<{ n: number }>('SELECT COUNT(*) AS n FROM products')?.n ?? 0;
    return c.json({ ok: true, db: 'sqlite', products: n, persistent: !getEnv().onVercel });
  } catch {
    return c.json({ ok: false, db: 'down' }, 503);
  }
});

app.route('/api/auth', authRoutes);
app.route('/api/me', meRoutes);
app.route('/api/orders', orderRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/payments', paymentRoutes);
app.route('/api', catalogRoutes);
app.route('/', publicRoutes);

app.notFound((c) => c.json({ error: { code: 'err.notFound' } }, 404));

app.onError((err, c) => {
  if (err instanceof ApiError) {
    if (err.status === 429 && typeof err.extra?.retryAfter === 'number') c.header('Retry-After', String(err.extra.retryAfter));
    return c.json({ error: { code: err.code, ...err.extra } }, err.status);
  }
  if (err instanceof HTTPException) {
    return c.json({ error: { code: err.status === 413 ? 'err.tooLarge' : 'err.validation' } }, err.status);
  }
  // Ichki xato: foydalanuvchiga tafsilot berilmaydi, faqat so'rov ID si
  console.error(`[api] ${c.get('requestId')} ${c.req.method} ${c.req.path}`, err instanceof Error ? err.stack : err);
  return c.json({ error: { code: 'err.server', requestId: c.get('requestId') } }, 500);
});
