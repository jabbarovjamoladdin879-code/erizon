import { memo } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { cn } from '@/utils/cn';
import { formatQty } from '@/utils/format';

interface QtyStepperProps {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  size?: 'sm' | 'md';
}

export const QtyStepper = memo(function QtyStepper({
  value,
  onChange,
  step = 1,
  min = 1,
  max = 99,
  suffix,
  size = 'md',
}: QtyStepperProps) {
  const t = useT();
  const round = (v: number) => Math.round(v / step) * step;
  const btn = cn(
    'grid place-items-center rounded-lg text-slate-700 transition hover:bg-white hover:text-brand-700 disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-200 dark:hover:bg-slate-700',
    size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
  );
  return (
    <div
      className="inline-flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
      role="group"
      aria-label={t('qty.label')}
    >
      <button
        type="button"
        className={btn}
        onClick={() => onChange(Math.max(min, round(value - step)))}
        disabled={value <= min}
        aria-label={t('qty.decrease')}
      >
        <Minus className="h-4 w-4" />
      </button>
      <output className={cn('text-center font-semibold tabular-nums', size === 'sm' ? 'min-w-[3rem] text-sm' : 'min-w-[4rem]')} aria-live="polite">
        {formatQty(value)}
        {suffix ? ` ${suffix}` : ''}
      </output>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(Math.min(max, round(value + step)))}
        disabled={value >= max}
        aria-label={t('qty.increase')}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
});
