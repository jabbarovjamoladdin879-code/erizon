import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useT } from '@/hooks/useT';
import type { Product } from '@/types';
import { ProductCard } from './ProductCard';

interface ProductRailProps {
  title: string;
  icon?: ReactNode;
  products: Product[];
  moreHref?: string;
}

/** Gorizontal aylantiriladigan mahsulotlar qatori */
export function ProductRail({ title, icon, products, moreHref }: ProductRailProps) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  if (products.length === 0) return null;
  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };
  return (
    <section className="py-6" aria-label={title}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="section-title flex min-w-0 items-center gap-2.5 sm:gap-3">
          {icon && (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-white shadow-soft ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-white/10 sm:h-10 sm:w-10 [&>svg]:h-5 [&>svg]:w-5">
              {icon}
            </span>
          )}
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {moreHref && (
            <Link to={moreHref} className="inline-flex h-9 items-center rounded-full bg-brand-50 px-3.5 text-sm font-semibold text-brand-700 ring-1 ring-inset ring-brand-100 transition hover:bg-brand-100 dark:bg-brand-950/60 dark:text-brand-200 dark:ring-brand-900">
              {t('common.viewAll')}
            </Link>
          )}
          <div className="hidden gap-1 sm:flex">
            <button
              type="button"
              onClick={() => scroll(-1)}
              className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:border-brand-400 hover:text-brand-700 active:scale-95 dark:border-slate-700 dark:bg-slate-900"
              aria-label={t('common.prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:border-brand-400 hover:text-brand-700 active:scale-95 dark:border-slate-700 dark:bg-slate-900"
              aria-label={t('common.next')}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <div ref={ref} className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-5 pt-1 sm:gap-4">
        {products.map((p) => (
          <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[23%] xl:w-[18.5%]">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
