import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { AppIcon } from '@/components/ui/AppIcon';
import { CATEGORIES } from '@/data/categories';
import { useT } from '@/hooks/useT';

export function CategoryGrid() {
  const t = useT();
  return (
    <section className="py-6" aria-labelledby="cats-title">
      <h2 id="cats-title" className="section-title mb-4">
        {t('home.categories')}
      </h2>
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-3 xl:grid-cols-12">
        {CATEGORIES.map((c) => (
          <li key={c.id}>
            <Link
              to={`/catalog?cat=${c.id}`}
              className="group flex h-full flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-1 py-3 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/40 sm:p-3.5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700"
              style={{ '--h': c.hue } as CSSProperties}
            >
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[hsl(var(--h)_30%_95%)] text-[hsl(var(--h)_35%_38%)] dark:bg-[hsl(var(--h)_15%_18%)] dark:text-[hsl(var(--h)_30%_72%)] sm:h-12 sm:w-12">
                <AppIcon name={c.icon} className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.75} />
              </span>
              <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-slate-800 dark:text-slate-100 sm:text-xs">{t(`cat.${c.id}`)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
