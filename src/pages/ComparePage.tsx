import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { GitCompareArrows, ShoppingCart, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProductImage } from '@/components/ui/ProductImage';
import { Stars } from '@/components/ui/Stars';
import { COMPARE_MAX } from '@/data/options';
import { needsSelection, useProductActions } from '@/hooks/useProductActions';
import { useSeo } from '@/hooks/useSeo';
import { usePrice, useT } from '@/hooks/useT';
import { useCatalogStore, useProductMap } from '@/store/catalogStore';
import { useListsStore } from '@/store/listsStore';
import type { Product } from '@/types';
import { discountPercent } from '@/utils/format';
import { getEffectivePrice } from '@/utils/pricing';

export default function ComparePage() {
  const t = useT();
  const fmt = usePrice();
  useSeo(t('nav.compare'));
  const ids = useListsStore((s) => s.compare);
  const remove = useListsStore((s) => s.removeCompare);
  const clear = useListsStore((s) => s.clearCompare);
  const map = useProductMap();
  const deal = useCatalogStore((s) => s.deal);
  const { addToCart } = useProductActions();

  const products = useMemo(() => ids.map((id) => map.get(id)).filter((p): p is Product => !!p), [ids, map]);

  const rows = useMemo(() => {
    const now = Date.now();
    const specKeys = Array.from(new Set(products.flatMap((p) => Object.keys(p.specs ?? {}))));
    const priceOf = (p: Product) => getEffectivePrice(p, deal, now);
    const minPrice = Math.min(...products.map((p) => priceOf(p).price));
    const maxRating = Math.max(...products.map((p) => p.rating));
    const base: Array<{ label: string; render: (p: Product) => ReactNode; best?: (p: Product) => boolean }> = [
      {
        label: t('compare.price'),
        render: (p) => <span className="font-bold">{fmt(priceOf(p).price)}{p.unit === 'kg' ? ` / ${t('unit.kg')}` : ''}</span>,
        best: (p) => products.length > 1 && priceOf(p).price === minPrice,
      },
      { label: t('compare.discount'), render: (p) => { const d = discountPercent(priceOf(p).price, priceOf(p).oldPrice); return d ? `−${d}%` : '—'; } },
      {
        label: t('compare.rating'),
        render: (p) => (
          <span className="inline-flex items-center gap-1.5"><Stars value={p.rating} /> {p.rating.toFixed(1)}</span>
        ),
        best: (p) => products.length > 1 && p.rating === maxRating,
      },
      { label: t('compare.reviews'), render: (p) => p.reviewsCount },
      { label: t('product.category'), render: (p) => t(`cat.${p.categoryId}`) },
      { label: t('product.unit'), render: (p) => t(`unit.${p.unit}`) },
      { label: t('compare.stock'), render: (p) => (p.inStock ? t('product.inStock') : t('product.outOfStock')) },
      { label: t('badge.halal'), render: (p) => (p.halal ? '✓' : '—') },
      { label: t('product.manufacturer'), render: (p) => p.manufacturer ?? '—' },
      { label: t('product.expiry'), render: (p) => p.expiry ?? '—' },
      ...specKeys.map((k) => ({ label: k, render: (p: Product) => p.specs?.[k] ?? '—' })),
    ];
    return base;
  }, [products, deal, fmt, t]);

  if (products.length === 0) {
    return (
      <div className="container-page py-8">
        <EmptyState
          icon={GitCompareArrows}
          titleAs="h1"
          title={t('compare.empty')}
          text={t('compare.emptyText', { n: COMPARE_MAX })}
          action={<Link to="/catalog" className="inline-flex h-11 items-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700">{t('nav.catalog')}</Link>}
        />
      </div>
    );
  }

  return (
    <div className="container-page py-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">
          {t('nav.compare')} <span className="muted text-base font-medium">({products.length}/{COMPARE_MAX})</span>
        </h1>
        <Button variant="ghost" size="sm" onClick={clear}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {t('compare.clear')}
        </Button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <caption className="sr-only">{t('nav.compare')}</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 w-28 bg-white p-3 text-left align-bottom text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 sm:w-40 sm:p-4">{t('compare.feature')}</th>
              {products.map((p) => (
                <th key={p.id} scope="col" className="relative p-4 text-left align-top font-normal">
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-slate-500 hover:text-red-600 dark:bg-slate-800"
                    aria-label={`${t('common.remove')}: ${p.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <Link to={`/product/${p.id}`} className="block">
                    <ProductImage emoji={p.emoji} hue={p.hue} alt="" className="mb-2 h-24 w-24 rounded-xl" />
                    <span className="line-clamp-2 font-semibold hover:text-brand-700">{p.name}</span>
                  </Link>
                  {needsSelection(p) ? (
                    <Link to={`/product/${p.id}`} className="mt-2 inline-flex h-9 items-center rounded-lg bg-brand-50 px-3 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-200">
                      {t('product.choose')}
                    </Link>
                  ) : (
                    <Button size="sm" className="mt-2" disabled={!p.inStock} onClick={() => addToCart(p)}>
                      <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                      {t('product.toCart')}
                    </Button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-slate-100 dark:border-slate-800">
                <th scope="row" className="sticky left-0 z-10 bg-white p-3 text-left text-xs font-medium text-slate-500 dark:bg-slate-900 sm:p-4 sm:text-sm">{row.label}</th>
                {products.map((p) => (
                  <td key={p.id} className={row.best?.(p) ? 'bg-emerald-50 p-4 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'p-4'}>
                    {row.render(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
