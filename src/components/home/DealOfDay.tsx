import { Link } from 'react-router-dom';
import { Flame, ShoppingCart } from 'lucide-react';
import { PriceTag } from '@/components/ui/PriceTag';
import { ProductImage } from '@/components/ui/ProductImage';
import { useCountdown } from '@/hooks/useNow';
import { useProductActions } from '@/hooks/useProductActions';
import { useT } from '@/hooks/useT';
import { useCatalogStore, useProduct } from '@/store/catalogStore';
import { discountPercent, pad2 } from '@/utils/format';

function TimeBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="grid h-12 w-12 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-xl font-bold tabular-nums text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 sm:h-14 sm:w-14 sm:text-2xl">
        {pad2(value)}
      </span>
      <span className="muted mt-1 text-[10px] uppercase tracking-wide">{label}</span>
    </div>
  );
}

/** Kun aksiyasi — teskari sanoq; vaqt tugaganda blok avtomatik yopiladi */
export function DealOfDay() {
  const t = useT();
  const deal = useCatalogStore((s) => s.deal);
  const product = useProduct(deal?.productId);
  const { hours, minutes, seconds, done } = useCountdown(deal?.endsAt);
  const { addToCart } = useProductActions();

  if (!deal || !product || done || deal.dealPrice >= product.price) return null;
  const oldPrice = product.oldPrice ?? product.price;
  const off = discountPercent(deal.dealPrice, oldPrice);

  return (
    <section
      className="card mt-6 border-l-4 border-l-accent-500 p-5 sm:p-8"
      aria-labelledby="deal-title"
    >
      <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link to={`/product/${product.id}`} className="shrink-0" tabIndex={-1} aria-hidden="true">
            <ProductImage icon={product.icon} hue={product.hue} alt="" className="h-28 w-28 rounded-lg border border-slate-200 dark:border-slate-700 sm:h-36 sm:w-36" />
          </Link>
          <div className="min-w-0">
            <p id="deal-title" className="inline-flex items-center gap-1.5 rounded-md bg-accent-500 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              <Flame className="h-3.5 w-3.5" aria-hidden="true" />
              {t('deal.title')} · −{off}%
            </p>
            <Link to={`/product/${product.id}`} className="mt-2 block text-lg font-bold hover:text-brand-700 dark:hover:text-brand-300 sm:text-2xl">
              {product.name}
            </Link>
            <PriceTag price={deal.dealPrice} oldPrice={oldPrice} unit={product.unit} className="mt-1" />
          </div>
        </div>
        <div className="flex flex-col items-start gap-4 md:items-end">
          <div>
            <p className="muted mb-2 text-sm" aria-live="off">
              {t('deal.endsIn', { time: `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}` })}
            </p>
            <div className="flex gap-2" aria-hidden="true">
              <TimeBox value={hours} label={t('time.h')} />
              <TimeBox value={minutes} label={t('time.m')} />
              <TimeBox value={seconds} label={t('time.s')} />
            </div>
          </div>
          <button
            type="button"
            disabled={!product.inStock}
            onClick={() => addToCart(product)}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            {product.inStock ? t('product.addToCart') : t('product.outOfStock')}
          </button>
        </div>
      </div>
    </section>
  );
}
