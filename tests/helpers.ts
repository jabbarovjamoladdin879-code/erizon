const ORIGIN = 'http://localhost:5173';

/**
 * Har test fayli alohida jarayonda — o'zining xotiradagi SQLite bazasi bilan.
 * Maxfiy kalitlar berilmaydi: server ularni o'zi yaratishi ham tekshiriladi.
 */
export async function startTestServer(extraEnv: Record<string, string> = {}) {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_PATH: ':memory:',
    APP_ORIGIN: ORIGIN,
    ADMIN_PHONE: '+998900000001',
    ADMIN_PASSWORD: 'Admin12345',
    ...extraEnv,
  });
  const { resetEnvCache } = await import('../server/env.js');
  resetEnvCache();
  const { app } = await import('../server/app.js');
  const { bootstrap } = await import('../server/seed.js');
  await bootstrap();
  return app;
}

export async function stopTestServer() {
  const { closeDb } = await import('../server/db.js');
  const { resetBootstrap } = await import('../server/seed.js');
  closeDb();
  resetBootstrap();
}

type App = Awaited<ReturnType<typeof startTestServer>>;

export interface Res<T = Record<string, unknown>> {
  status: number;
  body: T;
  headers: Headers;
}

/** Cookie'larni saqlaydigan va CSRF/Origin sarlavhalarini qo'shadigan test mijozi */
let ipCounter = 0;

export class Client {
  cookies = new Map<string, string>();
  /** Har bir mijoz alohida IP'dan keladi (rate limit testlarga xalaqit bermasligi uchun) */
  ip = `10.0.${Math.floor(++ipCounter / 250)}.${(ipCounter % 250) + 1}`;
  constructor(
    private app: App,
    public origin: string | null = ORIGIN,
  ) {}

  cookieHeader() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  async req<T = Record<string, unknown>>(
    method: string,
    path: string,
    body?: unknown,
    opts: { headers?: Record<string, string>; csrf?: boolean; raw?: string | Uint8Array } = {},
  ): Promise<Res<T>> {
    const headers = new Headers(opts.headers);
    if (!headers.has('x-real-ip')) headers.set('x-real-ip', this.ip);
    if (this.cookies.size) headers.set('cookie', this.cookieHeader());
    const unsafe = !['GET', 'HEAD'].includes(method);
    if (unsafe) {
      if (this.origin && !headers.has('origin')) headers.set('origin', this.origin);
      const csrf = this.cookies.get('csrf');
      if (opts.csrf !== false && csrf && !headers.has('x-csrf-token')) headers.set('x-csrf-token', csrf);
      if (!opts.raw && !headers.has('content-type')) headers.set('content-type', 'application/json');
    }
    const res = await this.app.request(path, {
      method,
      headers,
      body: opts.raw ?? (unsafe ? JSON.stringify(body ?? {}) : undefined),
    });
    for (const sc of res.headers.getSetCookie()) {
      const [pair, ...attrs] = sc.split(';');
      const idx = pair.indexOf('=');
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      const expired = attrs.some((a) => /max-age=0/i.test(a) || /expires=Thu, 01 Jan 1970/i.test(a));
      if (expired || value === '') this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      /* JSON emas */
    }
    return { status: res.status, body: parsed as T, headers: res.headers };
  }

  async init() {
    await this.req('GET', '/api/auth/csrf');
    return this;
  }
}

/** Test foydalanuvchisining emaili telefon raqamidan hosil qilinadi */
const emailFor = (phone: string) => `u${phone.slice(-9)}@example.com`;

export async function registerUser(client: Client, phone: string, name = 'Test User', password = 'parol1234', referralCode?: string) {
  const email = emailFor(phone);
  const otp = await client.req<{ devCode?: string }>('POST', '/api/auth/otp', { email, purpose: 'register' });
  if (!otp.body.devCode) throw new Error(`OTP devCode yo'q: ${JSON.stringify(otp.body)}`);
  return client.req<{ user: { id: string; bonus: number; referralCode: string } }>('POST', '/api/auth/register', {
    name,
    phone,
    email,
    password,
    otp: otp.body.devCode,
    ...(referralCode ? { referralCode } : {}),
  });
}

export const cartItem = (refId: string, qty = 1, kind: 'product' | 'combo' = 'product', options?: unknown) => ({
  key: `${kind}:${refId}`,
  kind,
  refId,
  qty,
  ...(options ? { options } : {}),
});
