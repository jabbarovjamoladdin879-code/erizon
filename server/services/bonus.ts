import type { BonusEntry } from '../../shared/types.js';
import { newId, run, tx } from '../db.js';

/**
 * Bonus balansi o'zgarishlari faqat shu yerda: atomik UPDATE + jurnal yozuvi (bitta tranzaksiya).
 * Yechish faqat balans yetarli bo'lsa bajariladi — parallel so'rovlarda ikki marta sarflab bo'lmaydi.
 */
export function changeBonus(userId: string, delta: number, reason: BonusEntry['reason'], orderId?: string): boolean {
  if (!Number.isInteger(delta) || delta === 0) return true;
  return tx(() => {
    const now = Date.now();
    const changed =
      delta < 0
        ? run('UPDATE users SET bonus = bonus + ?, updated_at = ? WHERE id = ? AND bonus >= ?', [delta, now, userId, -delta])
        : run('UPDATE users SET bonus = bonus + ?, updated_at = ? WHERE id = ?', [delta, now, userId]);
    if (changed === 0) return false;
    run('INSERT INTO bonus_ledger (id, user_id, delta, reason, order_id, created_at) VALUES (?, ?, ?, ?, ?, ?)', [newId(), userId, delta, reason, orderId ?? null, now]);
    return true;
  });
}
