import { useCallback, useEffect, useRef, useState } from 'react';
import { Globe } from 'lucide-react';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useT } from '@/hooks/useT';
import { LANGS } from '@/i18n';
import { useUiStore } from '@/store/uiStore';
import { cn } from '@/utils/cn';

export function LangSwitcher() {
  const t = useT();
  const lang = useUiStore((s) => s.lang);
  const setLang = useUiStore((s) => s.setLang);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  useEffect(() => {
    document.documentElement.lang = lang === 'kaa' ? 'kaa' : lang;
  }, [lang]);

  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('header.language')}
        className="flex h-10 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <Globe className="h-4 w-4" aria-hidden="true" />
        {current.short}
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        >
          {LANGS.map((l) => (
            <li key={l.code} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={l.code === lang}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800',
                  l.code === lang && 'font-bold text-brand-700 dark:text-brand-300',
                )}
              >
                {l.label}
                <span className="muted text-xs">{l.short}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
