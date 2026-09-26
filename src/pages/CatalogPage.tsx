import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchX, SlidersHorizontal, X } from 'lucide-react';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { GridSkeleton } from '@/components/ui/Skeleton';
import { CATEGORIES } from '@/data/categories';
import { useDebounce } from '@/hooks/useDebounce';
import { useSeo } from '@/hooks/useSeo';
import { useSimulatedLoading } from '@/hooks/useSimulatedLoading';
import { useT } from '@/hooks/useT';
import { useCatalogStore } from '@/store/catalogStore';
import { CATEGORY_IDS, GENDERS, type CategoryId, type Gender } from '@/types';
import { cn } from '@/utils/cn';
import { getEffectivePrice } from '@/utils/pricing';
import { sanitizeQuery } from '@/utils/sanitize';
import { buildSearchIndex, searchIndex } from '@/utils/search';

const SORTS = ['popular', 'cheap', 'expensive', 'new', 'rating'] as const;
type Sort = (typeof SORTS)[number];
const PAGE = 12;

function parseMoney(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v.replace(/\D/g, ''));
  return Number.isFinite(n) && n > 0 && n < 1e9 ? n : null;
}

interface FiltersProps {
  cat: CategoryId | null;
  min: number | null;
  max: number | null;
  sale: boolean;
  stock: boolean;
  halal: boolean;
  gender: Gender | null;
  brands: string[];
  brandOptions: Array<{ name: string; count: number }>;
  update: (patch: Record<string, string | null>) => void;
  reset: () => void;
}

