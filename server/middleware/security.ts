import type { Context, MiddlewareHandler } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { getEnv } from '../env.js';
import { hmac, randomToken, safeEqual } from '../lib/crypto.js';
import { ApiError } from '../lib/errors.js';
import { cookieNames, csrfCookieOptions } from '../lib/tokens.js';
import type { AppEnv } from '../types.js';

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
/** To'lov tizimlari webhook'lari: o'z imzo/autentifikatsiyasi bor, brauzerdan kelmaydi */
const WEBHOOK_PREFIX = '/api/payments/';

function clientIp(header: (name: string) => string | undefined): string {
  // Vercel bu sarlavhalarni o'zi o'rnatadi va mijozdan kelganini qayta yozadi
  const real = header('x-real-ip');
  const fwd = header('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = (real || fwd || '127.0.0.1').slice(0, 64);
  return /^[0-9a-fA-F:.]+$/.test(ip) ? ip : '0.0.0.0';
}

/**
 * Saytning o'z manzili (same-origin). Brauzer boshqa saytdan yuborilgan so'rovda
 * Origin sarlavhasini soxtalashtira olmaydi, shuning uchun Origin === o'z manzilimiz
 * tekshiruvi env'siz ham ishonchli CSRF himoyasi. Vercel/proxy ortida
 * x-forwarded-proto/host sarlavhalari ishlatiladi.
 */
export function ownOrigin(c: Context<AppEnv>): string {
  const url = new URL(c.req.url);
  const proto = (c.req.header('x-forwarded-proto')?.split(',')[0]?.trim() || url.protocol.replace(':', '')).toLowerCase();
  const host = (c.req.header('x-forwarded-host')?.split(',')[0]?.trim() || c.req.header('host') || url.host).toLowerCase();
  if (!/^https?$/.test(proto) || !/^[a-z0-9.-]+(:\d{1,5})?$/.test(host)) return '';
  return `${proto}://${host}`;
}

/** So'rov identifikatori va mijoz IP manzili (loglarda faqat HMAC xeshi) */
export const requestContext: MiddlewareHandler<AppEnv> = async (c, next) => {
  const id = randomToken(9);
  const ip = clientIp((n) => c.req.header(n));
  c.set('requestId', id);
  c.set('ip', ip);
  c.set('ipHash', hmac(ip, 'ip').slice(0, 24));
  c.set('claims', null);
  c.set('user', null);
  await next();
  c.header('X-Request-Id', id);
};

/** API javoblari uchun qat'iy xavfsizlik sarlavhalari */
export const securityHeaders: MiddlewareHandler<AppEnv> = async (c, next) => {
  await next();
  const h = c.res.headers;
  if (!h.has('Content-Security-Policy')) h.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('X-Frame-Options', 'DENY');
  h.set('Referrer-Policy', 'no-referrer');
  h.set('Cross-Origin-Resource-Policy', 'same-origin');
  h.set('Cross-Origin-Opener-Policy', 'same-origin');
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  if (!h.has('Cache-Control')) h.set('Cache-Control', 'no-store');
  if (getEnv().isProd) h.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  h.delete('X-Powered-By');
};

/**
 * CSRF himoyasi (bir necha qatlam):
 * 1) Origin sarlavhasi ruxsat etilgan domenlardan biri bo'lishi shart;
 * 2) Double-submit token: `x-csrf-token` sarlavhasi cookie'dagi token bilan mos kelishi shart;
 * 3) Cookie'lar SameSite=Strict;
 * 4) JSON so'rovlar uchun Content-Type: application/json majburiy (oddiy HTML forma yubora olmaydi).
 */
export const csrfProtection: MiddlewareHandler<AppEnv> = async (c, next) => {
  const names = cookieNames();
  const path = c.req.path;
  let token = getCookie(c, names.csrf);
  const valid = !!token && /^[A-Za-z0-9_-]{43}$/.test(token);
  // Cookie faqat keshlanmaydigan auth javoblarida beriladi (CDN keshiga Set-Cookie tushmasligi uchun)
  if (!valid && (path === '/api/auth/csrf' || path === '/api/auth/me')) {
    token = randomToken(32);
    setCookie(c, names.csrf, token, csrfCookieOptions());
  }
  if (UNSAFE.has(c.req.method) && !path.startsWith(WEBHOOK_PREFIX)) {
    const env = getEnv();
    const origin = c.req.header('origin');
    if (!origin || (!env.origins.includes(origin) && origin !== ownOrigin(c))) throw new ApiError(403, 'err.origin');
    const header = c.req.header('x-csrf-token') ?? '';
    if (!valid || !token || !header || !safeEqual(header, token)) throw new ApiError(403, 'err.csrf');
    const ct = (c.req.header('content-type') ?? '').toLowerCase();
    const isUpload = path === '/api/admin/images';
    const hasBody = c.req.header('content-length') !== '0' && c.req.method !== 'DELETE';
    if (hasBody && !isUpload && !ct.startsWith('application/json')) throw new ApiError(415, 'err.contentType');
  }
  await next();
};
