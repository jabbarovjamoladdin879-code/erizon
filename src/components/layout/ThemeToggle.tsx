import { Moon, Sun } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { useUiStore } from '@/store/uiStore';

export function ThemeToggle() {
  const t = useT();
  const theme = useUiStore((s) => s.theme);
  const toggle = useUiStore((s) => s.toggleTheme);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? t('header.lightMode') : t('header.darkMode')}
      className="grid h-10 w-10 place-items-center rounded-xl text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
