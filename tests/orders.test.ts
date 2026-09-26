import { randomUUID } from 'node:crypto';
import * as OTPAuth from 'otpauth';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cartItem, Client, registerUser, startTestServer, stopTestServer } from './helpers.js';

let app: Awaited<ReturnType<typeof startTestServer>>;

beforeAll(async () => {
  app = await startTestServer();
});
afterAll(stopTestServer);

interface OrderRes {
  order: { id: string; total: number; subtotal: number; discount: number; bonusUsed: number; status: string; paymentStatus: string; lines: unknown[] };
  trackToken: string;
  paymentUrl?: string;
}

const baseOrder = {
  customerName: 'Jasur Aliyev',
  phone: '+998901234567',
  deliveryMethod: 'delivery',
  zoneId: 'navbahor',
  address: "Navoiy ko'chasi, 12-uy",
  deliveryTime: 'asap',
  paymentMethod: 'cash',
};

async function adminClient() {
  const c = await new Client(app).init();
  const r = await c.req('POST', '/api/auth/login', { phone: '+998900000001', password: 'Admin12345' });
  expect(r.status).toBe(200);
  return c;
}

describe('narx hisobi serverda', () => {
  it('quote faqat bazadagi narxlardan hisoblanadi', async () => {
    const c = await new Client(app).init();
    const r = await c.req<{ quote: { subtotal: number; total: number; lines: Array<{ unitPrice: number }> } }>('POST', '/api/cart/quote', {
      items: [cartItem('ff-01', 2, 'product', { fastfood: { sauce: 'garlic', extraCheese: true, spicy: false, extras: ['egg'] } }), cartItem('me-01', 1.5)],
    });
    expect(r.status).toBe(200);
    // Burger: 32000 + sarimsoqli 2000 + pishloq 5000 + tuxum 3000 = 42000 × 2; go'sht 98000 × 1.5
    expect(r.body.quote.lines[0].unitPrice).toBe(42_000);
    expect(r.body.quote.subtotal).toBe(84_000 + 147_000);
  });

  it('noma\'lum sous yoki qo\'shimcha narxga ta\'sir qilmaydi', async () => {
    const c = await new Client(app).init();
    const r = await c.req<{ quote: { lines: Array<{ unitPrice: number }> } }>('POST', '/api/cart/quote', {
      items: [cartItem('ff-01', 1, 'product', { fastfood: { sauce: 'free', extraCheese: false, spicy: false, extras: ['gold'] } })],
    });
    expect(r.body.quote.lines[0].unitPrice).toBe(32_000);
  });

  it('promokodlar: noto\'g\'ri, muddati o\'tgan, faol emas, to\'g\'ri', async () => {
    const c = await new Client(app).init();
    const q = (promoCode: string) =>
      c.req<{ quote: { discount: number; promo: { ok: boolean; error?: string } } }>('POST', '/api/cart/quote', { items: [cartItem('me-03', 2)], promoCode });
    expect((await q('NOTREAL')).body.quote.promo).toMatchObject({ ok: false, error: 'promo.notFound' });
    expect((await q('YOZ2025')).body.quote.promo).toMatchObject({ ok: false, error: 'promo.expired' });
    expect((await q('TEST50')).body.quote.promo).toMatchObject({ ok: false, error: 'promo.inactive' });
    const ok = await q('ERIZON10');
    expect(ok.body.quote.promo.ok).toBe(true);
    expect(ok.body.quote.discount).toBe(22_400);
  });
});

