import { Hono, type Context } from 'hono';
import {
  loginRequestSchema,
  otpLoginRequestSchema,
  otpRequestSchema,
  registerRequestSchema,
  resetRequestSchema,
  totpLoginRequestSchema,
} from '../../shared/validation.js';
import { isUniqueError, newId, run, tx } from '../db.js';
import { randomCode } from '../lib/crypto.js';
import { ApiError, conflict, unauthorized } from '../lib/errors.js';
import { body } from '../lib/http.js';
import { hashPassword, verifyDummy, verifyPassword } from '../lib/password.js';
import { enforce, resetLimit } from '../lib/rateLimit.js';
import { cleanText } from '../lib/sanitize.js';
import {
  clearAuthCookies,
  cookieNames,
  createSession,
  revokeAllSessions,
  revokeCurrentSession,
  rotateRefresh,
  signMfaToken,
  verifyMfaToken,
} from '../lib/tokens.js';
import { currentUser, loadUser, requireUser } from '../middleware/auth.js';
import { users, type UserRecord } from '../models.js';
import { changeBonus } from '../services/bonus.js';
import { issueOtp, verifyOtp } from '../services/otp.js';
import { toPublicUser } from '../services/serialize.js';
import { verifyTotp } from '../services/totp.js';
import type { AppEnv } from '../types.js';

const WELCOME_BONUS = 5_000;
export const REFERRAL_BONUS = 10_000;
const MAX_FAILED = 5;
const LOCK_MS = 15 * 60_000;

export const authRoutes = new Hono<AppEnv>();

/** Parol/OTP tekshirilgandan keyin: 2FA yoqilgan bo'lsa — ikkinchi bosqich */
async function finishLogin(c: Context<AppEnv>, user: UserRecord) {
  run('UPDATE users SET failed_logins = 0, lock_until = NULL, updated_at = ? WHERE id = ?', [Date.now(), user.id]);
  if (user.totpEnabled) {
    return c.json({ mfaRequired: true, mfaToken: await signMfaToken(user.id) });
  }
  await createSession(c, user, false);
  return c.json({ user: toPublicUser(user) });
}

/** CSRF cookie'sini o'rnatadi (brauzer uni `document.cookie` dan o'qib, sarlavhada yuboradi) */
authRoutes.get('/csrf', (c) => c.json({ ok: true, cookie: cookieNames().csrf }));

/** Joriy foydalanuvchi (mehmon uchun 200 + null — konsolda 401 xatolar chiqmasligi uchun) */
authRoutes.get('/me', (c) => {
  const user = loadUser(c);
  return c.json({ user: user ? toPublicUser(user) : null, mfa: c.get('claims')?.mfa ?? false });
});

authRoutes.post('/otp', async (c) => {
  const { phone, purpose } = await body(c, otpRequestSchema);
  const exists = !!users.byPhone(phone);
  // Enumeratsiyaga qarshi: javob har doim bir xil. Keraksiz holatda SMS yuborilmaydi.
  const shouldSend = purpose === 'register' ? !exists : exists;
  const devCode = await issueOtp(phone, purpose, c.get('ip'), shouldSend);
  return c.json({ ok: true, devCode });
});

authRoutes.post('/register', async (c) => {
  enforce('register-ip', c.get('ip'), 10, 3600);
  const input = await body(c, registerRequestSchema);
  verifyOtp(input.phone, 'register', input.otp);
  if (users.byPhone(input.phone)) throw conflict('auth.exists');

  let referrer: UserRecord | undefined;
  if (input.referralCode) {
    referrer = users.byReferral(input.referralCode);
    if (!referrer) throw new ApiError(400, 'auth.referralInvalid');
  }

  const passwordHash = await hashPassword(input.password);
  const now = Date.now();
  const user: UserRecord = {
    id: newId(),
    name: cleanText(input.name, 50),
    phone: input.phone,
    passwordHash,
    role: 'customer',
    bonus: 0,
    addresses: [],
    referralCode: randomCode(8),
    referredBy: referrer?.id,
    referralRewarded: false,
    failedLogins: 0,
    totpEnabled: false,
    tokenVersion: 0,
    createdAt: now,
    updatedAt: now,
  };
  // Sinxron tranzaksiya: foydalanuvchi va sovg'a bonuslari birga yoziladi
  try {
    tx(() => {
      for (let attempt = 0; ; attempt++) {
        try {
          users.insert(user);
          break;
        } catch (err) {
          if (!isUniqueError(err)) throw err;
          if (String((err as Error).message).includes('phone')) throw conflict('auth.exists');
          if (attempt >= 3) throw err;
          user.referralCode = randomCode(8);
        }
      }
      changeBonus(user.id, WELCOME_BONUS, 'welcome');
      if (referrer) changeBonus(user.id, REFERRAL_BONUS, 'referral');
    });
  } catch (err) {
    if (isUniqueError(err)) throw conflict('auth.exists');
    throw err;
  }
  const fresh = users.byId(user.id) ?? user;
  await createSession(c, fresh, false);
  return c.json({ user: toPublicUser(fresh) }, 201);
});

