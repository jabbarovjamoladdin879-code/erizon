import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Client, registerUser, startTestServer, stopTestServer } from './helpers.js';

let app: Awaited<ReturnType<typeof startTestServer>>;

beforeAll(async () => {
  app = await startTestServer();
});
afterAll(stopTestServer);

describe('xavfsizlik sarlavhalari va umumiy himoya', () => {
  it('health va qat\'iy sarlavhalar', async () => {
    const c = new Client(app);
    const r = await c.req('GET', '/api/health');
    expect(r.status).toBe(200);
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('x-frame-options')).toBe('DENY');
    expect(r.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect(r.headers.get('cache-control')).toBe('no-store');
  });

  it('Origin bo\'lmasa yoki begona bo\'lsa — 403', async () => {
    const c = await new Client(app, null).init();
    expect((await c.req('POST', '/api/auth/login', { phone: '+998901234567', password: 'x' })).body).toMatchObject({ error: { code: 'err.origin' } });
    const evil = await new Client(app, 'https://evil.example').init();
    expect((await evil.req('POST', '/api/auth/login', { phone: '+998901234567', password: 'x' })).status).toBe(403);
  });

  it('CSRF token bo\'lmasa — 403', async () => {
    const c = await new Client(app).init();
    const r = await c.req('POST', '/api/auth/login', { phone: '+998901234567', password: 'x' }, { csrf: false });
    expect(r.status).toBe(403);
    expect(r.body).toMatchObject({ error: { code: 'err.csrf' } });
  });

  it('JSON bo\'lmagan Content-Type — 415', async () => {
    const c = await new Client(app).init();
    const r = await c.req('POST', '/api/auth/login', undefined, {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      raw: 'phone=1&password=2',
    });
    expect(r.status).toBe(415);
  });

  it('NoSQL injection ($ operatorlari) rad etiladi', async () => {
    const c = await new Client(app).init();
    const r = await c.req('POST', '/api/auth/login', { phone: { $ne: null }, password: { $gt: '' } });
    expect(r.status).toBe(400);
    const r2 = await c.req('POST', '/api/cart/quote', { items: [{ key: 'x', kind: 'product', refId: 'ff-01', qty: 1, $where: '1' }] });
    expect(r2.status).toBe(400);
  });

  it('Noma\'lum maydonlar (masalan, narx) qabul qilinmaydi', async () => {
    const c = await new Client(app).init();
    const r = await c.req('POST', '/api/cart/quote', { items: [{ key: 'x', kind: 'product', refId: 'ff-01', qty: 1, price: 1 }] });
    expect(r.status).toBe(400);
  });

  it('Katta so\'rov tanasi — 413', async () => {
    const c = await new Client(app).init();
    const r = await c.req('POST', '/api/auth/login', { phone: '+998901234567', password: 'x'.repeat(70_000) });
    expect(r.status).toBe(413);
  });

  it('Katalog ommaviy, ichki maydonlarsiz', async () => {
    const c = new Client(app);
    const r = await c.req<{ products: Array<Record<string, unknown>> }>('GET', '/api/catalog');
    expect(r.status).toBe(200);
    expect(r.body.products.length).toBe(127);
    expect(r.body.products[0]).not.toHaveProperty('views');
    expect(r.body.products[0]).not.toHaveProperty('_id');
  });
});