describe('buyurtma berish', () => {
  it('mehmon buyurtmasi, track token bilan kuzatish, idempotentlik', async () => {
    const c = await new Client(app).init();
    const key = randomUUID();
    const body = { ...baseOrder, items: [cartItem('ff-03', 2)] };
    const r1 = await c.req<OrderRes>('POST', '/api/orders', body, { headers: { 'idempotency-key': key } });
    expect(r1.status).toBe(201);
    // ff-03 kun aksiyasida: 38 000 × 2 + Navbahor yetkazish 10 000
    expect(r1.body.order.total).toBe(86_000);
    expect(r1.body.order.status).toBe('accepted');

    const r2 = await c.req<OrderRes>('POST', '/api/orders', body, { headers: { 'idempotency-key': key } });
    expect(r2.body.order.id).toBe(r1.body.order.id);

    const stranger = new Client(app);
    expect((await stranger.req('GET', `/api/orders/${r1.body.order.id}`)).status).toBe(404);
    expect((await stranger.req('GET', `/api/orders/${r1.body.order.id}?t=wrong-token-xxxxxxx`)).status).toBe(404);
    const tracked = await stranger.req<{ order: { id: string } }>('GET', `/api/orders/${r1.body.order.id}?t=${r1.body.trackToken}`);
    expect(tracked.status).toBe(200);
    expect(JSON.stringify(tracked.body)).not.toMatch(/trackTokenHash/);
  });

  it('Idempotency-Key bo\'lmasa — rad etiladi', async () => {
    const c = await new Client(app).init();
    const r = await c.req('POST', '/api/orders', { ...baseOrder, items: [cartItem('ff-01')] });
    expect(r.body).toMatchObject({ error: { code: 'err.idempotency' } });
  });

  it('sozlanmagan to\'lov usuli (Payme) rad etiladi', async () => {
    const c = await new Client(app).init();
    const r = await c.req('POST', '/api/orders', { ...baseOrder, paymentMethod: 'payme', items: [cartItem('ff-01')] }, { headers: { 'idempotency-key': randomUUID() } });
    expect(r.body).toMatchObject({ error: { code: 'pay.unavailable' } });
  });

  it('"faqat birinchi xarid" promokodi ikkinchi marta ishlamaydi', async () => {
    const c = await new Client(app).init();
    const order = { ...baseOrder, phone: '+998935550000', promoCode: 'YANGI15', items: [cartItem('me-03', 1)] };
    const r1 = await c.req<OrderRes>('POST', '/api/orders', order, { headers: { 'idempotency-key': randomUUID() } });
    expect(r1.status).toBe(201);
    expect(r1.body.order.discount).toBeGreaterThan(0);
    const r2 = await c.req('POST', '/api/orders', order, { headers: { 'idempotency-key': randomUUID() } });
    expect(r2.body).toMatchObject({ error: { code: 'promo.firstOnly' } });
  });

  it('bonus: 30% dan oshmaydi, parallel so\'rovlarda ikki marta sarflanmaydi', async () => {
    const c = await new Client(app).init();
    await registerUser(c, '+998935550001'); // 5 000 bonus
    const body = { ...baseOrder, phone: '+998935550001', useBonus: true, items: [cartItem('ff-01', 1)] };
    const [a, b] = await Promise.all([
      c.req<OrderRes>('POST', '/api/orders', body, { headers: { 'idempotency-key': randomUUID() } }),
      c.req<OrderRes>('POST', '/api/orders', body, { headers: { 'idempotency-key': randomUUID() } }),
    ]);
    const used = [a, b].filter((r) => r.status === 201).reduce((s, r) => s + r.body.order.bonusUsed, 0);
    expect(used).toBeLessThanOrEqual(5_000);
    const bonus = await c.req<{ balance: number }>('GET', '/api/me/bonus');
    expect(bonus.body.balance).toBe(5_000 - used);
    expect(bonus.body.balance).toBeGreaterThanOrEqual(0);
  });
});

