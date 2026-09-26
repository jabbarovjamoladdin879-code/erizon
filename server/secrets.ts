import { randomBytes } from 'node:crypto';
import { getSetting, setSetting } from './db.js';
import { getEnv } from './env.js';

/**
 * Maxfiy kalitlar (JWT imzosi va ma'lumotlarni shifrlash).
 * - Env'da berilgan bo'lsa (JWT_SECRET, DATA_SECRET) — o'sha ishlatiladi (tavsiya etiladi);
 * - aks holda birinchi ishga tushishda kriptografik tasodifiy 64 baytli kalitlar yaratiladi
 *   va bazaning `settings` jadvalida saqlanadi. Kodda hech qanday kalit yozilmagan.
 */
export interface Secrets {
  jwt: string;
  data: string;
}

let current: Secrets | null = null;
let version = 0;

export function loadSecrets(): void {
  const env = getEnv();
  let stored = getSetting<Secrets>('secrets');
  if (!stored || typeof stored.jwt !== 'string' || stored.jwt.length < 32 || typeof stored.data !== 'string' || stored.data.length < 32) {
    stored = { jwt: randomBytes(48).toString('base64url'), data: randomBytes(48).toString('base64url') };
    setSetting('secrets', stored);
  }
  current = { jwt: env.JWT_SECRET ?? stored.jwt, data: env.DATA_SECRET ?? stored.data };
  version += 1;
}

export function getSecrets(): Secrets {
  if (!current) throw new Error('Secrets not loaded');
  return current;
}

/** Kalitlar qayta yuklanganda hosila kalitlar keshini yangilash uchun */
export function secretsVersion(): number {
  return version;
}
