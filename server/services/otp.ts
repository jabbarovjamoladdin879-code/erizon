import { get, run } from '../db.js';
import { getEnv } from '../env.js';
import { hmac, randomDigits, safeEqual } from '../lib/crypto.js';
import { ApiError } from '../lib/errors.js';
import { enforce } from '../lib/rateLimit.js';
import { sendSms } from './sms.js';

export type OtpPurpose = 'register' | 'login' | 'reset';

const OTP_TTL_SEC = 5 * 60;
const MAX_ATTEMPTS = 5;

const MESSAGES: Record<OtpPurpose, (code: string) => string> = {
  register: (code) => `Erizon Mall: ro'yxatdan o'tish kodi ${code}. Kodni hech kimga bermang.`,
  login: (code) => `Erizon Mall: kirish kodi ${code}. Kodni hech kimga bermang.`,
  reset: (code) => `Erizon Mall: parolni tiklash kodi ${code}. Kodni hech kimga bermang.`,
};

function codeHash(phone: string, purpose: OtpPurpose, code: string): string {
  return hmac(`${purpose}:${phone}:${code}`, 'otp');
}

/**
 * Bir martalik SMS kod yaratish. Kod bazada faqat HMAC xeshi sifatida saqlanadi,
 * 5 daqiqa amal qiladi. Cheklovlar: bir raqamga 60 soniyada 1 marta, soatiga 5 marta;
 * bitta IP'dan soatiga 20 marta.
 * @returns demo rejimida (SMS provayder ulanmagan) kodning o'zi
 */
export async function issueOtp(phone: string, purpose: OtpPurpose, ip: string, send: boolean): Promise<string | undefined> {
  enforce(`otp-cooldown-${purpose}`, phone, 1, 60, 'otp.cooldown');
  enforce('otp-phone', phone, 5, 3600, 'otp.tooMany');
  enforce('otp-ip', ip, 20, 3600, 'otp.tooMany');

  const code = randomDigits(6);
  run(
    `INSERT INTO otps (id, code_hash, attempts, expires_at) VALUES (?, ?, 0, ?)
     ON CONFLICT(id) DO UPDATE SET code_hash = excluded.code_hash, attempts = 0, expires_at = excluded.expires_at`,
    [`${purpose}:${phone}`, codeHash(phone, purpose, code), Date.now() + OTP_TTL_SEC * 1000],
  );
  const env = getEnv();
  if (send && !env.demoOtp) await sendSms(phone, MESSAGES[purpose](code));
  return env.demoOtp && send ? code : undefined;
}

/** Kodni tekshiradi va muvaffaqiyatli bo'lsa o'chiradi (qayta ishlatib bo'lmaydi) */
export function verifyOtp(phone: string, purpose: OtpPurpose, code: string): void {
  const id = `${purpose}:${phone}`;
  // Urinishlar soni avval oshiriladi — keyin tekshiriladi
  const changed = run('UPDATE otps SET attempts = attempts + 1 WHERE id = ? AND expires_at > ?', [id, Date.now()]);
  if (!changed) throw new ApiError(400, 'otp.expired');
  const row = get<{ code_hash: string; attempts: number }>('SELECT code_hash, attempts FROM otps WHERE id = ?', [id]);
  if (!row) throw new ApiError(400, 'otp.expired');
  if (row.attempts > MAX_ATTEMPTS) {
    run('DELETE FROM otps WHERE id = ?', [id]);
    throw new ApiError(400, 'otp.tooManyAttempts');
  }
  if (!safeEqual(row.code_hash, codeHash(phone, purpose, code))) throw new ApiError(400, 'otp.invalid');
  run('DELETE FROM otps WHERE id = ?', [id]);
}
