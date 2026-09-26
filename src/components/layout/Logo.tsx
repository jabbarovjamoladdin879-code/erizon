import { Link } from 'react-router-dom';
import { useT } from '@/hooks/useT';

export function Logo() {
  const t = useT();
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2" aria-label={t('header.home')}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-accent-500 text-lg font-black text-white shadow-lift">
        E
      </span>
      <span className="block leading-tight">
        <span className="block text-lg font-extrabold tracking-tight">
          Erizon<span className="text-brand-600 dark:text-brand-400"> Mall</span>
        </span>
        <span className="muted block text-[10px] font-semibold uppercase tracking-[0.18em]">Beruniy</span>
      </span>
    </Link>
  );
}
