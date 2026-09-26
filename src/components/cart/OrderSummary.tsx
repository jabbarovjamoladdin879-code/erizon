import type { ReactNode } from 'react';
import { Coins, Loader2, ShieldCheck, Truck } from 'lucide-react';
import { CASHBACK_PERCENT } from '@/data/options';
import { FREE_DELIVERY_THRESHOLD } from '@/data/zones';
import { usePrice, useT } from '@/hooks/useT';
import { useCartStore } from '@/store/cartStore';
import type { PublicUser, Quote } from '@/types';

interface Props {
  quote: Quote | null;
  /** Server javobi kelguncha ko'rsatiladigan lokal oraliq summa */
  fallbackSubtotal: number;
  loading: boolean;
  user: PublicUser | null;
  showDelivery: boolean;
  deliveryKnown: boolean;
  children?: ReactNode;
}

export function OrderSummary({ quote, fallbackSubtotal, loading, user, showDelivery, deliveryKnown, children }: Props) {
  const t = useT();
  const fmt = usePrice();
  const useBonus = useCartStore((s) => s.useBonus);
  const setUseBonus = useCartStore((s) => s.setUseBonus);
  const subtotal = quote?.subtotal ?? fallbackSubtotal;
  const discount = quote?.discount ?? 0;
  const left = FREE_DELIVERY_THRESHOLD - (subtotal - discount);
  const total = quote?.total ?? fallbackSubtotal;

  return (
    <div className="card space-y-4 p-5">
      <h2 className="flex items-center justify-between text-lg font-bold">
        {t('cart.summary')}
        {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-label={t('common.loading')} />}
      </h2>
      {children}
      {user ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-brand-50 p-3 text-sm dark:bg-brand-950/50">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 accent-brand-600"
            checked={useBonus}
            disabled={!quote || quote.maxBonus <= 0}
            onChange={(e) => setUseBonus(e.target.checked)}
          />
          <span>
            <span className="flex items-center gap-1.5 font-semibold">
              <Coins className="h-4 w-4 text-amber-500" aria-hidden="true" />
              {t('bonus.use', { n: fmt(quote?.maxBonus ?? 0) })}
            </span>
            <span className="muted text-xs">{t('bonus.balance', { n: fmt(user.bonus) })}</span>
          </span>
        </label>
      ) : (
        <p className="muted rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800">{t('bonus.loginHint', { p: CASHBACK_PERCENT })}</p>
      )}
      <dl className="space-y-2 text-sm" aria-busy={loading}>
        <div className="flex justify-between">
          <dt className="muted">{t('cart.subtotal')}</dt>
          <dd className="font-semibold">{fmt(subtotal)}</dd>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
            <dt>{t('cart.discount')}</dt>
            <dd className="font-semibold">−{fmt(discount)}</dd>
          </div>
        )}
        {!!quote?.bonusUsed && (
          <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
            <dt>{t('cart.bonusUsed')}</dt>
            <dd className="font-semibold">−{fmt(quote.bonusUsed)}</dd>
          </div>
        )}
        {showDelivery && (
          <div className="flex justify-between">
            <dt className="muted">{t('cart.delivery')}</dt>
            <dd className="font-semibold">
              {!deliveryKnown ? t('cart.deliveryUnknown') : !quote || quote.deliveryFee === 0 ? t('cart.free') : fmt(quote.deliveryFee)}
            </dd>
          </div>
        )}
      </dl>
      {showDelivery && left > 0 && subtotal > 0 && (
        <p className="flex items-center gap-2 rounded-xl bg-sky-50 p-3 text-xs text-sky-800 dark:bg-sky-950/50 dark:text-sky-300">
          <Truck className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t('cart.freeLeft', { sum: fmt(left) })}
        </p>
      )}
      <div className="flex items-end justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
        <span className="font-bold">{t('cart.total')}</span>
        <span className="text-2xl font-extrabold tabular-nums">{fmt(total)}</span>
      </div>
      <p className="muted flex items-center gap-1.5 text-[11px]">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
        {t('cart.serverPrice')}
      </p>
      {user && !!quote?.bonusEarned && (
        <p className="text-xs text-amber-700 dark:text-amber-400">{t('bonus.earn', { n: fmt(quote.bonusEarned) })}</p>
      )}
    </div>
  );
}
