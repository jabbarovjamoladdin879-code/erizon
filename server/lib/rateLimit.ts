import { get, run } from '../db.js';
import { hmac } from './crypto.js';
import { tooMany } from './errors.js';

/**
 * "Fixed window" rate limiter — hisoblagichlar SQLite'da saqlanadi (server qayta ishga
 * tushsa ham cheklov saqlanadi). Bitta atomik UPSERT: oyna tugagan bo'lsa hisob 1 dan boshlanadi.
 * Identifikatorlar (IP, telefon) bazaga HMAC xeshi ko'rinishida yoziladi.
 */
function key(bucket: string, identity: string): string {
  return `${bucket}:${hmac(identity, 'ratelimit').slice(0, 32)}`;
}

export function hit(bucket: string, identity: string, limit: number, windowSec: number): { ok: boolean; retryAfter: number; count: number } {
  const now = Date.now();
  const id = key(bucket, identity);
  run(
    `INSERT INTO rate_limits (id, count, expires_at) VALUES (?, 1, ?)
     ON CONFLICT(id) DO UPDATE SET
       count = CASE WHEN rate_limits.expires_at > ? THEN rate_limits.count + 1 ELSE 1 END,
       expires_at = CASE WHEN rate_limits.expires_at > ? THEN rate_limits.expires_at ELSE excluded.expires_at END`,
    [id, now + windowSec * 1000, now, now],
  );
  const row = get<{ count: number; expires_at: number }>('SELECT count, expires_at FROM rate_limits WHERE id = ?', [id]);
  const count = row?.count ?? 1;
  const retryAfter = Math.max(1, Math.ceil(((row?.expires_at ?? now) - now) / 1000));
  return { ok: count <= limit, retryAfter, count };
}

/** Chegaradan oshsa 429 xato tashlaydi */
export function enforce(bucket: string, identity: string, limit: number, windowSec: number, code = 'v.tooMany'): void {
  const r = hit(bucket, identity, limit, windowSec);
  if (!r.ok) throw tooMany(r.retryAfter, code);
}

export function resetLimit(bucket: string, identity: string): void {
  run('DELETE FROM rate_limits WHERE id = ?', [key(bucket, identity)]);
}
