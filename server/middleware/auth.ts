import type { Context, MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { getEnv } from '../env.js';
import { ApiError, forbidden, unauthorized } from '../lib/errors.js';
import { cookieNames, verifyAccess } from '../lib/tokens.js';
import { users, type UserRecord } from '../models.js';
import type { AppEnv } from '../types.js';

/** Access token cookie'sini o'qib, imzosini tekshiradi (foydalanuvchi majburiy emas) */
export const authContext: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getCookie(c, cookieNames().access);
  if (token && token.length < 2000) c.set('claims', await verifyAccess(token));
  await next();
};

/**
 * Foydalanuvchini bazadan yuklaydi va tokenVersion'ni tekshiradi
 * (parol almashtirilgan yoki "barcha qurilmalardan chiqish" bosilgan bo'lsa, eski tokenlar ishlamaydi).
 */
export function loadUser(c: Context<AppEnv>): UserRecord | null {
  const cached = c.get('user');
  if (cached) return cached;
  const claims = c.get('claims');
  if (!claims) return null;
  const user = users.byId(claims.sub);
  if (!user || user.tokenVersion !== claims.ver) return null;
  c.set('user', user);
  return user;
}

/** Bazadan yangilangan holatini qayta o'qish (bonus va h.k. o'zgargandan keyin) */
export function reloadUser(c: Context<AppEnv>): UserRecord | null {
  c.set('user', null);
  return loadUser(c);
}

export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!loadUser(c)) throw unauthorized();
  await next();
};

/** Faqat admin roli bor va (talab qilinsa) 2FA'dan o'tgan sessiyalar uchun */
export function requireAdmin(options: { allowWithout2fa?: boolean } = {}): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const user = loadUser(c);
    if (!user) throw unauthorized();
    if (user.role !== 'admin') throw forbidden();
    if (user.totpEnabled && !c.get('claims')?.mfa) throw new ApiError(403, 'auth.mfaRequired');
    if (!options.allowWithout2fa && getEnv().require2fa && !user.totpEnabled) throw new ApiError(403, 'auth.mfaSetup');
    await next();
  };
}

export function currentUser(c: Context<AppEnv>): UserRecord {
  const user = c.get('user');
  if (!user) throw unauthorized();
  return user;
}
