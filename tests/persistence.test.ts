import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { Client, registerUser } from './helpers.js';

const dir = mkdtempSync(join(tmpdir(), 'erizon-persist-'));
const dbPath = join(dir, 'erizon.sqlite');

/** Env'siz ishga tushirish: faqat DB yo'li (odatda u ham kerak emas — standart data/erizon.sqlite) */
async function boot() {
  for (const k of ['JWT_SECRET', 'DATA_SECRET', 'ADMIN_PHONE', 'ADMIN_PASSWORD', 'APP_ORIGIN', 'NODE_ENV']) delete process.env[k];
  process.env.DATABASE_PATH = dbPath;
  const { resetEnvCache } = await import('../server/env.js');
  resetEnvCache();
  const { bootstrap } = await import('../server/seed.js');
  await bootstrap();
  const { app } = await import('../server/app.js');
  return app;
}

async function shutdown() {
  const { closeDb } = await import('../server/db.js');
  const { resetBootstrap } = await import('../server/seed.js');
  closeDb();
  resetBootstrap();
}

afterAll(async () => {
  await shutdown();
  rmSync(dir, { recursive: true, force: true });
});

describe('SQLite: env\'siz ishlash va doimiy saqlash', () => {
  it('env\'siz ishga tushadi, baza fayli yaratiladi va to\'ldiriladi', async () => {
    const app = await boot();
    const r = await new Client(app, 'http://localhost').req<{ ok: boolean; products: number }>('GET', '/api/health');
    expect(r.body).toMatchObject({ ok: true, products: 127 });
    expect(existsSync(dbPath)).toBe(true);
    expect(statSync(dbPath).size).toBeGreaterThan(50_000);
  });

  it('same-origin so\'rovlar APP_ORIGIN\'siz ham qabul qilinadi, begona domen — rad etiladi', async () => {
    const app = await boot();
    const own = await new Client(app, 'http://localhost').init();
    expect((await own.req('POST', '/api/cart/quote', { items: [{ key: 'k', kind: 'product', refId: 'ff-01', qty: 1 }] })).status).toBe(200);
    const evil = await new Client(app, 'https://evil.example').init();
    expect((await evil.req('POST', '/api/cart/quote', { items: [{ key: 'k', kind: 'product', refId: 'ff-01', qty: 1 }] })).status).toBe(403);
  });

  it('server qayta ishga tushgandan keyin foydalanuvchi, buyurtma va sessiya saqlanadi', async () => {
    let app = await boot();
    const c = await new Client(app, 'http://localhost').init();
    await registerUser(c, '+998971234567', 'Saqlanuvchi');
    const order = await c.req<{ order: { id: string } }>(
      'POST',
      '/api/orders',
      { customerName: 'Saqlanuvchi', phone: '+998971234567', deliveryMethod: 'pickup', deliveryTime: 'asap', paymentMethod: 'cash', items: [{ key: 'k', kind: 'product', refId: 'ff-01', qty: 2 }] },
      { headers: { 'idempotency-key': 'persist-test-key-000001' } },
    );
    expect(order.status).toBe(201);

    // "Server o'chdi" — keyin qayta ishga tushadi (xotira tozalanadi, faqat fayl qoladi)
    await shutdown();
    app = await boot();
    const again = new Client(app, 'http://localhost');
    again.cookies = c.cookies;
    const me = await again.req<{ user: { name: string; bonus: number } | null }>('GET', '/api/auth/me');
    // Kalitlar bazada saqlangani uchun eski sessiya tokeni ham amal qiladi
    expect(me.body.user?.name).toBe('Saqlanuvchi');
    const mine = await again.req<{ orders: Array<{ id: string }> }>('GET', '/api/orders/mine');
    expect(mine.body.orders.map((o) => o.id)).toContain(order.body.order.id);
  });
});
