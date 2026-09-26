import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { STORIES } from '@/data/stories';
import { useT } from '@/hooks/useT';
import { cn } from '@/utils/cn';

const DURATION = 5000;
const SEEN_KEY = 'erizon-stories-seen';

function loadSeen(): string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string').slice(0, 50) : [];
  } catch {
    return [];
  }
}

function StoryViewer({ start, onClose, onSeen }: { start: number; onClose: () => void; onSeen: (id: string) => void }) {
  const t = useT();
  const [index, setIndex] = useState(start);
  const [paused, setPaused] = useState(false);
  const story = STORIES[index];

  const next = useCallback(() => {
    if (index >= STORIES.length - 1) onClose();
    else setIndex((i) => i + 1);
  }, [index, onClose]);
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => onSeen(story.id), [story.id, onSeen]);

  useEffect(() => {
    if (paused) return undefined;
    const id = window.setTimeout(next, DURATION);
    return () => window.clearTimeout(id);
  }, [index, paused, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [next, prev, onClose]);

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[90] grid place-items-center bg-black/90 p-0 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={t(story.titleKey)}
    >
      <div
        className={cn('relative flex h-full w-full max-w-md flex-col overflow-hidden bg-gradient-to-br text-white sm:h-[85vh] sm:rounded-3xl', story.gradient)}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      >
        <div className="flex gap-1 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          {STORIES.map((s, i) => (
            <div key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              {i < index && <div className="h-full w-full bg-white" />}
              {i === index && (
                <motion.div
                  key={`${s.id}-${index}`}
                  className="h-full bg-white"
                  initial={{ width: '0%' }}
                  animate={{ width: paused ? undefined : '100%' }}
                  transition={{ duration: DURATION / 1000, ease: 'linear' }}
                />
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={onClose} className="absolute right-3 top-6 z-20 rounded-full bg-black/20 p-2" aria-label={t('common.close')}>
          <X className="h-5 w-5" />
        </button>
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <motion.span key={story.id} initial={{ scale: 0.6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} className="text-[110px] drop-shadow-2xl" aria-hidden="true">
            {story.emoji}
          </motion.span>
          <h2 className="mt-6 text-3xl font-extrabold">{t(story.titleKey)}</h2>
          <p className="mt-3 text-white/85">{t(story.textKey)}</p>
        </div>
        <div className="relative z-20 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <Link to={story.href} onClick={onClose} className="flex h-12 items-center justify-center rounded-xl bg-white font-bold text-slate-900">
            {t('story.cta')}
          </Link>
        </div>
        {/* Teginish zonalari: chap — oldingi, o'ng — keyingi */}
        <button type="button" className="absolute inset-y-16 left-0 z-10 w-1/3" onClick={prev} aria-label={t('common.prev')} />
        <button type="button" className="absolute inset-y-16 right-0 z-10 w-1/3" onClick={next} aria-label={t('common.next')} />
      </div>
    </motion.div>,
    document.body,
  );
}

export function Stories() {
  const t = useT();
  const [open, setOpen] = useState<number | null>(null);
  const [seen, setSeen] = useState<string[]>(loadSeen);

  const markSeen = useCallback((id: string) => {
    setSeen((s) => {
      if (s.includes(id)) return s;
      const next = [...s, id];
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(next));
      } catch {
        /* e'tiborsiz */
      }
      return next;
    });
  }, []);
  const close = useCallback(() => setOpen(null), []);

  return (
    <section aria-label={t('story.label')} className="mb-4">
      <ul className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:gap-4">
        {STORIES.map((s, i) => (
          <li key={s.id} className="shrink-0">
            <button type="button" onClick={() => setOpen(i)} className="flex w-[72px] flex-col items-center gap-1.5 sm:w-20">
              <span className={cn('rounded-full p-[3px]', seen.includes(s.id) ? 'bg-slate-300 dark:bg-slate-700' : 'bg-gradient-to-tr from-accent-500 via-rose-500 to-brand-600')}>
                <span className={cn('grid h-16 w-16 place-items-center rounded-full border-[3px] border-white bg-gradient-to-br text-3xl dark:border-slate-950 sm:h-[70px] sm:w-[70px]', s.gradient)} aria-hidden="true">
                  {s.emoji}
                </span>
              </span>
              <span className="line-clamp-2 text-center text-[11px] font-medium leading-tight">{t(s.titleKey)}</span>
            </button>
          </li>
        ))}
      </ul>
      <AnimatePresence>{open !== null && <StoryViewer start={open} onClose={close} onSeen={markSeen} />}</AnimatePresence>
    </section>
  );
}
