import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ShoppingBag, Beef, Sandwich, type LucideIcon } from 'lucide-react';
import { useT } from '@/hooks/useT';
import type { TKey } from '@/i18n';
import { cn } from '@/utils/cn';

interface Slide {
  title: TKey;
  text: TKey;
  cta: TKey;
  href: string;
  icon: LucideIcon;
  /** Bir rangli fon (klassik banner) */
  color: string;
}

const SLIDES: Slide[] = [
  { title: 'hero.1.title', text: 'hero.1.text', cta: 'hero.1.cta', href: '/catalog?cat=fastfood', icon: Sandwich, color: 'bg-brand-800' },
  { title: 'hero.2.title', text: 'hero.2.text', cta: 'hero.2.cta', href: '/catalog?cat=meat', icon: Beef, color: 'bg-slate-800' },
  { title: 'hero.3.title', text: 'hero.3.text', cta: 'hero.3.cta', href: '/catalog?sale=1', icon: ShoppingBag, color: 'bg-emerald-800' },
];

const INTERVAL = 6000;

export function HeroSlider() {
  const t = useT();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback((dir: number) => setIndex((i) => (i + dir + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    if (paused) return undefined;
    const id = window.setInterval(() => go(1), INTERVAL);
    return () => window.clearInterval(id);
  }, [paused, go]);

  const slide = SLIDES[index];
  const Icon = slide.icon;

  return (
    <section
      className="relative overflow-hidden rounded-xl"
      aria-roledescription="carousel"
      aria-label={t('hero.label')}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={cn('relative flex min-h-[220px] items-center p-6 pb-12 text-white sm:min-h-[280px] sm:p-10', slide.color)}
          aria-roledescription="slide"
          aria-label={`${index + 1} / ${SLIDES.length}`}
        >
          <div className="relative z-10 max-w-[70%] sm:max-w-lg">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Erizon Mall</span>
            <h1 className="mt-2 text-[1.6rem] font-bold leading-tight sm:text-4xl">{t(slide.title)}</h1>
            <p className="mt-2 text-sm text-white/80 sm:text-base">{t(slide.text)}</p>
            <Link
              to={slide.href}
              className="mt-5 inline-flex h-11 items-center rounded-lg bg-white px-5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
            >
              {t(slide.cta)}
            </Link>
          </div>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-4 top-1/2 grid h-24 w-24 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/5 sm:right-12 sm:h-48 sm:w-48"
          >
            <Icon className="h-12 w-12 text-white/85 sm:h-24 sm:w-24" strokeWidth={1.25} />
          </span>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-4 left-6 z-10 flex gap-1.5 sm:left-10">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={t('hero.goTo', { n: i + 1 })}
            aria-current={i === index}
            className={cn('h-1.5 rounded-full bg-white transition-all', i === index ? 'w-6' : 'w-1.5 opacity-50')}
          />
        ))}
      </div>
      <div className="absolute bottom-3 right-4 z-10 hidden gap-2 sm:flex">
        <button type="button" onClick={() => go(-1)} aria-label={t('common.prev')} className="grid h-9 w-9 place-items-center rounded-full border border-white/30 text-white transition-colors hover:bg-white/10">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button type="button" onClick={() => go(1)} aria-label={t('common.next')} className="grid h-9 w-9 place-items-center rounded-full border border-white/30 text-white transition-colors hover:bg-white/10">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}