authRoutes.post('/login', async (c) => {
  const { phone, password } = await body(c, loginRequestSchema);
  enforce('login-ip', c.get('ip'), 20, 900, 'auth.tooMany');
  enforce('login-phone', phone, 10, 900, 'auth.tooMany');
  const user = users.byPhone(phone);
  if (!user) {
    await verifyDummy(password);
    throw unauthorized('auth.invalid');
  }
  if (user.lockUntil && user.lockUntil > Date.now()) {
    throw new ApiError(429, 'auth.locked', { retryAfter: Math.ceil((user.lockUntil - Date.now()) / 1000) });
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    // Atomik: hisoblagichni oshirish va chegaraga yetsa bloklash
    run(
      `UPDATE users SET
         lock_until = CASE WHEN failed_logins + 1 >= ? THEN ? ELSE lock_until END,
         failed_logins = CASE WHEN failed_logins + 1 >= ? THEN 0 ELSE failed_logins + 1 END
       WHERE id = ?`,
      [MAX_FAILED, Date.now() + LOCK_MS, MAX_FAILED, user.id],
    );
    throw unauthorized('auth.invalid');
  }
  resetLimit('login-phone', phone);
  return finishLogin(c, user);
});

authRoutes.post('/login/otp', async (c) => {
  const { phone, otp } = await body(c, otpLoginRequestSchema);
  enforce('login-ip', c.get('ip'), 20, 900, 'auth.tooMany');
  verifyOtp(phone, 'login', otp);
  const user = users.byPhone(phone);
  if (!user) throw unauthorized('auth.invalid');
  return finishLogin(c, user);
});

/** 2FA: ikkinchi bosqich */
authRoutes.post('/login/totp', async (c) => {
  const { mfaToken, code } = await body(c, totpLoginRequestSchema);
  const userId = await verifyMfaToken(mfaToken);
  if (!userId) throw unauthorized('auth.mfaExpired');
  enforce('totp', userId, 5, 300, 'auth.tooMany');
  const user = users.byId(userId);
  if (!user || !user.totpEnabled) throw unauthorized('auth.invalid');
  if (!verifyTotp(user, code)) throw new ApiError(401, 'auth.totpInvalid');
  await createSession(c, user, true);
  return c.json({ user: toPublicUser(user) });
});

authRoutes.post('/refresh', async (c) => {
  enforce('refresh-ip', c.get('ip'), 120, 900);
  const user = await rotateRefresh(c);
  if (!user) {
    // Sessiya yo'q/yaroqsiz — mehmon holati (brauzer konsolida keraksiz 401 chiqmasligi uchun 200)
    clearAuthCookies(c);
    return c.json({ user: null });
  }
  return c.json({ user: toPublicUser(user) });
});

authRoutes.post('/logout', (c) => {
  revokeCurrentSession(c);
  clearAuthCookies(c);
  return c.json({ ok: true });
});

authRoutes.post('/logout-all', requireUser, (c) => {
  revokeAllSessions(currentUser(c).id);
  clearAuthCookies(c);
  return c.json({ ok: true });
});

authRoutes.post('/reset', async (c) => {
  enforce('reset-ip', c.get('ip'), 10, 3600);
  const { phone, otp, password } = await body(c, resetRequestSchema);
  verifyOtp(phone, 'reset', otp);
  const user = users.byPhone(phone);
  if (!user) throw unauthorized('auth.invalid');
  const passwordHash = await hashPassword(password);
  run('UPDATE users SET password_hash = ?, failed_logins = 0, lock_until = NULL, updated_at = ? WHERE id = ?', [passwordHash, Date.now(), user.id]);
  revokeAllSessions(user.id);
  clearAuthCookies(c);
  return c.json({ ok: true });
});
