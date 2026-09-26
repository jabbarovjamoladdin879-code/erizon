import { useMemo } from 'react';
import { BadgeCheck, Clock, Gift, Percent, ShieldCheck, Sparkles, TrendingUp, Truck } from 'lucide-react';
import { Advantages } from '@/components/home/Advantages';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { ComboSection } from '@/components/home/ComboSection';
import { DealOfDay } from '@/components/home/DealOfDay';
import { HeroSlider } from '@/components/home/HeroSlider';
import { Stories } from '@/components/home/Stories';
import { ProductRail } from '@/components/product/ProductRail';
import { useSeo } from '@/hooks/useSeo';
import { useT } from '@/hooks/useT';
import { useCatalogStatus, useCatalogStore, useProductMap } from '@/store/catalogStore';
import { CatalogError } from '@/components/CatalogError';
import { GridSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { useListsStore } from '@/store/listsStore';
import type { Product } from '@/types';

const PERKS = [
  { icon: Truck, key: 'adv.fast.title', color: 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300' },
  { icon: ShieldCheck, key: 'adv.halal.title', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  { icon: BadgeCheck, key: 'adv.quality.title', color: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
  { icon: Gift, key: 'adv.bonus.title', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
] as const;

export default function HomePage() {
  const t = useT();
  useSeo('', t('seo.home'));
  const products = useCatalogStore((s) => s.products);
  const catalogStatus = useCatalogStatus();
  const recentIds = useListsStore((s) => s.recent);
  const map = useProductMap();

  const { popular, sale, fresh } = useMemo(() => {
    const inStock = products.filter((p) => p.inStock);
    return {
      popular: [...inStock].sort((a, b) => b.popularity - a.popularity).slice(0, 12),
      sale: inStock.filter((p) => p.oldPrice && p.oldPrice > p.price).slice(0, 12),
      fresh: [...inStock].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 12),
    };
  }, [products]);

  const recent = useMemo(() => recentIds.map((id) => map.get(id)).filter((p): p is Product => !!p), [recentIds, map]);

  return (
    <div className="container-page pt-4 sm:pt-6">
      <Stories />
      <HeroSlider />
      <ul className="scrollbar-none -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0" aria-label={t('home.why')}>
        {PERKS.map(({ icon: Icon, key, color }) => (
          <li key={key} className="flex shrink-0 items-center gap-2 rounded-2xl border border-slate-200/70 bg-white px-3 py-2.5 text-xs font-semibold shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:text-sm">
            <span className={`grid h-8 w-8 place-items-center rounded-xl ${color}`}>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            {t(key)}
          </li>
        ))}
      </ul>
      <DealOfDay />
      <CategoryGrid />
      {catalogStatus === 'loading' ? (
        <section className="py-6" aria-busy="true">
          <Skeleton className="mb-4 h-7 w-56" />
          <GridSkeleton count={4} />
        </section>
      ) : catalogStatus === 'error' ? (
        <CatalogError embedded />
      ) : (
        <>
          <ProductRail
            title={t('home.popular')}
            icon={<TrendingUp className="h-6 w-6 text-brand-600" aria-hidden="true" />}
            products={popular}
            moreHref="/catalog?sort=popular"
          />
          <ProductRail
            title={t('home.sale')}
            icon={<Percent className="h-6 w-6 text-accent-500" aria-hidden="true" />}
            products={sale}
            moreHref="/catalog?sale=1"
          />
          <ComboSection />
          <ProductRail
            title={t('home.new')}
            icon={<Sparkles className="h-6 w-6 text-amber-500" aria-hidden="true" />}
            products={fresh}
            moreHref="/catalog?sort=new"
          />
          <ProductRail
            title={t('home.recent')}
            icon={<Clock className="h-6 w-6 text-slate-500" aria-hidden="true" />}
            products={recent}
          />
        </>
      )}
      <Advantages />
    </div>
  );
}
