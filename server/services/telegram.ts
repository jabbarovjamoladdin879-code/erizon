import { ZONE_MAP } from '../../shared/zones.js';
import { formatSum } from '../../shared/describe.js';
import { getEnv } from '../env.js';
import type { OrderRecord } from '../models.js';

/**
 * Yangi buyurtma haqida do'kon xodimlariga Telegram xabari.
 * TELEGRAM_BOT_TOKEN va TELEGRAM_CHAT_ID berilmasa — hech narsa qilinmaydi.
 * Xato bo'lsa buyurtma bekor qilinmaydi (faqat logga yoziladi).
 */
export async function notifyNewOrder(order: OrderRecord): Promise<void> {
  const env = getEnv();
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  const method = { delivery: 'Yetkazib berish', pickup: "O'zi olib ketish", quick: '1 klik (operator qo\'ng\'iroq qiladi)' }[order.deliveryMethod];
  const lines = order.lines.map((l) => `• ${l.name} × ${l.qty}${l.optionsLabel ? ` (${l.optionsLabel})` : ''} — ${formatSum(l.lineTotal)}`);
  const text = [
    `🛒 Yangi buyurtma ${order.id}`,
    `👤 ${order.customerName}, ${order.phone}`,
    `🚚 ${method}${order.zoneId ? `: ${ZONE_MAP[order.zoneId]?.name ?? ''}` : ''}${order.address ? `, ${order.address}` : ''}`,
    `🕒 ${order.deliveryTime === 'asap' ? 'Imkon qadar tez' : order.deliveryTime}`,
    `💳 ${order.paymentMethod}`,
    ...lines,
    `Jami: ${formatSum(order.total)}`,
    order.comment ? `💬 ${order.comment}` : '',
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 3900);
  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(2500),
    });
  } catch (err) {
    console.error('[telegram] send failed', err instanceof Error ? err.message : 'unknown');
  }
}
