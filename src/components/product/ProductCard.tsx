import { memo } from 'react';
import { Link } from 'react-router-dom';
import { GitCompareArrows, Heart, Minus, Plus, ShoppingCart, Timer } from 'lucide-react';
import { PriceTag } from '@/components/ui/PriceTag';
import { ProductImage } from '@/components/ui/ProductImage';
import { Stars } from '@/components/ui/Stars';
import { QTY_MAX, WEIGHT_MAX, WEIGHT_MIN, WEIGHT_STEP } from '@/data/options';
import { defaultOptionsFor, needsSelection, useProductActions } from '@/hooks/useProductActions';
import { useNow } from '@/hooks/useNow';
import { useT } from '@/hooks/useT';
import { useCartStore } from '@/store/cartStore';
import { useCatalogStore } from '@/store/catalogStore';
import { useListsStore } from '@/store/listsStore';
import type { Product } from '@/types';
import { cn } from '@/utils/cn';
import { discountPercent, formatQty } from '@/utils/format';
import { getEffectivePrice, makeCartKey } from '@/utils/pricing';
import { HalalBadge } from './HalalBadge';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = memo(function ProductCard({ product }: ProductCardProps) {
  const t = useT();
  const deal = useCatalogStore((s) => s.deal);
  const isFav = useListsStore((s) => s.favorites.includes(product.id));
  const inCompare = useListsStore((s) => s.compare.includes(product.id));
  const { addToCart, onToggleFavorite, onToggleCompare } = useProductActions();
  const now = useNow(60_000);
  const { price, oldPrice, isDeal } = getEffectivePrice(product, deal, now);
  const off = discountPercent(price, oldPrice);
  const href = `/product/${product.id}`;
  const select = needsSelection(product);
  const weighted = product.unit === 'kg';
  const step = weighted ? WEIGHT_STEP : 1;
  const minQty = weighted ? WEIGHT_MIN : 1;
  const maxQty = weighted ? WEIGHT_MAX : QTY_MAX;
  const cartKey = makeCartKey('product', product.id, defaultOptionsFor(product));
  const inCartQty = useCartStore((s) => s.items.find((i) => i.key === cartKey)?.qty ?? 0);
  const setQty = useCartStore((s) => s.setQty);
  const removeItem = useCartStore((s) => s.remove);

  return (
    <article
      className="card group relative flex flex-col overflow-hidden p-2.5 transition-colors hover:border-slate-300 dark:hover:border-slate-600 sm:p-3"
    >
      <div className="relative overflow-hidden rounded-lg">
        <Link to={href} tabIndex={-1} aria-hidden="true">
          <ProductImage
            icon={product.icon}
            hue={product.hue}
            src={product.images?.[0]}
            alt=""
            className={cn('aspect-square w-full', !product.inStock && 'opacity-50 grayscale')}
          />
        </Link>
        <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1">
          {isDeal && (
            <span className="rounded bg-accent-700 px-1.5 py-0.5 text-[11px] font-semibold text-white">{t('badge.deal')}</span>
          )}
          {off > 0 && !isDeal && (
            <span className="rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">−{off}%</span>
          )}
          {product.halal && <HalalBadge compact />}
        </div>
        <div className="absolute right-2 top-2 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => onToggleFavorite(product)}
            aria-pressed={isFav}
            aria-label={isFav ? t('product.removeFav') : t('product.addFav')}
            className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:text-red-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <Heart className={cn('h-4 w-4', isFav && 'fill-red-500 text-red-500')} />
          </button>
          <button
            type="button"
            onClick={() => onToggleCompare(product)}
            aria-pressed={inCompare}
            aria-label={t('product.compare')}
            className={cn(
              'grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white transition-colors hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900',
              inCompare ? 'text-brand-600 dark:text-brand-300' : 'text-slate-600 dark:text-slate-300',
            )}
          >
            <GitCompareArrows className="h-4 w-4" />
          </button>
        </div>
        {!product.inStock && (
          <span className="absolute inset-x-2 bottom-2 rounded bg-slate-900/80 py-1 text-center text-xs font-semibold text-white">
            {t('product.outOfStock')}
          </span>
        )}
        {product.prepTime && product.inStock && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <Timer className="h-3 w-3" aria-hidden="true" />~{product.prepTime} {t('common.min')}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-1 flex-col px-1">
        <PriceTag price={price} oldPrice={oldPrice} unit={product.unit} size="sm" />
        <Link
          to={href}
          className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-5 text-slate-700 transition-colors hover:text-brand-700 dark:text-slate-200 dark:hover:text-brand-300"
        >
          {product.name}
        </Link>
        <div className="mt-1.5 flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
          <Stars value={product.rating} />
          <span>
            {product.rating.toFixed(1)} · {product.reviewsCount}
          </span>
        </div>
        <div className="mt-auto pt-3">
          {select ? (
            <Link
              to={href}
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-brand-50 text-sm font-semibold text-brand-700 ring-1 ring-inset ring-brand-100 transition hover:bg-brand-100 dark:bg-brand-950/60 dark:text-brand-200 dark:ring-brand-900"
            >
              {t('product.choose')}
            </Link>
          ) : inCartQty > 0 && product.inStock ? (
            <div className="flex h-10 items-center justify-between rounded-xl bg-brand-600 text-white" role="group" aria-label={`${t('qty.label')}: ${product.name}`}>
              <button
                type="button"
                onClick={() => (inCartQty - step < minQty ? removeItem(cartKey) : setQty(cartKey, inCartQty - step))}
                className="grid h-10 w-10 place-items-center rounded-xl transition hover:bg-white/15"
                aria-label={t('qty.decrease')}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-sm font-bold tabular-nums" aria-live="polite">
                {formatQty(inCartQty)} {weighted ? t('unit.kg') : ''}
              </span>
              <button
                type="button"
                onClick={() => setQty(cartKey, Math.min(maxQty, inCartQty + step))}
                disabled={inCartQty >= maxQty}
                className="grid h-10 w-10 place-items-center rounded-xl transition hover:bg-white/15 disabled:opacity-50"
                aria-label={t('qty.increase')}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!product.inStock}
              onClick={() => addToCart(product)}
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-brand-600 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
              aria-label={`${t('product.addToCart')}: ${product.name}`}
            >
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              {product.unit === 'kg' ? t('product.add1kg') : t('product.toCart')}
            </button>
          )}
        </div>
      </div>
    </article>
  );
});
