import { Link } from 'react-router-dom';
import { useT } from '@/hooks/useT';

export function Logo() {
  const t = useT();
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2" aria-label={t('header.home')}>
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-700 text-lg font-bold text-white">
        E
      </span>
      <span className="block leading-tight">
        <span className="block text-lg font-bold tracking-tight">
          Erizon<span className="text-brand-700 dark:text-brand-300"> Mall</span>
        </span>
        <span className="muted block text-[10px] font-semibold uppercase tracking-[0.18em]">Beruniy</span>
      </span>
    </Link>
  );
}
