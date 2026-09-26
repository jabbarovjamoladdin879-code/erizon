import { memo, useId } from 'react';
import { Star } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { cn } from '@/utils/cn';

interface StarsProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-6 w-6' };

export const Stars = memo(function Stars({ value, size = 'sm', className }: StarsProps) {
  const t = useT();
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} role="img" aria-label={t('rating.aria', { n: value.toFixed(1) })}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i + 1));
        return (
          <span key={i} className="relative inline-block">
            <Star className={cn(SIZE[size], 'text-slate-300 dark:text-slate-600')} aria-hidden="true" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={cn(SIZE[size], 'fill-amber-400 text-amber-400')} aria-hidden="true" />
            </span>
          </span>
        );
      })}
    </span>
  );
});

interface StarInputProps {
  value: number;
  onChange: (v: number) => void;
  label: string;
}

/** Radio-guruh ko'rinishidagi, klaviatura bilan boshqariladigan yulduzcha tanlagich */
export function StarInput({ value, onChange, label }: StarInputProps) {
  const name = useId();
  const t = useT();
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <label key={i} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={i}
              checked={value === i}
              onChange={() => onChange(i)}
              className="peer sr-only"
            />
            <span className="sr-only">{t('rating.stars', { n: i })}</span>
            <Star
              aria-hidden="true"
              className={cn(
                'h-8 w-8 rounded transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500',
                i <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600',
              )}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
