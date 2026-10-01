import { ShieldCheck } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { cn } from '@/utils/cn';

export function HalalBadge({ compact = false }: { compact?: boolean }) {
  const t = useT();
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md bg-emerald-700 font-bold text-white',
        compact ? 'px-1.5 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
      )}
      title={t('badge.halalHint')}
    >
      <ShieldCheck className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden="true" />
      {t('badge.halal')}
    </span>
  );
}
