import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useT } from '@/hooks/useT';
import type { TKey } from '@/i18n';
import { cn } from '@/utils/cn';

interface Slide {
  title: TKey;
  text: TKey;
  cta: TKey;
  href: string;
  emoji: string;
  gradient: string;
}

const SLIDES: Slide[] = [
  { title: 'hero.1.title', text: 'hero.1.text', cta: 'hero.1.cta', href: '/catalog?cat=fastfood', emoji: '🍔', gradient: 'from-brand-700 via-brand-600 to-accent-500' },
  { title: 'hero.2.title', text: 'hero.2.text', cta: 'hero.2.cta', href: '/catalog?cat=meat', emoji: '🥩', gradient: 'from-rose-700 via-rose-600 to-orange-500' },
  { title: 'hero.3.title', text: 'hero.3.text', cta: 'hero.3.cta', href: '/catalog?sale=1', emoji: '🛍️', gradient: 'from-emerald-700 via-teal-600 to-cyan-500' },
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

  return (
    <section
      className="relative overflow-hidden rounded-4xl shadow-lift ring-1 ring-black/5 dark:ring-white/10"
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
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.35 }}
          className={cn('relative flex min-h-[240px] items-center bg-gradient-to-br p-6 pb-12 text-white sm:min-h-[300px] sm:p-10', slide.gradient)}
          aria-roledescription="slide"
          aria-label={`${index + 1} / ${SLIDES.length}`}
        >
          <div className="relative z-10 max-w-[68%] sm:max-w-lg">
            <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider ring-1 ring-inset ring-white/25 backdrop-blur">
              Erizon Mall
            </span>
            <h1 className="mt-3 text-[1.7rem] font-extrabold leading-[1.1] tracking-tight sm:text-5xl">{t(slide.title)}</h1>
            <p className="mt-2 text-sm text-white/85 sm:text-base">{t(slide.text)}</p>
            <Link
              to={slide.href}
              className="mt-5 inline-flex h-12 items-center rounded-2xl bg-white px-6 text-sm font-bold text-slate-900 shadow-xl shadow-black/20 transition hover:scale-[1.03] active:scale-[0.97]"
            >
              {t(slide.cta)}
            </Link>
          </div>
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute -right-5 top-4 select-none text-[88px] opacity-90 drop-shadow-2xl sm:bottom-0 sm:right-10 sm:top-auto sm:text-[200px] sm:opacity-100"
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 120 }}
          >
            {slide.emoji}
          </motion.span>
          <div aria-hidden="true" className="absolute -left-10 -top-10 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
          <div aria-hidden="true" className="absolute -bottom-20 right-1/4 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
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
            className={cn('h-2 rounded-full bg-white transition-all', i === index ? 'w-6' : 'w-2 opacity-50')}
          />
        ))}
      </div>
      <div className="absolute bottom-3 right-4 z-10 hidden gap-2 sm:flex">
        <button type="button" onClick={() => go(-1)} aria-label={t('common.prev')} className="grid h-9 w-9 place-items-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/35">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button type="button" onClick={() => go(1)} aria-label={t('common.next')} className="grid h-9 w-9 place-items-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/35">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}
