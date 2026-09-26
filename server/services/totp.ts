import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { run } from '../db.js';
import { decrypt, encrypt } from '../lib/crypto.js';
import type { UserRecord } from '../models.js';

/**
 * Admin uchun ikki bosqichli autentifikatsiya (TOTP — Google Authenticator va h.k.).
 * Sir bazada AES-256-GCM bilan shifrlangan holda saqlanadi.
 * Bir kodni ikki marta ishlatish (replay) taqiqlangan: totp_last_step saqlanadi.
 */
function totpFor(secretBase32: string, label: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: 'Erizon Mall',
    label,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

export async function createTotpSetup(user: UserRecord): Promise<{ secret: string; otpauthUrl: string; qrDataUrl: string }> {
  const secret = new OTPAuth.Secret({ size: 20 }).base32;
  run('UPDATE users SET totp_pending_enc = ?, updated_at = ? WHERE id = ?', [encrypt(secret, 'totp'), Date.now(), user.id]);
  const otpauthUrl = totpFor(secret, user.phone).toString();
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 220 });
  return { secret, otpauthUrl, qrDataUrl };
}

/** Kodni tekshiradi va (to'g'ri bo'lsa) qadamni atomik tarzda "ishlatilgan" deb belgilaydi */
export function verifyTotp(user: UserRecord, code: string, which: 'active' | 'pending' = 'active'): boolean {
  const enc = which === 'active' ? user.totpSecretEnc : user.totpPendingEnc;
  if (!enc) return false;
  let secret: string;
  try {
    secret = decrypt(enc, 'totp');
  } catch {
    return false;
  }
  const delta = totpFor(secret, user.phone).validate({ token: code, window: 1 });
  if (delta === null) return false;
  const step = Math.floor(Date.now() / 30_000) + delta;
  const changed = run('UPDATE users SET totp_last_step = ? WHERE id = ? AND (totp_last_step IS NULL OR totp_last_step < ?)', [step, user.id, step]);
  return changed === 1;
}
