import { randomBytes } from 'node:crypto';
import { argon2id } from 'hash-wasm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Client, startTestServer, stopTestServer } from './helpers.js';

// Haqiqiy admin paroli repoda yo'q — test o'z parolining xeshi bilan konfiguratsiyani almashtiradi
const TEST_PASSWORD = 'ConfigParol2026';
vi.mock('../server/admin.config.js', async () => ({
  ADMIN_PHONE: '+998900000001',
  ADMIN_PASSWORD_HASH: await argon2id({
    password: 'ConfigParol2026',
    salt: randomBytes(16),
    parallelism: 1,
    iterations: 2,
    memorySize: 19_456,
    hashLength: 32,
    outputType: 'encoded',
  }),
}));

let app: Awaited<ReturnType<typeof startTestServer>>;

beforeAll(async () => {
  // ADMIN_PASSWORD env'i yo'q — parol faqat server/admin.config.ts dagi xeshdan olinadi (PASSWORD_PEPPER bo'lsa ham)
  app = await startTestServer({ ADMIN_PASSWORD: '', PASSWORD_PEPPER: 'test-pepper-0123456789abcdef' });
  // Admin'ga email biriktirilgan bo'lsa ham email kod orqali kirib/tiklab bo'lmasligi tekshiriladi
  const { run } = await import('../server/db.js');
  run("UPDATE users SET email = 'admin@example.com' WHERE role = 'admin'");
});
afterAll(stopTestServer);

describe('yagona admin akkaunti', () => {
  it('env\'siz — konfiguratsiyadagi xesh bilan kiriladi', async () => {
    const c = await new Client(app).init();
    const bad = await c.req('POST', '/api/auth/login', { phone: '+998900000001', password: 'Admin12345' });
    expect(bad.status).toBe(401);
    const ok = await c.req<{ user: { role: string } }>('POST', '/api/auth/login', { phone: '+998900000001', password: TEST_PASSWORD });
    expect(ok.status).toBe(200);
    expect(ok.body.user.role).toBe('admin');
  });

  it('admin email kod bilan kira olmaydi (demo kod berilmaydi)', async () => {
    const c = await new Client(app).init();
    const otp = await c.req<{ ok: boolean; devCode?: string }>('POST', '/api/auth/otp', { email: 'admin@example.com', purpose: 'login' });
    expect(otp.status).toBe(200);
    expect(otp.body.devCode).toBeUndefined();
    const r = await c.req('POST', '/api/auth/login/otp', { email: 'admin@example.com', otp: '123456' });
    expect(r.status).toBeGreaterThanOrEqual(400);
  });

  it('admin parolini email kod orqali tiklab bo\'lmaydi (demo kod ham berilmaydi)', async () => {
    const c = await new Client(app).init();
    const otp = await c.req<{ ok: boolean; devCode?: string }>('POST', '/api/auth/otp', { email: 'admin@example.com', purpose: 'reset' });
    expect(otp.status).toBe(200);
    expect(otp.body.devCode).toBeUndefined();
    const reset = await c.req('POST', '/api/auth/reset', { email: 'admin@example.com', otp: '123456', password: 'Buzgunchi123' });
    expect(reset.status).toBeGreaterThanOrEqual(400);
    const still = await c.req('POST', '/api/auth/login', { phone: '+998900000001', password: TEST_PASSWORD });
    expect(still.status).toBe(200);
  });
});
