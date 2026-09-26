import { useEffect, useRef, useState } from 'react';
import { Loader2, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { usePrice, useT } from '@/hooks/useT';
import { isTKey } from '@/i18n';
import { useCartStore } from '@/store/cartStore';
import { toast } from '@/store/toastStore';
import type { Quote } from '@/types';
import { normalizePromoCode } from '@/utils/pricing';

interface Props {
  promo: Quote['promo'];
  loading: boolean;
}

/** Promokod maydoni. Tekshiruv faqat serverda (promokodlar ro'yxati brauzerga yuborilmaydi). */
export function PromoBox({ promo, loading }: Props) {
  const t = useT();
  const fmt = usePrice();
  const promoCode = useCartStore((s) => s.promoCode);
  const setPromo = useCartStore((s) => s.setPromo);
  const [input, setInput] = useState('');
  const announced = useRef<string | null>(null);

  // Yangi qo'llangan kod server tomonidan tasdiqlanganda bir marta xabar beramiz
  useEffect(() => {
    if (promo?.ok && promo.code === promoCode && announced.current !== promo.code) {
      announced.current = promo.code;
      toast.success(t('toast.promoApplied'));
    }
  }, [promo, promoCode, t]);

  const apply = () => {
    const code = normalizePromoCode(input);
    if (code.length < 3) return;
    setPromo(code);
    setInput('');
  };

  if (promoCode) {
    const matches = promo?.code === promoCode;
    const invalid = matches && !promo.ok;
    const message = invalid
      ? promo.error === 'promo.minOrder'
        ? t('promo.minOrder', { sum: fmt(promo.minOrder ?? 0) })
        : promo.error && isTKey(promo.error)
          ? t(promo.error)
          : t('promo.notFound')
      : null;
    return (
      <div className={invalid ? 'rounded-xl bg-amber-50 p-3 dark:bg-amber-950/50' : 'rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/50'}>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            {loading && !matches ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Tag className="h-4 w-4" aria-hidden="true" />}
            {promoCode}
          </span>
          <button type="button" onClick={() => setPromo(null)} className="rounded-md p-1 text-slate-500 hover:text-red-600" aria-label={t('promo.remove')}>
            <X className="h-4 w-4" />
          </button>
        </div>
        {message && (
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-300" role="alert">
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="promo" className="label">
        {t('promo.label')}
      </label>
      <div className="flex gap-2">
        <input
          id="promo"
          className="input uppercase"
          value={input}
          maxLength={20}
          autoComplete="off"
          placeholder="ERIZON10"
          onChange={(e) => setInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              apply();
            }
          }}
        />
        <Button variant="secondary" onClick={apply} disabled={input.length < 3}>
          {t('promo.apply')}
        </Button>
      </div>
    </div>
  );
}
