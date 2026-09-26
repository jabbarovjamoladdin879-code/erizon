import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/15 text-xl font-extrabold tabular-nums backdrop-blur sm:h-14 sm:w-14 sm:text-2xl">
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
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative mt-6 overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-brand-950 to-brand-800 p-5 text-white sm:p-8"
      aria-labelledby="deal-title"
    >
      <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link to={`/product/${product.id}`} className="shrink-0" tabIndex={-1} aria-hidden="true">
            <ProductImage emoji={product.emoji} hue={product.hue} alt="" className="h-28 w-28 rounded-2xl sm:h-36 sm:w-36" />
          </Link>
          <div className="min-w-0">
            <p id="deal-title" className="inline-flex items-center gap-1.5 rounded-full bg-accent-500 px-3 py-1 text-xs font-bold uppercase tracking-wide">
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
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent-500 px-5 text-sm font-bold text-white transition hover:bg-accent-600 disabled:opacity-50"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            {product.inStock ? t('product.addToCart') : t('product.outOfStock')}
          </button>
        </div>
      </div>
    </motion.section>
  );
}
