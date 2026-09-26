/**
 * Frontend-darajadagi kriptografik yordamchilar (Web Crypto API).
 *
 * MUHIM: Bu faqat namoyish (mock) uchun. Haqiqiy autentifikatsiya, parol xeshlash
 * va sessiyalarni boshqarish backend qo'shilganda SERVERDA amalga oshirilishi kerak
 * (masalan, Argon2/bcrypt + HttpOnly cookie). Brauzerdagi har qanday tekshiruvni
 * foydalanuvchi chetlab o'tishi mumkin.
 */

function getSubtle(): SubtleCrypto {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto API mavjud emas (HTTPS yoki localhost kerak).');
  }
  return crypto.subtle;
}

export function bytesToHex(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.length % 2 === 0 ? hex : `0${hex}`;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16) || 0;
  return out;
}

export function randomHex(byteLength = 16): string {
  const arr = new Uint8Array(byteLength);
  crypto.getRandomValues(arr);
  return bytesToHex(arr);
}

export function randomId(prefix = ''): string {
  return `${prefix}${Date.now().toString(36)}${randomHex(4)}`;
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await getSubtle().digest('SHA-256', new TextEncoder().encode(text));
  return bytesToHex(digest);
}

const PBKDF2_ITERATIONS = 120_000;

/** Parolni PBKDF2-SHA256 bilan xeshlash. Parolning o'zi hech qayerda saqlanmaydi. */
export async function hashPassword(password: string, saltHex = randomHex(16)): Promise<{ hash: string; salt: string }> {
  const subtle = getSubtle();
  const key = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits(
    { name: 'PBKDF2', salt: hexToBytes(saltHex), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  );
  return { hash: bytesToHex(bits), salt: saltHex };
}

/** Vaqtga bog'liq hujumlarni kamaytirish uchun doimiy vaqtli taqqoslash */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
