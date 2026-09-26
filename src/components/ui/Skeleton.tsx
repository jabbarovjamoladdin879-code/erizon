import { useT } from '@/hooks/useT';
import { cn } from '@/utils/cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative overflow-hidden rounded-xl bg-slate-200/80 dark:bg-slate-800',
        'before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/50 before:to-transparent dark:before:via-white/10',
        className,
      )}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="card p-3">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/2" />
      <Skeleton className="mt-4 h-10 w-full" />
    </div>
  );
}

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  const t = useT();
  return (
    <div className="container-page py-8" role="status" aria-live="polite">
      <span className="sr-only">{t('common.loading')}</span>
      <Skeleton className="mb-6 h-8 w-64" />
      <GridSkeleton count={8} />
    </div>
  );
}
