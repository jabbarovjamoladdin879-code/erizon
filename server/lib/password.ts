import { createHmac, randomBytes } from 'node:crypto';
import { argon2id, argon2Verify } from 'hash-wasm';
import { ADMIN_PASSWORD_HASH } from '../admin.config.js';
import { getEnv } from '../env.js';

/**
 * Parollar Argon2id bilan xeshlanadi (OWASP tavsiyasi: m=19 MiB, t=2, p=1).
 * WASM implementatsiya — native modul kerak emas, Vercel'da muammosiz ishlaydi.
 * PASSWORD_PEPPER berilsa, parol avval HMAC bilan "qalampirlanadi" (baza o'g'irlansa ham
 * pepper'siz xeshlarni tekshirib bo'lmaydi).
 */
const PARAMS = { parallelism: 1, iterations: 2, memorySize: 19_456, hashLength: 32 } as const;

function pepper(password: string): string {
  const p = getEnv().PASSWORD_PEPPER;
  return p ? createHmac('sha256', p).update(password).digest('base64') : password;
}

export async function hashPassword(password: string): Promise<string> {
  return argon2id({ ...PARAMS, password: pepper(password), salt: randomBytes(16), outputType: 'encoded' });
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  try {
    // Repodagi admin xeshi pepper'siz yaratilgan (u ochiq, pepper uni himoya qilmaydi)
    const input = encoded === ADMIN_PASSWORD_HASH ? password : pepper(password);
    return await argon2Verify({ password: input, hash: encoded });
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | null = null;

/** Foydalanuvchi topilmasa ham xuddi shuncha vaqt sarflash (user enumeration'ga qarshi) */
export async function verifyDummy(password: string): Promise<void> {
  dummyHash ??= hashPassword('dummy-password-for-timing-1');
  await verifyPassword(password, await dummyHash);
}
