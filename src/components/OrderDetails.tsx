import { ZONE_MAP } from '@/data/zones';
import { usePrice, useT } from '@/hooks/useT';
import { useUiStore } from '@/store/uiStore';
import type { Order } from '@/types';
import { formatDateTime, formatQty } from '@/utils/format';
import { displayPhone } from '@/utils/phone';

export function OrderDetails({ order }: { order: Order }) {
  const t = useT();
  const fmt = usePrice();
  const lang = useUiStore((s) => s.lang);
  const zone = order.zoneId ? ZONE_MAP[order.zoneId] : undefined;
  const method = order.deliveryMethod === 'quick' ? t('checkout.quick') : t(`checkout.${order.deliveryMethod}`);

  return (
    <div className="space-y-4 text-sm">
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <div><dt className="muted text-xs">{t('order.date')}</dt><dd className="font-medium">{formatDateTime(order.createdAt, lang)}</dd></div>
        <div><dt className="muted text-xs">{t('form.name')}</dt><dd className="font-medium">{order.customerName}</dd></div>
        <div><dt className="muted text-xs">{t('form.phone')}</dt><dd className="font-medium">{displayPhone(order.phone)}</dd></div>
        <div><dt className="muted text-xs">{t('checkout.method')}</dt><dd className="font-medium">{method}</dd></div>
        {zone && <div><dt className="muted text-xs">{t('checkout.zone')}</dt><dd className="font-medium">{zone.name}</dd></div>}
        {order.address && <div><dt className="muted text-xs">{t('checkout.address')}</dt><dd className="font-medium">{order.address}</dd></div>}
        <div><dt className="muted text-xs">{t('checkout.time')}</dt><dd className="font-medium">{order.deliveryTime === 'asap' ? t('checkout.asap') : order.deliveryTime}</dd></div>
        <div>
          <dt className="muted text-xs">{t('checkout.payment')}</dt>
          <dd className="font-medium">
            {t(`pay.${order.paymentMethod}`)} ·{' '}
            <span className={order.paymentStatus === 'paid' ? 'text-emerald-600' : order.paymentStatus === 'cancelled' ? 'text-red-600' : 'text-amber-600'}>
              {t(`payStatus.${order.paymentStatus}`)}
            </span>
          </dd>
        </div>
        {order.comment && <div className="sm:col-span-2"><dt className="muted text-xs">{t('checkout.comment')}</dt><dd className="whitespace-pre-line font-medium">{order.comment}</dd></div>}
      </dl>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {order.lines.map((l, i) => (
          <li key={`${l.refId}-${i}`} className="flex justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <div className="font-medium">{l.name}</div>
              {l.optionsLabel && <div className="muted text-xs">{l.optionsLabel}</div>}
              <div className="muted text-xs">
                {formatQty(l.qty)} {t(`unit.${l.unit}`)} × {fmt(l.unitPrice)}
              </div>
            </div>
            <div className="shrink-0 font-semibold">{fmt(l.lineTotal)}</div>
          </li>
        ))}
      </ul>
      <dl className="space-y-1.5">
        <div className="flex justify-between"><dt className="muted">{t('cart.subtotal')}</dt><dd>{fmt(order.subtotal)}</dd></div>
        {order.discount > 0 && <div className="flex justify-between text-emerald-700 dark:text-emerald-400"><dt>{t('cart.discount')} {order.promoCode && `(${order.promoCode})`}</dt><dd>−{fmt(order.discount)}</dd></div>}
        {order.bonusUsed > 0 && <div className="flex justify-between text-emerald-700 dark:text-emerald-400"><dt>{t('cart.bonusUsed')}</dt><dd>−{fmt(order.bonusUsed)}</dd></div>}
        {order.deliveryMethod === 'delivery' && <div className="flex justify-between"><dt className="muted">{t('cart.delivery')}</dt><dd>{order.deliveryFee ? fmt(order.deliveryFee) : t('cart.free')}</dd></div>}
        <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-extrabold dark:border-slate-800"><dt>{t('cart.total')}</dt><dd>{fmt(order.total)}</dd></div>
        {order.bonusEarned > 0 && <div className="flex justify-between text-xs text-amber-700 dark:text-amber-400"><dt>{t('bonus.earned')}</dt><dd>+{fmt(order.bonusEarned)}</dd></div>}
      </dl>
    </div>
  );
}
