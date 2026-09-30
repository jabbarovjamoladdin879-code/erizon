import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
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
        {CATEGORIES.map((c, i) => (
          <li key={c.id} className="animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
            <Link
              to={`/catalog?cat=${c.id}`}
              className="group flex h-full flex-col items-center gap-1.5 rounded-3xl bg-gradient-to-b from-[hsl(var(--h)_90%_96%)] to-[hsl(var(--h)_80%_91%)] px-1 py-3 text-center ring-1 ring-inset ring-[hsl(var(--h)_60%_85%)] transition duration-300 hover:-translate-y-1 hover:shadow-lift sm:gap-2 sm:p-3.5 dark:from-[hsl(var(--h)_35%_18%)] dark:to-[hsl(var(--h)_35%_13%)] dark:ring-white/5"
              style={{ '--h': c.hue } as CSSProperties}
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/80 text-2xl shadow-sm transition duration-300 group-hover:rotate-[-6deg] group-hover:scale-110 dark:bg-white/10 sm:h-14 sm:w-14 sm:text-3xl" aria-hidden="true">
                {c.emoji}
              </span>
              <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-slate-800 dark:text-slate-100 sm:text-xs">{t(`cat.${c.id}`)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
