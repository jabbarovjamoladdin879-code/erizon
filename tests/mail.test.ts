import type { AddressInfo } from 'node:net';
import { SMTPServer } from 'smtp-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, startTestServer, stopTestServer } from './helpers.js';

/**
 * Gmail o'rniga lokal SMTP server: nodemailer → SMTP (AUTH bilan) → xat qabul qilinadi.
 * Kod xatdan o'qiladi — to'liq real oqim (ro'yxatdan o'tish, kirish, parolni tiklash).
 */
interface Received {
  to: string[];
  raw: string;
}
const inbox: Received[] = [];
const SMTP_USER = 'erizon.shop@gmail.com';
const SMTP_PASS = 'abcdefghijklmnop';
let authOk = true;

const smtp = new SMTPServer({
  secure: false,
  disabledCommands: ['STARTTLS'],
  allowInsecureAuth: true,
  authMethods: ['PLAIN', 'LOGIN'],
  onAuth(auth, _session, cb) {
    if (authOk && auth.username === SMTP_USER && auth.password === SMTP_PASS) cb(null, { user: auth.username });
    else cb(new Error('Invalid login: 535 Username and Password not accepted'));
  },
  onData(stream, session, cb) {
    let raw = '';
    stream.on('data', (chunk: Buffer) => (raw += chunk.toString('utf8')));
    stream.on('end', () => {
      inbox.push({ to: session.envelope.rcptTo.map((r) => r.address), raw });
      cb();
    });
  },
});

let app: Awaited<ReturnType<typeof startTestServer>>;

/** Oxirgi xatdan 6 xonali kodni oladi (matn qismida: "tasdiqlash kodi: 123456") */
function lastCode(to: string): string {
  const mail = [...inbox].reverse().find((m) => m.to.includes(to));
  if (!mail) throw new Error(`${to} ga xat kelmadi`);
  const code = /tasdiqlash kodi: (\d{6})/.exec(mail.raw)?.[1];
  if (!code) throw new Error('Xatda kod topilmadi');
  return code;
}

beforeAll(async () => {
  await new Promise<void>((resolve) => smtp.listen(0, '127.0.0.1', resolve));
  const { port } = smtp.server.address() as AddressInfo;
  app = await startTestServer({
    GMAIL_USER: SMTP_USER,
    // Google App password bo'shliqlar bilan ko'rsatiladi — server ularni olib tashlashi kerak
    GMAIL_APP_PASSWORD: 'abcd efgh ijkl mnop',
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: String(port),
    SMTP_SECURE: 'false',
  });
});
afterAll(async () => {
  await stopTestServer();
  await new Promise<void>((resolve) => smtp.close(() => resolve()));
});

describe('Gmail (SMTP) orqali tasdiqlash kodi', () => {
  it('ro\'yxatdan o\'tish: kod emailga keladi, javobda ko\'rsatilmaydi', async () => {
    const c = await new Client(app).init();
    const otp = await c.req<{ ok: boolean; devCode?: string }>('POST', '/api/auth/otp', { email: 'Madina@Example.com', purpose: 'register' });
    expect(otp.status).toBe(200);
    expect(otp.body.devCode).toBeUndefined();
    const mail = inbox.at(-1);
    expect(mail?.to).toEqual(['madina@example.com']);
    expect(mail?.raw).toContain(`From: Erizon Mall <${SMTP_USER}>`);
    const r = await c.req<{ user: { email: string } }>('POST', '/api/auth/register', {
      name: 'Madina',
      phone: '+998901230001',
      email: 'madina@example.com',
      password: 'parol1234',
      otp: lastCode('madina@example.com'),
    });
    expect(r.status).toBe(201);
    expect(r.body.user.email).toBe('madina@example.com');
  });

  it('email kod bilan kirish', async () => {
    const c = await new Client(app).init();
    await c.req('POST', '/api/auth/otp', { email: 'madina@example.com', purpose: 'login' });
    const r = await c.req<{ user: { name: string } }>('POST', '/api/auth/login/otp', { email: 'madina@example.com', otp: lastCode('madina@example.com') });
    expect(r.status).toBe(200);
    expect(r.body.user.name).toBe('Madina');
  });

  it('parolni email kod bilan tiklash, keyin yangi parol bilan kirish', async () => {
    const c = await new Client(app).init();
    await c.req('POST', '/api/auth/otp', { email: 'madina@example.com', purpose: 'reset' });
    const reset = await c.req('POST', '/api/auth/reset', { email: 'madina@example.com', otp: lastCode('madina@example.com'), password: 'yangiParol77' });
    expect(reset.status).toBe(200);
    const login = await c.req('POST', '/api/auth/login', { phone: '+998901230001', password: 'yangiParol77' });
    expect(login.status).toBe(200);
  });

  it('noma\'lum emailga kirish/tiklash xati yuborilmaydi (javob bir xil)', async () => {
    const c = await new Client(app).init();
    const before = inbox.length;
    const login = await c.req('POST', '/api/auth/otp', { email: 'nobody@example.com', purpose: 'login' });
    const reset = await c.req('POST', '/api/auth/otp', { email: 'nobody@example.com', purpose: 'reset' });
    expect(login.status).toBe(200);
    expect(reset.status).toBe(200);
    expect(login.body).toEqual(reset.body);
    expect(inbox.length).toBe(before);
  });

  it('band email bilan ikkinchi hisob ochib bo\'lmaydi', async () => {
    const c = await new Client(app).init();
    await c.req('POST', '/api/auth/otp', { email: 'second@example.com', purpose: 'register' });
    const r = await c.req('POST', '/api/auth/register', {
      name: 'Ikkinchi',
      phone: '+998901230002',
      email: 'second@example.com',
      password: 'parol1234',
      otp: lastCode('second@example.com'),
    });
    expect(r.status).toBe(201);
    const c2 = await new Client(app).init();
    const before = inbox.length;
    await c2.req('POST', '/api/auth/otp', { email: 'second@example.com', purpose: 'register' });
    // Bunday hisob bor — ro'yxatdan o'tish kodi yuborilmaydi
    expect(inbox.length).toBe(before);
  });

  it('Gmail login/parol noto\'g\'ri bo\'lsa — aniq xato, kod ishlamaydi', async () => {
    authOk = false;
    const c = await new Client(app).init();
    const r = await c.req('POST', '/api/auth/otp', { email: 'new.user@example.com', purpose: 'register' });
    expect(r.status).toBe(503);
    expect(r.body).toMatchObject({ error: { code: 'otp.sendFailed' } });
    authOk = true;
  });
});
