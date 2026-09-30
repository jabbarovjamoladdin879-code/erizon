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
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-xl font-extrabold tabular-nums ring-1 ring-inset ring-white/15 backdrop-blur sm:h-14 sm:w-14 sm:text-2xl">
        {pad2(value)}
      </span>
      <span className="mt-1 text-[10px] uppercase tracking-wide text-white/75">{label}</span>
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
      className="relative mt-6 animate-fade-up overflow-hidden rounded-4xl bg-gradient-to-br from-slate-950 via-brand-950 to-brand-800 p-5 text-white shadow-lift ring-1 ring-white/10 sm:p-8"
      aria-labelledby="deal-title"
    >
      {/* Dekorativ yorug'lik dog'lari */}
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-fuchsia-500/30 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-accent-500/20 blur-3xl" aria-hidden="true" />
      <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto]">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link to={`/product/${product.id}`} className="shrink-0" tabIndex={-1} aria-hidden="true">
            <ProductImage emoji={product.emoji} hue={product.hue} alt="" className="h-28 w-28 rounded-3xl shadow-lift ring-4 ring-white/10 sm:h-36 sm:w-36" />
          </Link>
          <div className="min-w-0">
            <p id="deal-title" className="inline-flex items-center gap-1.5 rounded-full bg-accent-gradient px-3 py-1 text-xs font-bold uppercase tracking-wide shadow-glow-accent">
              <Flame className="h-3.5 w-3.5" aria-hidden="true" />
              {t('deal.title')} · −{off}%
            </p>
            <Link to={`/product/${product.id}`} className="mt-2 block text-lg font-bold hover:underline sm:text-2xl">
              {product.name}
            </Link>
            <PriceTag price={deal.dealPrice} oldPrice={oldPrice} unit={product.unit} className="mt-1 [&_span]:!text-white" />
          </div>
        </div>
        <div className="flex flex-col items-start gap-4 md:items-end">
          <div>
            <p className="mb-2 text-sm text-white/80" aria-live="off">
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
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-accent-gradient px-6 text-sm font-bold text-white shadow-glow-accent transition hover:brightness-110 active:scale-[0.97] disabled:opacity-50"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            {product.inStock ? t('product.addToCart') : t('product.outOfStock')}
          </button>
        </div>
      </div>
    </section>
  );
}