describe('admin', () => {
  it('holat o\'zgarishi: yetkazilganda bonus bir marta beriladi, taklif qilgan do\'stga ham', async () => {
    const referrer = await new Client(app).init();
    const ref = await registerUser(referrer, '+998935550010');
    const buyer = await new Client(app).init();
    const reg = await registerUser(buyer, '+998935550011', 'Buyer', 'parol1234', ref.body.user.referralCode);
    expect(reg.body.user.bonus).toBe(15_000); // 5 000 + 10 000 taklif bonusi
    const o = await buyer.req<OrderRes>('POST', '/api/orders', { ...baseOrder, phone: '+998935550011', items: [cartItem('me-03', 2)] }, {
      headers: { 'idempotency-key': randomUUID() },
    });
    const admin = await adminClient();
    for (const status of ['preparing', 'on_the_way', 'delivered']) {
      const r = await admin.req('PATCH', `/api/admin/orders/${o.body.order.id}/status`, { status });
      expect(r.status).toBe(200);
    }
    // Yakunlangan buyurtmani qayta o'zgartirib bo'lmaydi
    expect((await admin.req('PATCH', `/api/admin/orders/${o.body.order.id}/status`, { status: 'cancelled' })).status).toBe(400);
    const bonus = await buyer.req<{ balance: number }>('GET', '/api/me/bonus');
    expect(bonus.body.balance).toBe(15_000 + Math.floor(((224_000 + 10_000 - 10_000) * 3) / 100));
    const refBonus = await referrer.req<{ balance: number }>('GET', '/api/me/bonus');
    expect(refBonus.body.balance).toBe(15_000);
    const notes = await buyer.req<{ unread: number }>('GET', '/api/me/notifications');
    expect(notes.body.unread).toBe(3);
  });

  it('"kelganda xabar berish": mahsulot qaytganda bildirishnoma', async () => {
    const c = await new Client(app).init();
    await registerUser(c, '+998935550020');
    expect((await c.req('POST', '/api/me/alerts/me-11')).status).toBe(200);
    const admin = await adminClient();
    await admin.req('POST', '/api/admin/products/me-11/toggle-stock');
    const notes = await c.req<{ notifications: Array<{ type: string; productId: string }> }>('GET', '/api/me/notifications');
    expect(notes.body.notifications[0]).toMatchObject({ type: 'back_in_stock', productId: 'me-11' });
  });

  it('sovg\'a sertifikati bir marta ishlatiladi', async () => {
    const admin = await adminClient();
    const g = await admin.req<{ codes: string[] }>('POST', '/api/admin/gifts', { value: 25_000, count: 1, days: 30 });
    const c = await new Client(app).init();
    await registerUser(c, '+998935550030');
    const r1 = await c.req<{ added: number }>('POST', '/api/me/gift', { code: g.body.codes[0] });
    expect(r1.body.added).toBe(25_000);
    const r2 = await c.req('POST', '/api/me/gift', { code: g.body.codes[0] });
    expect(r2.body).toMatchObject({ error: { code: 'gift.invalid' } });
  });

  it('sharhlar: login talab qilinadi, HTML tozalanadi, takror sharh taqiqlangan', async () => {
    const guest = await new Client(app).init();
    expect((await guest.req('POST', '/api/products/ff-01/reviews', { rating: 5, text: 'Juda mazali burger ekan!' })).status).toBe(401);
    const c = await new Client(app).init();
    await registerUser(c, '+998935550040');
    const r = await c.req<{ review: { text: string } }>('POST', '/api/products/ff-01/reviews', { rating: 4, text: 'Zo\'r <b>burger</b> <script>alert(1)</script> edi' });
    expect(r.status).toBe(201);
    // HTML teglari serverda olib tashlanadi — bazada faqat oddiy matn
    expect(r.body.review.text).not.toMatch(/[<>]|script/);
    expect((await c.req('POST', '/api/products/ff-01/reviews', { rating: 5, text: 'Yana bir marta yozaman' })).status).toBe(409);
    const list = await guest.req<{ reviews: Array<{ text: string }> }>('GET', '/api/products/ff-01/reviews');
    expect(list.body.reviews.some((x) => x.text.includes('<'))).toBe(false);
  });

  it('rasm yuklash: faqat haqiqiy rasm, qat\'iy sarlavhalar bilan', async () => {
    const admin = await adminClient();
    const fake = await admin.req('POST', '/api/admin/images', undefined, { raw: '<svg onload=alert(1)>', headers: { 'content-type': 'image/png' } });
    expect(fake.status).toBe(415);
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da6364f8ff1f0003030200efa4be950000000049454e44ae426082', 'hex');
    const up = await admin.req<{ url: string }>('POST', '/api/admin/images', undefined, { raw: png, headers: { 'content-type': 'image/png' } });
    expect(up.status).toBe(201);
    const img = await new Client(app).req('GET', up.body.url);
    expect(img.headers.get('content-type')).toBe('image/png');
    expect(img.headers.get('content-security-policy')).toContain('sandbox');
  });

  it('2FA: yoqilgandan keyin kirish ikkinchi bosqichni talab qiladi', async () => {
    const admin = await adminClient();
    const setup = await admin.req<{ secret: string }>('POST', '/api/admin/2fa/setup');
    const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(setup.body.secret), digits: 6, period: 30, algorithm: 'SHA1' });
    expect((await admin.req('POST', '/api/admin/2fa/enable', { code: totp.generate() })).status).toBe(200);
    expect((await admin.req('GET', '/api/admin/stats')).status).toBe(200);

    const fresh = await new Client(app).init();
    const step1 = await fresh.req<{ mfaRequired: boolean; mfaToken: string }>('POST', '/api/auth/login', { phone: '+998900000001', password: 'Admin12345' });
    expect(step1.body.mfaRequired).toBe(true);
    expect((await fresh.req('GET', '/api/admin/stats')).status).toBe(401);
    expect((await fresh.req('POST', '/api/auth/login/totp', { mfaToken: step1.body.mfaToken, code: '000000' })).status).toBe(401);
    // Bir kodni qayta ishlatib bo'lmaydi (replay) — keyingi 30 soniyalik oyna kodi
    const next = totp.generate({ timestamp: Date.now() + 30_000 });
    const step2 = await fresh.req('POST', '/api/auth/login/totp', { mfaToken: step1.body.mfaToken, code: next });
    expect(step2.status).toBe(200);
    expect((await fresh.req('GET', '/api/admin/stats')).status).toBe(200);
  });
});
