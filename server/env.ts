import { z } from 'zod';

/**
 * Muhit o'zgaruvchilari — HAMMASI IXTIYORIY. Server env'siz ham to'liq ishlaydi:
 * - ma'lumotlar bazasi: o'rnatilgan SQLite fayli (tashqi server kerak emas);
 * - maxfiy kalitlar (JWT, shifrlash): berilmasa, birinchi ishga tushishda tasodifiy
 *   yaratiladi va bazada saqlanadi (server/secrets.ts);
 * - ruxsat etilgan domen: so'rovning o'z manzili (same-origin) avtomatik qabul qilinadi.
 * Env orqali faqat qo'shimcha sozlash (Gmail, to'lov, Telegram, doimiy kalitlar) beriladi.
 */
const bool = z
  .enum(['true', 'false', '1', '0'])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === 'true' || v === '1'));

const optionalStr = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  /** SQLite fayl yo'li. Standart: lokal — ./data/erizon.sqlite, Vercel — /tmp/erizon.sqlite */
  DATABASE_PATH: optionalStr,
  JWT_SECRET: optionalStr.pipe(z.string().min(32, 'JWT_SECRET kamida 32 belgi').optional()),
  DATA_SECRET: optionalStr.pipe(z.string().min(32, 'DATA_SECRET kamida 32 belgi').optional()),
  PASSWORD_PEPPER: optionalStr.pipe(z.string().min(16).optional()),
  /** Qo'shimcha ruxsat etilgan domenlar (vergul bilan). O'z domeni avtomatik ruxsat etiladi. */
  APP_ORIGIN: optionalStr,
  ADMIN_PHONE: optionalStr,
  ADMIN_PASSWORD: optionalStr,
  ADMIN_REQUIRE_2FA: bool,
  /**
   * Tasdiqlash kodlari Gmail orqali yuboriladi: GMAIL_USER — Gmail manzili,
   * GMAIL_APP_PASSWORD — Google "App password" (16 belgi; oddiy Gmail paroli ishlamaydi).
   */
  GMAIL_USER: optionalStr.pipe(z.string().email("GMAIL_USER — email manzil bo'lishi kerak").optional()),
  GMAIL_APP_PASSWORD: optionalStr,
  /** Ixtiyoriy: boshqa SMTP server (standart — smtp.gmail.com:465) */
  SMTP_HOST: optionalStr,
  SMTP_PORT: optionalStr.pipe(z.coerce.number().int().min(1).max(65535).optional()),
  SMTP_SECURE: bool,
  /** Xat jo'natuvchi nomi (standart: Erizon Mall) */
  MAIL_FROM_NAME: optionalStr,
  /** Gmail ulanmagan bo'lsa kod sahifada ko'rsatiladi (standart: true) */
  ALLOW_DEMO_OTP: bool,
  TELEGRAM_BOT_TOKEN: optionalStr.pipe(z.string().regex(/^\d+:[A-Za-z0-9_-]{20,}$/).optional()),
  TELEGRAM_CHAT_ID: optionalStr.pipe(z.string().regex(/^-?\d+$/).optional()),
  PAYME_MERCHANT_ID: optionalStr,
  PAYME_KEY: optionalStr,
  PAYME_TEST: bool,
  CLICK_SERVICE_ID: optionalStr.pipe(z.string().regex(/^\d+$/).optional()),
  CLICK_MERCHANT_ID: optionalStr.pipe(z.string().regex(/^\d+$/).optional()),
  CLICK_SECRET_KEY: optionalStr,
  // Vercel avtomatik beradi
  VERCEL: optionalStr,
  VERCEL_URL: optionalStr,
  VERCEL_BRANCH_URL: optionalStr,
  VERCEL_PROJECT_PRODUCTION_URL: optionalStr,
});

export type Env = z.infer<typeof schema> & {
  isProd: boolean;
  onVercel: boolean;
  databasePath: string;
  origins: string[];
  require2fa: boolean;
  demoOtp: boolean;
  /** Email yuborish sozlamalari (user/pass bo'lmasa — email o'chiq, demo rejim) */
  mail: { live: boolean; host: string; port: number; secure: boolean; user?: string; pass?: string; fromName: string };
  payme: boolean;
  click: boolean;
};

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // Faqat noto'g'ri berilgan (ixtiyoriy) qiymatlar nomi — qiymatlarning o'zi logga tushmaydi
    const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Server sozlamalari noto'g'ri: ${problems}`);
  }
  const e = parsed.data;
  const onVercel = !!e.VERCEL;
  const isProd = e.NODE_ENV === 'production' || onVercel;
  const origins = new Set(
    (e.APP_ORIGIN ?? '')
      .split(',')
      .map((s) => s.trim().replace(/\/$/, ''))
      .filter(Boolean),
  );
  for (const host of [e.VERCEL_URL, e.VERCEL_BRANCH_URL, e.VERCEL_PROJECT_PRODUCTION_URL]) {
    if (host) origins.add(`https://${host}`);
  }
  // Google App password odatda "abcd efgh ijkl mnop" ko'rinishida beriladi — bo'shliqlar olib tashlanadi
  const mailPass = e.GMAIL_APP_PASSWORD?.replace(/\s+/g, '') || undefined;
  const mailLive = !!e.GMAIL_USER && !!mailPass;
  const mailPort = e.SMTP_PORT ?? 465;
  cached = {
    ...e,
    isProd,
    onVercel,
    databasePath: e.DATABASE_PATH ?? (onVercel ? '/tmp/erizon.sqlite' : 'data/erizon.sqlite'),
    origins: [...origins],
    require2fa: e.ADMIN_REQUIRE_2FA ?? false,
    // Gmail ulanmagan bo'lsa ro'yxatdan o'tish ishlashi uchun kod sahifada ko'rsatiladi
    demoOtp: e.ALLOW_DEMO_OTP ?? !mailLive,
    mail: {
      live: mailLive,
      host: e.SMTP_HOST ?? 'smtp.gmail.com',
      port: mailPort,
      secure: e.SMTP_SECURE ?? mailPort === 465,
      user: e.GMAIL_USER,
      pass: mailPass,
      fromName: e.MAIL_FROM_NAME ?? 'Erizon Mall',
    },
    payme: !!(e.PAYME_MERCHANT_ID && e.PAYME_KEY),
    click: !!(e.CLICK_SERVICE_ID && e.CLICK_MERCHANT_ID && e.CLICK_SECRET_KEY),
  };
  return cached;
}

/** Testlar uchun: keshni tozalash */
export function resetEnvCache(): void {
  cached = null;
}
