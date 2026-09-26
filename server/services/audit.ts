import type { Context } from 'hono';
import { newId, run } from '../db.js';
import type { AppEnv } from '../types.js';

/** Admin amallari jurnali (kim, qachon, nima qildi) — 365 kun saqlanadi */
export function audit(c: Context<AppEnv>, action: string, target?: string): void {
  const user = c.get('user');
  if (!user) return;
  run('INSERT INTO audit (id, admin_id, admin_name, action, target, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [
    newId(),
    user.id,
    user.name,
    action,
    target?.slice(0, 120) ?? null,
    c.get('ipHash'),
    Date.now(),
  ]);
}
