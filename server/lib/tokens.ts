import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { jwtVerify, SignJWT } from 'jose';
import type { Role } from '../../shared/types.js';
import { get, newId, run } from '../db.js';
import { getEnv } from '../env.js';
import { users, type UserRecord } from '../models.js';
import { getSecrets } from '../secrets.js';
import type { AccessClaims, AppEnv } from '../types.js';
import { randomToken, safeEqual, sha256 } from './crypto.js';
import { ID_RE } from './ids.js';

export const ACCESS_TTL_SEC = 15 * 60;
export const REFRESH_TTL_SEC = 30 * 86_400;
const FAMILY_MAX_AGE_MS = 90 * 86_400_000;
const REUSE_GRACE_MS = 20_000;

const ISSUER = 'erizon-mall';
const AUDIENCE = 'erizon-web';

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getSecrets().jwt);
}

/** Production'da `__Host-` prefiksi: faqat HTTPS, faqat shu domen, Path=/ */
export function cookieNames() {
  const prod = getEnv().isProd;
  return {
    access: prod ? '__Host-at' : 'at',
    refresh: prod ? '__Host-rt' : 'rt',
    csrf: prod ? '__Host-csrf' : 'csrf',
  };
}

function baseCookie(maxAge: number, httpOnly = true) {
  return { httpOnly, secure: getEnv().isProd, sameSite: 'Strict' as const, path: '/', maxAge };
}

type TokenUser = Pick<UserRecord, 'id' | 'role' | 'tokenVersion'>;

export async function signAccess(claims: AccessClaims): Promise<string> {
  return new SignJWT({ role: claims.role, mfa: claims.mfa, ver: claims.ver, sid: claims.sid })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SEC}s`)
    .sign(secretKey());
}

export async function verifyAccess(token: string): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer: ISSUER, audience: AUDIENCE, algorithms: ['HS256'], clockTolerance: 5 });
    if (typeof payload.sub !== 'string' || !ID_RE.test(payload.sub)) return null;
    return {
      sub: payload.sub,
      role: payload.role === 'admin' ? 'admin' : 'customer',
      mfa: payload.mfa === true,
      ver: typeof payload.ver === 'number' ? payload.ver : -1,
      sid: typeof payload.sid === 'string' ? payload.sid : '',
    };
  } catch {
    return null;
  }
}

/** 2FA bosqichi uchun qisqa muddatli token (faqat parol tekshirilgandan keyin) */
export async function signMfaToken(userId: string): Promise<string> {
  return new SignJWT({ purpose: 'mfa' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience('erizon-mfa')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secretKey());
}

export async function verifyMfaToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer: ISSUER, audience: 'erizon-mfa', algorithms: ['HS256'] });
    return payload.purpose === 'mfa' && typeof payload.sub === 'string' && ID_RE.test(payload.sub) ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function setAccessCookie(c: Context<AppEnv>, user: TokenUser, mfa: boolean, sid: string): Promise<void> {
  const token = await signAccess({ sub: user.id, role: user.role as Role, mfa, ver: user.tokenVersion, sid });
  setCookie(c, cookieNames().access, token, baseCookie(ACCESS_TTL_SEC));
}

/** Yangi sessiya: refresh token (bazada faqat SHA-256 xeshi) + access token cookie'lari */
export async function createSession(
  c: Context<AppEnv>,
  user: TokenUser,
  mfa: boolean,
  family?: { id: string; createdAt: number },
  presetId?: string,
): Promise<string> {
  const refresh = randomToken(32);
  const now = Date.now();
  const sessionId = presetId ?? newId();
  run(
    `INSERT INTO sessions (id, user_id, token_hash, family, family_created_at, mfa, expires_at, created_at, ip_hash, ua)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sessionId,
      user.id,
      sha256(refresh),
      family?.id ?? randomToken(16),
      family?.createdAt ?? now,
      mfa,
      now + REFRESH_TTL_SEC * 1000,
      now,
      c.get('ipHash'),
      (c.req.header('user-agent') ?? '').slice(0, 160),
    ],
  );
  await setAccessCookie(c, user, mfa, sessionId);
  setCookie(c, cookieNames().refresh, refresh, baseCookie(REFRESH_TTL_SEC));
  return sessionId;
}

export function clearAuthCookies(c: Context<AppEnv>): void {
  const names = cookieNames();
  const opts = { path: '/', secure: getEnv().isProd };
  deleteCookie(c, names.access, opts);
  deleteCookie(c, names.refresh, opts);
}

interface SessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  family: string;
  family_created_at: number;
  mfa: number;
  expires_at: number;
  revoked_at: number | null;
  replaced_by: string | null;
}

/**
 * Refresh token rotatsiyasi. Eski token bekor qilinadi, yangisi beriladi.
 * Bekor qilingan token qayta ishlatilsa (o'g'irlik belgisi) — butun sessiya oilasi bekor qilinadi.
 */
export async function rotateRefresh(c: Context<AppEnv>): Promise<UserRecord | null> {
  const raw = getCookie(c, cookieNames().refresh);
  if (!raw || raw.length > 100) return null;
  const hash = sha256(raw);
  const session = get<SessionRow>('SELECT * FROM sessions WHERE token_hash = ?', [hash]);
  if (!session || !safeEqual(session.token_hash, hash)) return null;
  const now = Date.now();

  if (session.revoked_at) {
    if (now - session.revoked_at < REUSE_GRACE_MS && session.replaced_by) {
      // Bir vaqtda ikki tabdan kelgan so'rov — faqat access tokenni yangilaymiz
      const user = users.byId(session.user_id);
      if (!user) return null;
      await setAccessCookie(c, user, !!session.mfa, session.replaced_by);
      return user;
    }
    run('UPDATE sessions SET revoked_at = ? WHERE family = ? AND revoked_at IS NULL', [now, session.family]);
    return null;
  }
  if (session.expires_at <= now || now - session.family_created_at > FAMILY_MAX_AGE_MS) return null;

  const user = users.byId(session.user_id);
  if (!user) return null;

  // Eski sessiyani atomik "egallash": faqat bitta parallel so'rov muvaffaqiyatli bo'ladi
  const newSessionId = newId();
  const claimed = run('UPDATE sessions SET revoked_at = ?, replaced_by = ? WHERE id = ? AND revoked_at IS NULL', [now, newSessionId, session.id]);
  if (claimed === 0) {
    await setAccessCookie(c, user, !!session.mfa, session.id);
    return user;
  }
  await createSession(c, user, !!session.mfa, { id: session.family, createdAt: session.family_created_at }, newSessionId);
  return user;
}

export function revokeCurrentSession(c: Context<AppEnv>): void {
  const raw = getCookie(c, cookieNames().refresh);
  if (!raw || raw.length > 100) return;
  run('UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL', [Date.now(), sha256(raw)]);
}

export function revokeAllSessions(userId: string): void {
  const now = Date.now();
  run('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL', [now, userId]);
  run('UPDATE users SET token_version = token_version + 1, updated_at = ? WHERE id = ?', [now, userId]);
}

export function csrfCookieOptions() {
  return baseCookie(REFRESH_TTL_SEC, false);
}
