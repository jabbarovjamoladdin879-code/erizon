import { useCallback, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { ProductImage } from '@/components/ui/ProductImage';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useDebounce } from '@/hooks/useDebounce';
import { usePrice, useT } from '@/hooks/useT';
import { useCatalogStore } from '@/store/catalogStore';
import { cn } from '@/utils/cn';
import { sanitizeQuery } from '@/utils/sanitize';
import { buildSearchIndex, searchIndex } from '@/utils/search';

/** Aqlli qidiruv: debounce, avtomatik takliflar, imlo xatolariga chidamli, klaviatura bilan boshqarish */
export function SearchBox({ className }: { className?: string }) {
  const t = useT();
  const fmt = usePrice();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const products = useCatalogStore((s) => s.products);
  const [value, setValue] = useState(() => (location.pathname === '/catalog' ? (params.get('q') ?? '') : ''));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const debounced = useDebounce(value, 250);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const index = useMemo(() => buildSearchIndex(products, (p) => t(`cat.${p.categoryId}`)), [products, t]);
  const suggestions = useMemo(() => (debounced.trim().length >= 2 ? searchIndex(index, sanitizeQuery(debounced), 6) : []), [index, debounced]);

  // Qidiruv so'zi yoki sahifa o'zgarsa — tanlov va ro'yxat qayta boshlanadi
  const [prev, setPrev] = useState({ debounced, path: location.pathname });
  if (prev.debounced !== debounced || prev.path !== location.pathname) {
    if (prev.debounced !== debounced) setActive(-1);
    if (prev.path !== location.pathname) setOpen(false);
    setPrev({ debounced, path: location.pathname });
  }

  const close = useCallback(() => setOpen(false), []);
  useClickOutside(wrapRef, close, open);

  const submit = (q: string) => {
    const clean = sanitizeQuery(q);
    setOpen(false);
    navigate(clean ? `/catalog?q=${encodeURIComponent(clean)}` : '/catalog');
  };

  const goTo = (id: string) => {
    setOpen(false);
    setValue('');
    navigate(`/product/${id}`);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(suggestions.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(-1, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && suggestions[active]) goTo(suggestions[active].id);
      else submit(value);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && debounced.trim().length >= 2;

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
      >
        <label htmlFor={`${listId}-input`} className="sr-only">
          {t('search.label')}
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            id={`${listId}-input`}
            type="search"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
            autoComplete="off"
            maxLength={80}
            value={value}
            placeholder={t('search.placeholder')}
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="h-11 w-full rounded-2xl border border-slate-200/80 bg-slate-100/70 pl-10 pr-10 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15 dark:border-slate-700/70 dark:bg-slate-800/70 dark:focus:bg-slate-900 [&::-webkit-search-cancel-button]:hidden"
          />
          {value && (
            <button
              type="button"
              onClick={() => setValue('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:text-slate-600"
              aria-label={t('search.clear')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      <AnimatePresence>
        {showList && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-3xl border border-slate-200/70 bg-white/95 shadow-float backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95"
          >
            {suggestions.length === 0 ? (
              <p className="muted px-4 py-5 text-center text-sm">{t('search.noResults')}</p>
            ) : (
              <ul id={listId} role="listbox" aria-label={t('search.suggestions')}>
                {suggestions.map((p, i) => (
                  <li
                    key={p.id}
                    id={`${listId}-opt-${i}`}
                    role="option"
                    aria-selected={active === i}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => goTo(p.id)}
                    onMouseEnter={() => setActive(i)}
                    className={cn('flex cursor-pointer items-center gap-3 px-3 py-2', active === i && 'bg-brand-50 dark:bg-slate-800')}
                  >
                    <ProductImage emoji={p.emoji} hue={p.hue} alt="" className="h-10 w-10 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="muted text-xs">{t(`cat.${p.categoryId}`)}</div>
                    </div>
                    <div className="text-sm font-bold">{fmt(p.price)}</div>
                  </li>
                ))}
                <li role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => submit(value)}
                    className="w-full border-t border-slate-100 px-4 py-2.5 text-left text-sm font-semibold text-brand-700 hover:bg-slate-50 dark:border-slate-800 dark:text-brand-300 dark:hover:bg-slate-800"
                  >
                    {t('search.allResults', { q: sanitizeQuery(value) })}
                  </button>
                </li>
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
