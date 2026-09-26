import { getEnv } from '../env.js';
import type { OrderRecord } from '../models.js';

/**
 * To'lov sahifasiga yo'naltirish havolasi. To'lov natijasi FAQAT server-to-server
 * webhook orqali (server/routes/payments.ts) tasdiqlanadi — brauzerdagi "muvaffaqiyatli"
 * sahifaga hech qachon ishonilmaydi.
 */
export function paymentUrl(order: OrderRecord, returnUrl: string): string | undefined {
  const env = getEnv();
  if (order.paymentMethod === 'payme' && env.payme) {
    const params = `m=${env.PAYME_MERCHANT_ID};ac.order_id=${order.id};a=${order.total * 100};c=${returnUrl}`;
    const host = env.PAYME_TEST ? 'https://test.paycom.uz' : 'https://checkout.paycom.uz';
    return `${host}/${Buffer.from(params).toString('base64')}`;
  }
  if (order.paymentMethod === 'click' && env.click) {
    const q = new URLSearchParams({
      service_id: env.CLICK_SERVICE_ID ?? '',
      merchant_id: env.CLICK_MERCHANT_ID ?? '',
      amount: String(order.total),
      transaction_param: order.id,
      return_url: returnUrl,
    });
    return `https://my.click.uz/services/pay?${q.toString()}`;
  }
  return undefined;
}

export function paymentConfigured(method: OrderRecord['paymentMethod']): boolean {
  const env = getEnv();
  if (method === 'cash') return true;
  return method === 'payme' ? env.payme : env.click;
}
