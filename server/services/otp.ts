import { get, run } from '../db.js';
import { getEnv } from '../env.js';
import { hmac, randomDigits, safeEqual } from '../lib/crypto.js';
import { ApiError } from '../lib/errors.js';
import { enforce } from '../lib/rateLimit.js';
import { sendMail } from './mail.js';

export type OtpPurpose = 'register' | 'login' | 'reset';

const OTP_TTL_SEC = 10 * 60;
const MAX_ATTEMPTS = 5;

const SUBJECTS: Record<OtpPurpose, string> = {
  register: "Erizon Mall — ro'yxatdan o'tish kodi",
  login: 'Erizon Mall — kirish kodi',
  reset: 'Erizon Mall — parolni tiklash kodi',
};

const ACTIONS: Record<OtpPurpose, string> = {
  register: "ro'yxatdan o'tish",
  login: 'hisobingizga kirish',
  reset: 'parolni tiklash',
};

/** Kod faqat raqamlardan iborat — HTML'ga xavfsiz qo'yiladi */
function buildMessage(purpose: OtpPurpose, code: string): { subject: string; text: string; html: string } {
  const minutes = OTP_TTL_SEC / 60;
  const text = `Erizon Mall: ${ACTIONS[purpose]} uchun tasdiqlash kodi: ${code}\n\nKod ${minutes} daqiqa amal qiladi. Kodni hech kimga bermang.\nAgar bu so'rovni siz yubormagan bo'lsangiz, xatni e'tiborsiz qoldiring.`;
  const html = `<!doctype html>
<html lang="uz"><body style="margin:0;background:#f5f3ff;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 32px rgba(76,29,149,.12)">
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#c026d3);padding:24px 28px;color:#ffffff;font-size:20px;font-weight:bold">Erizon Mall</td></tr>
        <tr><td style="padding:28px">
          <p style="margin:0 0 12px;font-size:15px">Assalomu alaykum!</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5">${ACTIONS[purpose].charAt(0).toUpperCase() + ACTIONS[purpose].slice(1)} uchun tasdiqlash kodingiz:</p>
          <div style="margin:0 0 20px;padding:18px;border-radius:16px;background:#f5f3ff;text-align:center;font-size:34px;font-weight:bold;letter-spacing:10px;color:#6d28d9">${code}</div>
          <p style="margin:0 0 8px;font-size:13px;color:#475569">Kod ${minutes} daqiqa amal qiladi. Kodni hech kimga bermang — Erizon Mall xodimlari uni hech qachon so'ramaydi.</p>
          <p style="margin:0;font-size:13px;color:#94a3b8">Agar bu so'rovni siz yubormagan bo'lsangiz, xatni e'tiborsiz qoldiring.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  return { subject: `${SUBJECTS[purpose]}: ${code}`, text, html };
}

function codeHash(email: string, purpose: OtpPurpose, code: string): string {
  return hmac(`${purpose}:${email}:${code}`, 'otp');
}

/**
 * Bir martalik email kod yaratish. Kod bazada faqat HMAC xeshi sifatida saqlanadi,
 * 10 daqiqa amal qiladi. Cheklovlar: bir manzilga 60 soniyada 1 marta, soatiga 5 marta;
 * bitta IP'dan soatiga 20 marta.
 * @param send false bo'lsa (masalan, bunday hisob yo'q) — xat yuborilmaydi, lekin javob bir xil
 * @returns demo rejimida (Gmail ulanmagan) kodning o'zi
 */
export async function issueOtp(email: string, purpose: OtpPurpose, ip: string, send: boolean): Promise<string | undefined> {
  enforce(`otp-cooldown-${purpose}`, email, 1, 60, 'otp.cooldown');
  enforce('otp-email', email, 5, 3600, 'otp.tooMany');
  enforce('otp-ip', ip, 20, 3600, 'otp.tooMany');

  const id = `${purpose}:${email}`;
  const code = randomDigits(6);
  run(
    `INSERT INTO otps (id, code_hash, attempts, expires_at) VALUES (?, ?, 0, ?)
     ON CONFLICT(id) DO UPDATE SET code_hash = excluded.code_hash, attempts = 0, expires_at = excluded.expires_at`,
    [id, codeHash(email, purpose, code), Date.now() + OTP_TTL_SEC * 1000],
  );
  const env = getEnv();
  if (!send) return undefined;
  if (env.demoOtp) return code;
  try {
    await sendMail({ to: email, ...buildMessage(purpose, code) });
  } catch (err) {
    // Yuborilmagan kod ishlatilmasin; sabab faqat server logida (parol/kalit logga tushmaydi)
    run('DELETE FROM otps WHERE id = ?', [id]);
    console.error('[mail] kod yuborilmadi:', err instanceof Error ? err.message : 'unknown');
    throw new ApiError(503, 'otp.sendFailed');
  }
  return undefined;
}

/** Kodni tekshiradi va muvaffaqiyatli bo'lsa o'chiradi (qayta ishlatib bo'lmaydi) */
export function verifyOtp(email: string, purpose: OtpPurpose, code: string): void {
  const id = `${purpose}:${email}`;
  // Urinishlar soni avval oshiriladi — keyin tekshiriladi
  const changed = run('UPDATE otps SET attempts = attempts + 1 WHERE id = ? AND expires_at > ?', [id, Date.now()]);
  if (!changed) throw new ApiError(400, 'otp.expired');
  const row = get<{ code_hash: string; attempts: number }>('SELECT code_hash, attempts FROM otps WHERE id = ?', [id]);
  if (!row) throw new ApiError(400, 'otp.expired');
  if (row.attempts > MAX_ATTEMPTS) {
    run('DELETE FROM otps WHERE id = ?', [id]);
    throw new ApiError(400, 'otp.tooManyAttempts');
  }
  if (!safeEqual(row.code_hash, codeHash(email, purpose, code))) throw new ApiError(400, 'otp.invalid');
  run('DELETE FROM otps WHERE id = ?', [id]);
}
