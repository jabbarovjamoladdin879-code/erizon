import { getEnv } from '../env.js';
import { maskPhone } from '../lib/crypto.js';

/**
 * SMS yuborish. SMS_PROVIDER=eskiz bo'lsa — Eskiz.uz orqali, aks holda (dev) konsolga yoziladi.
 * Eskiz tokeni instansiya xotirasida keshlanadi.
 */
let eskizToken: { value: string; expires: number } | null = null;

async function eskizAuth(): Promise<string> {
  const env = getEnv();
  if (eskizToken && eskizToken.expires > Date.now()) return eskizToken.value;
  const body = new FormData();
  body.set('email', env.ESKIZ_EMAIL ?? '');
  body.set('password', env.ESKIZ_PASSWORD ?? '');
  const res = await fetch('https://notify.eskiz.uz/api/auth/login', { method: 'POST', body, signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Eskiz auth failed: ${res.status}`);
  const json = (await res.json()) as { data?: { token?: string } };
  const token = json.data?.token;
  if (!token) throw new Error('Eskiz auth: no token');
  eskizToken = { value: token, expires: Date.now() + 25 * 86_400_000 };
  return token;
}

export async function sendSms(phone: string, message: string): Promise<void> {
  const env = getEnv();
  if (env.SMS_PROVIDER !== 'eskiz') {
    if (!env.isProd) console.info(`[sms:dev] ${maskPhone(phone)}: ${message}`);
    return;
  }
  const token = await eskizAuth();
  const body = new FormData();
  body.set('mobile_phone', phone.replace(/^\+/, ''));
  body.set('message', message);
  body.set('from', env.ESKIZ_FROM);
  const res = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) {
    if (res.status === 401) eskizToken = null;
    throw new Error(`Eskiz send failed: ${res.status}`);
  }
}
