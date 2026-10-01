import { memo } from 'react';
import { usePrice, useT } from '@/hooks/useT';
import type { Unit } from '@/types';
import { cn } from '@/utils/cn';

interface PriceTagProps {
  price: number;
  oldPrice?: number;
  unit?: Unit;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PriceTag = memo(function PriceTag({ price, oldPrice, unit, size = 'md', className }: PriceTagProps) {
  const fmt = usePrice();
  const t = useT();
  const perUnit = unit === 'kg' ? ` / ${t('unit.kg')}` : '';
  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-2', className)}>
      <span
        className={cn(
          'font-bold tracking-tight',
          oldPrice ? 'text-accent-700 dark:text-accent-400' : 'text-slate-900 dark:text-white',
          size === 'sm' && 'text-base',
          size === 'md' && 'text-lg',
          size === 'lg' && 'text-3xl',
        )}
      >
        {fmt(price)}
        {perUnit && <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{perUnit}</span>}
      </span>
      {oldPrice && oldPrice > price && (
        <span className={cn('text-slate-500 line-through dark:text-slate-400', size === 'lg' ? 'text-base' : 'text-xs')}>
          <span className="sr-only">{t('price.old')}: </span>
          {fmt(oldPrice)}
        </span>
      )}
    </div>
  );
});
