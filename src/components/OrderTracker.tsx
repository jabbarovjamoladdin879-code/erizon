import { motion } from 'framer-motion';
import { Bike, CheckCircle2, ChefHat, ClipboardCheck, Clock, PackageCheck, XCircle } from 'lucide-react';
import { useCountdown } from '@/hooks/useNow';
import { useT } from '@/hooks/useT';
import { STATUS_FLOW } from '@/store/orderStore';
import type { Order, OrderStatus } from '@/types';
import { cn } from '@/utils/cn';
import { pad2 } from '@/utils/format';

const ICONS: Record<Exclude<OrderStatus, 'cancelled'>, typeof Bike> = {
  accepted: ClipboardCheck,
  preparing: ChefHat,
  on_the_way: Bike,
  delivered: CheckCircle2,
};

/** Buyurtma holati (server ma'lumoti): Qabul qilindi → Tayyorlanmoqda → Yo'lda → Yetkazildi + ETA taymer */
export function OrderTracker({ order }: { order: Order }) {
  const t = useT();
  const pickup = order.deliveryMethod === 'pickup';
  const { hours, minutes, seconds, done } = useCountdown(order.status === 'delivered' || order.status === 'cancelled' ? null : order.etaAt);

  const label = (s: OrderStatus) => (s === 'on_the_way' && pickup ? t('status.ready') : t(`status.${s}`));

  if (order.status === 'cancelled') {
    return (
      <div className="mt-4 flex items-center gap-3 rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-950 dark:text-red-300" role="status">
        <XCircle className="h-6 w-6" aria-hidden="true" />
        <b>{t('status.cancelled')}</b>
      </div>
    );
  }

  const currentIdx = STATUS_FLOW.indexOf(order.status);
  const progress = currentIdx / (STATUS_FLOW.length - 1);
  const at = (s: OrderStatus) => order.statusHistory.find((h) => h.status === s)?.at;

  return (
    <div role="status" aria-live="polite" aria-label={`${t('track.status')}: ${label(order.status)}`}>
      {order.status !== 'delivered' && (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-brand-50 p-4 dark:bg-brand-950/50">
          <Clock className="h-6 w-6 shrink-0 text-brand-600" aria-hidden="true" />
          <div>
            <div className="muted text-xs">{pickup ? t('track.readyIn') : t('track.arrivesIn')}</div>
            <div className="text-xl font-bold tabular-nums">
              {done ? t('track.anyMinute') : `${hours > 0 ? `${pad2(hours)}:` : ''}${pad2(minutes)}:${pad2(seconds)}`}
            </div>
          </div>
        </div>
      )}
      <div className="relative mx-5 mb-2 mt-6 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-brand-600"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <ol className="mt-4 grid grid-cols-4 gap-2 text-center">
        {STATUS_FLOW.map((s, i) => {
          const Icon = s === 'on_the_way' && pickup ? PackageCheck : ICONS[s as Exclude<OrderStatus, 'cancelled'>];
          const reached = i <= currentIdx;
          const isCurrent = i === currentIdx;
          const time = at(s);
          return (
            <li key={s} className="flex flex-col items-center gap-1.5" aria-current={isCurrent ? 'step' : undefined}>
              <motion.span
                animate={isCurrent && s !== 'delivered' ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                transition={isCurrent ? { repeat: Infinity, duration: 1.6 } : undefined}
                className={cn('grid h-11 w-11 place-items-center rounded-xl', reached ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800')}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </motion.span>
              <span className={cn('text-xs font-semibold leading-tight', reached ? 'text-slate-900 dark:text-white' : 'text-slate-400')}>{label(s)}</span>
              {time && (
                <span className="muted text-[10px] tabular-nums">
                  {new Date(time).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
