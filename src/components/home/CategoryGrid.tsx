import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
          <motion.li
            key={c.id}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.03 }}
          >
            <Link
              to={`/catalog?cat=${c.id}`}
              className="group flex h-full flex-col items-center gap-1.5 rounded-2xl bg-[hsl(var(--h)_85%_95%)] px-1 py-2.5 text-center sm:gap-2 sm:p-3 transition hover:-translate-y-1 hover:shadow-lift dark:bg-[hsl(var(--h)_35%_16%)]"
              style={{ '--h': c.hue } as CSSProperties}
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/70 text-2xl shadow-sm transition group-hover:scale-110 dark:bg-white/10 sm:h-14 sm:w-14 sm:text-3xl" aria-hidden="true">
                {c.emoji}
              </span>
              <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-slate-800 dark:text-slate-100 sm:text-xs">{t(`cat.${c.id}`)}</span>
            </Link>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
