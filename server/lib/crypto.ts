import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { getSecrets, secretsVersion } from '../secrets.js';

/** Kriptografik jihatdan xavfsiz tasodifiy satr (base64url) */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // chalkash belgilar (0/O, 1/I) yo'q

export function randomCode(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

export function randomDigits(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += String(randomInt(10));
  return out;
}

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** Maxfiy kalit bilan HMAC (OTP kodlari, IP manzillar va h.k. uchun) */
export function hmac(input: string, purpose = 'generic'): string {
  return createHmac('sha256', deriveKey(`hmac:${purpose}`)).update(input).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) {
    // Uzunlik farqi bo'lsa ham doimiy vaqtli taqqoslash bajariladi
    timingSafeEqual(ba, Buffer.alloc(ba.length));
    return false;
  }
  return timingSafeEqual(ba, bb);
}

const keyCache = new Map<string, Buffer>();

/** Asosiy ma'lumot kalitidan maqsadga qarab alohida kalit hosil qilish (HKDF-SHA256) */
function deriveKey(info: string): Buffer {
  const cacheKey = `${secretsVersion()}:${info}`;
  const cached = keyCache.get(cacheKey);
  if (cached) return cached;
  const key = Buffer.from(hkdfSync('sha256', getSecrets().data, 'erizon-mall', info, 32));
  keyCache.set(cacheKey, key);
  return key;
}

/** AES-256-GCM bilan shifrlash (2FA sirlari va h.k. ma'lumotlar bazasida ochiq saqlanmasligi uchun) */
export function encrypt(plain: string, purpose = 'data'): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(`enc:${purpose}`), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`;
}

export function decrypt(payload: string, purpose = 'data'): string {
  const [v, iv, tag, data] = payload.split('.');
  if (v !== 'v1' || !iv || !tag || !data) throw new Error('Invalid ciphertext');
  const decipher = createDecipheriv('aes-256-gcm', deriveKey(`enc:${purpose}`), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}

export function md5(input: string): string {
  return createHash('md5').update(input).digest('hex');
}