describe('autentifikatsiya', () => {
  it('ro\'yxatdan o\'tish: OTP talab qilinadi, parol xeshi qaytmaydi', async () => {
    const c = await new Client(app).init();
    const bad = await c.req('POST', '/api/auth/register', { name: 'Ali', phone: '+998901110000', email: 'ali@example.com', password: 'parol1234', otp: '000000' });
    expect(bad.status).toBe(400);
    const r = await registerUser(c, '+998901110001', 'Aziza');
    expect(r.status).toBe(201);
    expect(r.body.user.bonus).toBe(5000);
    expect(JSON.stringify(r.body)).not.toMatch(/passwordHash|argon2/);
    const me = await c.req<{ user: { name: string } | null }>('GET', '/api/auth/me');
    expect(me.body.user?.name).toBe('Aziza');
  });

  it('XSS: nomdagi HTML qabul qilinmaydi', async () => {
    const c = await new Client(app).init();
    const otp = await c.req<{ devCode: string }>('POST', '/api/auth/otp', { email: 'xss@example.com', purpose: 'register' });
    const r = await c.req('POST', '/api/auth/register', { name: '<img src=x onerror=alert(1)>', phone: '+998901110009', email: 'xss@example.com', password: 'parol1234', otp: otp.body.devCode });
    expect(r.status).toBe(400);
  });

  it('noto\'g\'ri parol 5 marta — akkaunt vaqtincha bloklanadi', async () => {
    const c = await new Client(app).init();
    await registerUser(c, '+998901110002');
    const other = await new Client(app).init();
    for (let i = 0; i < 5; i++) {
      const r = await other.req('POST', '/api/auth/login', { phone: '+998901110002', password: 'wrongpass1' });
      expect(r.status).toBe(401);
    }
    const locked = await other.req('POST', '/api/auth/login', { phone: '+998901110002', password: 'parol1234' });
    expect(locked.status).toBe(429);
    expect(locked.body).toMatchObject({ error: { code: 'auth.locked' } });
  });

  it('mavjud bo\'lmagan foydalanuvchi va noto\'g\'ri parol — bir xil javob', async () => {
    const c = await new Client(app).init();
    await registerUser(c, '+998901110003');
    const x = await new Client(app).init();
    const a = await x.req('POST', '/api/auth/login', { phone: '+998901119999', password: 'parol1234' });
    const b = await x.req('POST', '/api/auth/login', { phone: '+998901110003', password: 'parol9999' });
    expect(a.status).toBe(b.status);
    expect(a.body).toEqual(b.body);
  });

  it('OTP 5 martadan ko\'p noto\'g\'ri kiritilsa bekor bo\'ladi', async () => {
    const c = await new Client(app).init();
    await c.req('POST', '/api/auth/otp', { email: 'bek@example.com', purpose: 'register' });
    for (let i = 0; i < 5; i++) {
      const r = await c.req('POST', '/api/auth/register', { name: 'Bek', phone: '+998901110004', email: 'bek@example.com', password: 'parol1234', otp: '111111' });
      expect(r.body).toMatchObject({ error: { code: 'otp.invalid' } });
    }
    const r = await c.req('POST', '/api/auth/register', { name: 'Bek', phone: '+998901110004', email: 'bek@example.com', password: 'parol1234', otp: '111111' });
    expect(r.body).toMatchObject({ error: { code: 'otp.tooManyAttempts' } });
  });

  it('OTP qayta so\'rash 60 soniya cheklangan', async () => {
    const c = await new Client(app).init();
    expect((await c.req('POST', '/api/auth/otp', { email: 'cool@example.com', purpose: 'register' })).status).toBe(200);
    const again = await c.req('POST', '/api/auth/otp', { email: 'cool@example.com', purpose: 'register' });
    expect(again.status).toBe(429);
    expect(again.body).toMatchObject({ error: { code: 'otp.cooldown' } });
  });

  it('refresh token rotatsiyasi va o\'g\'irlangan tokenni qayta ishlatishni aniqlash', async () => {
    const c = await new Client(app).init();
    await registerUser(c, '+998901110006');
    const oldRt = c.cookies.get('rt');
    const r1 = await c.req<{ user: unknown }>('POST', '/api/auth/refresh');
    expect(r1.body.user).not.toBeNull();
    expect(c.cookies.get('rt')).not.toBe(oldRt);

    // Hujumchi eski tokenni grace muddatidan keyin ishlatadi
    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + 60_000 });
    try {
      const attacker = await new Client(app).init();
      attacker.cookies.set('rt', oldRt ?? '');
      const stolen = await attacker.req<{ user: unknown }>('POST', '/api/auth/refresh');
      expect(stolen.body.user).toBeNull();
      // Butun sessiya oilasi bekor qilingan — haqiqiy foydalanuvchining yangi tokeni ham ishlamaydi
      const legit = await c.req<{ user: unknown }>('POST', '/api/auth/refresh');
      expect(legit.body.user).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('barcha qurilmalardan chiqish — access token bekor bo\'ladi', async () => {
    const c = await new Client(app).init();
    await registerUser(c, '+998901110007');
    const stolenAt = c.cookies.get('at') ?? '';
    await c.req('POST', '/api/auth/logout-all');
    const thief = new Client(app);
    thief.cookies.set('at', stolenAt);
    const me = await thief.req<{ user: unknown }>('GET', '/api/auth/me');
    expect(me.body.user).toBeNull();
  });

  it('himoyalangan marshrutlar — mehmon uchun 401, mijoz uchun admin 403', async () => {
    const guest = await new Client(app).init();
    expect((await guest.req('GET', '/api/me/bonus')).status).toBe(401);
    expect((await guest.req('GET', '/api/admin/stats')).status).toBe(401);
    const c = await new Client(app).init();
    await registerUser(c, '+998901110008');
    expect((await c.req('GET', '/api/admin/stats')).status).toBe(403);
  });
});
