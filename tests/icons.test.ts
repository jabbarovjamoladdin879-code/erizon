import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ICON_NAMES } from '../shared/icons.js';
import { Client, startTestServer, stopTestServer } from './helpers.js';

let app: Awaited<ReturnType<typeof startTestServer>>;

beforeAll(async () => {
  app = await startTestServer();
});
afterAll(stopTestServer);

const EMOJI = /\p{Extended_Pictographic}/u;

async function adminClient() {
  const c = await new Client(app).init();
  const r = await c.req('POST', '/api/auth/login', { phone: '+998900000001', password: 'Admin12345' });
  expect(r.status).toBe(200);
  return c;
}

const productInput = {
  name: 'Sinov mahsuloti',
  categoryId: 'grocery',
  price: 10_000,
  unit: 'pcs',
  inStock: true,
  description: 'Ikonka tekshiruvi uchun mahsulot tavsifi',
};

describe('ikonkalar (emoji o\'rniga)', () => {
  it('katalogda emoji yo\'q, har bir mahsulotda ruxsat etilgan ikonka bor', async () => {
    const c = new Client(app);
    const r = await c.req<{ products: Array<{ icon: string }> }>('GET', '/api/catalog');
    expect(r.status).toBe(200);
    expect(EMOJI.test(JSON.stringify(r.body))).toBe(false);
    for (const p of r.body.products) expect(ICON_NAMES).toContain(p.icon);
  });

  it('admin faqat ro\'yxatdagi ikonkani saqlay oladi', async () => {
    const c = await adminClient();
    const ok = await c.req<{ product: { icon: string } }>('POST', '/api/admin/products', { ...productInput, icon: 'Beef' });
    expect(ok.status).toBe(201);
    expect(ok.body.product.icon).toBe('Beef');
    const bad = await c.req('POST', '/api/admin/products', { ...productInput, icon: '<img src=x>' });
    expect(bad.status).toBe(400);
    const legacy = await c.req('POST', '/api/admin/products', { ...productInput, emoji: 'x' });
    expect(legacy.status).toBe(400);
  });

  it('eski bazadagi emoji maydoni avtomatik ikonkaga ko\'chiriladi', async () => {
    const { run, get } = await import('../server/db.js');
    const { bootstrap, resetBootstrap } = await import('../server/seed.js');
    const { products } = await import('../server/models.js');
    // Eski yozuv: data JSON'da "emoji" bor, "icon" yo'q
    const row = get<{ data: string }>('SELECT data FROM products WHERE id = ?', ['me-01']);
    const data = JSON.parse(row!.data) as Record<string, unknown>;
    delete data.icon;
    data.emoji = 'x';
    run('UPDATE products SET data = ? WHERE id = ?', [JSON.stringify(data), 'me-01']);
    run("DELETE FROM settings WHERE key = 'iconMigration1'");
    resetBootstrap();
    await bootstrap();
    const migrated = products.byId('me-01') as unknown as Record<string, unknown>;
    expect(migrated.icon).toBe('Beef');
    expect('emoji' in migrated).toBe(false);
  });
});