function Filters({ cat, min, max, sale, stock, halal, gender, brands, brandOptions, update, reset }: FiltersProps) {
  const t = useT();
  const [minInput, setMinInput] = useState(min ? String(min) : '');
  const [maxInput, setMaxInput] = useState(max ? String(max) : '');
  const dMin = useDebounce(minInput, 600);
  const dMax = useDebounce(maxInput, 600);

  // URL tashqaridan o'zgarsa (masalan, "Filtrlarni tozalash") — maydonlarni sinxronlash.
  // Komponent qayta yaratilmaydi, shuning uchun yozish paytida fokus yo'qolmaydi.
  useEffect(() => {
    setMinInput((cur) => (parseMoney(cur) === min ? cur : min ? String(min) : ''));
    setMaxInput((cur) => (parseMoney(cur) === max ? cur : max ? String(max) : ''));
  }, [min, max]);

  useEffect(() => {
    const nMin = parseMoney(dMin);
    const nMax = parseMoney(dMax);
    if (nMin !== min || nMax !== max) update({ min: nMin ? String(nMin) : null, max: nMax ? String(nMax) : null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- faqat kiritilgan qiymat o'zgarganda
  }, [dMin, dMax]);

  const toggle = (key: string, on: boolean) => update({ [key]: on ? '1' : null });

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-bold">{t('catalog.category')}</legend>
        <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch">
          <button type="button" aria-pressed={!cat} className={cn('chip justify-start', !cat && 'chip-active')} onClick={() => update({ cat: null, sub: null, brand: null })}>
            {t('catalog.all')}
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={cat === c.id}
              className={cn('chip justify-start', cat === c.id && 'chip-active')}
              onClick={() => update({ cat: c.id, sub: null, brand: null })}
            >
              <span aria-hidden="true">{c.emoji}</span> {t(`cat.${c.id}`)}
            </button>
          ))}
        </div>
      </fieldset>
      {cat === 'clothing' && (
        <fieldset>
          <legend className="mb-2 text-sm font-bold">{t('catalog.section')}</legend>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={!gender} className={cn('chip', !gender && 'chip-active')} onClick={() => update({ sub: null })}>
              {t('catalog.all')}
            </button>
            {GENDERS.map((g) => (
              <button key={g} type="button" aria-pressed={gender === g} className={cn('chip', gender === g && 'chip-active')} onClick={() => update({ sub: g })}>
                {t(`gender.${g}`)}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {brandOptions.length > 1 && (
        <fieldset>
          <legend className="mb-2 text-sm font-bold">{t('catalog.brand')}</legend>
          <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
            {brandOptions.map((b) => {
              const on = brands.includes(b.name);
              return (
                <label key={b.name} className="flex cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => {
                      const next = on ? brands.filter((x) => x !== b.name) : [...brands, b.name];
                      update({ brand: next.length ? next.join('|') : null });
                    }}
                    className="h-5 w-5 rounded border-slate-300 accent-brand-600"
                  />
                  <span className="flex-1 truncate">{b.name}</span>
                  <span className="muted text-xs">{b.count}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend className="mb-2 text-sm font-bold">{t('catalog.price')}</legend>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="price-min">{t('catalog.priceFrom')}</label>
          <input id="price-min" inputMode="numeric" maxLength={10} className="input" placeholder={t('catalog.priceFrom')} value={minInput} onChange={(e) => setMinInput(e.target.value.replace(/\D/g, ''))} />
          <span aria-hidden="true">—</span>
          <label className="sr-only" htmlFor="price-max">{t('catalog.priceTo')}</label>
          <input id="price-max" inputMode="numeric" maxLength={10} className="input" placeholder={t('catalog.priceTo')} value={maxInput} onChange={(e) => setMaxInput(e.target.value.replace(/\D/g, ''))} />
        </div>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-bold">{t('catalog.more')}</legend>
        {[
          { key: 'sale', on: sale, label: t('catalog.onSale') },
          { key: 'stock', on: stock, label: t('catalog.inStock') },
          { key: 'halal', on: halal, label: t('catalog.halal') },
        ].map((f) => (
          <label key={f.key} className="flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" checked={f.on} onChange={(e) => toggle(f.key, e.target.checked)} className="h-5 w-5 rounded border-slate-300 accent-brand-600" />
            {f.label}
          </label>
        ))}
      </fieldset>
      <Button variant="outline" block onClick={reset}>
        {t('catalog.reset')}
      </Button>
    </div>
  );
}

export default function CatalogPage() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const products = useCatalogStore((s) => s.products);
  const deal = useCatalogStore((s) => s.deal);
  const [visible, setVisible] = useState(PAGE);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const q = sanitizeQuery(params.get('q') ?? '');
  const catParam = params.get('cat');
  const cat = CATEGORY_IDS.includes(catParam as CategoryId) ? (catParam as CategoryId) : null;
  const min = parseMoney(params.get('min'));
  const max = parseMoney(params.get('max'));
  const sale = params.get('sale') === '1';
  const stock = params.get('stock') === '1';
  const halal = params.get('halal') === '1';
  const subParam = params.get('sub');
  const gender = cat === 'clothing' && GENDERS.includes(subParam as Gender) ? (subParam as Gender) : null;
  const brandParam = params.get('brand') ?? '';
  const brands = useMemo(() => (brandParam ? brandParam.split('|').map((b) => b.slice(0, 80)).slice(0, 20) : []), [brandParam]);
  const sortParam = params.get('sort');
  const sort: Sort = SORTS.includes(sortParam as Sort) ? (sortParam as Sort) : 'popular';

  const title = q ? t('catalog.searchTitle', { q }) : cat ? t(`cat.${cat}`) : t('nav.catalog');
  useSeo(title, t('seo.catalog'));

  const filterKey = params.toString();
  const loading = useSimulatedLoading(350, filterKey);
  useEffect(() => setVisible(PAGE), [filterKey]);

  const index = useMemo(() => buildSearchIndex(products, (p) => t(`cat.${p.categoryId}`)), [products, t]);

  const results = useMemo(() => {
    const now = Date.now();
    let list = q ? searchIndex(index, q) : [...products];
    list = list.filter((p) => {
      const price = getEffectivePrice(p, deal, now);
      if (cat && p.categoryId !== cat) return false;
      if (min !== null && price.price < min) return false;
      if (max !== null && price.price > max) return false;
      if (sale && !price.oldPrice) return false;
      if (stock && !p.inStock) return false;
      if (halal && !p.halal) return false;
      if (gender && p.gender !== gender) return false;
      if (brands.length && !brands.includes(p.manufacturer ?? '')) return false;
      return true;
    });
    if (!q || sortParam) {
      const priceOf = (p: (typeof list)[number]) => getEffectivePrice(p, deal, now).price;
      list.sort((a, b) => {
        switch (sort) {
          case 'cheap':
            return priceOf(a) - priceOf(b);
          case 'expensive':
            return priceOf(b) - priceOf(a);
          case 'new':
            return Date.parse(b.createdAt) - Date.parse(a.createdAt);
          case 'rating':
            return b.rating - a.rating || b.reviewsCount - a.reviewsCount;
          default:
            return Number(b.inStock) - Number(a.inStock) || b.popularity - a.popularity;
        }
      });
    }
    return list;
  }, [q, index, products, deal, cat, min, max, sale, stock, halal, gender, brands, sort, sortParam]);

  // Brendlar ro'yxati — joriy kategoriya bo'yicha
  const brandOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      if (cat && p.categoryId !== cat) continue;
      if (p.manufacturer) counts.set(p.manufacturer, (counts.get(p.manufacturer) ?? 0) + 1);
    }
    return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 30);
  }, [products, cat]);

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    setParams(next, { replace: true });
  };
  const reset = () => {
    setParams(q ? { q } : {}, { replace: true });
    setFiltersOpen(false);
  };

  const activeCount = [cat, min, max, sale || null, stock || null, halal || null, gender, brands.length || null].filter(Boolean).length;
  const filterProps = { cat, min, max, sale, stock, halal, gender, brands, brandOptions, update, reset };

  return (
    <div className="container-page py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
          <p className="muted mt-1 text-sm">{t('catalog.found', { n: results.length })}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            {t('catalog.filters')}
            {activeCount > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-xs text-white">{activeCount}</span>}
          </Button>
          <label htmlFor="sort" className="sr-only">{t('catalog.sort')}</label>
          <select id="sort" value={sort} onChange={(e) => update({ sort: e.target.value })} className="input h-9 w-auto py-0 pr-8">
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {t(`sort.${s}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {q && (
        <div className="mb-4 flex">
          <button type="button" className="chip" onClick={() => update({ q: null })}>
            «{q}» <X className="h-3.5 w-3.5" aria-label={t('search.clear')} />
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block" aria-label={t('catalog.filters')}>
          <div className="card sticky top-32 p-4">
            <Filters {...filterProps} />
          </div>
        </aside>
        <div>
          {loading ? (
            <GridSkeleton count={8} />
          ) : results.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={t('catalog.empty')}
              text={t('catalog.emptyText')}
              action={<Button onClick={reset}>{t('catalog.reset')}</Button>}
            />
          ) : (
            <>
              <ProductGrid products={results.slice(0, visible)} />
              {visible < results.length && (
                <div className="mt-8 flex justify-center">
                  <Button variant="secondary" size="lg" onClick={() => setVisible((v) => v + PAGE)}>
                    {t('catalog.loadMore', { n: Math.min(PAGE, results.length - visible) })}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title={t('catalog.filters')}>
        <Filters {...filterProps} />
        <Button block className="mt-4" onClick={() => setFiltersOpen(false)}>
          {t('catalog.show', { n: results.length })}
        </Button>
      </Modal>
    </div>
  );
}
