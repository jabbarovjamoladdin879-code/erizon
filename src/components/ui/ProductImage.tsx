import { memo, useState, type CSSProperties } from 'react';
import { cn } from '@/utils/cn';
import { AppIcon } from './AppIcon';

interface ProductImageProps {
  /** Rasm bo'lmasa ko'rsatiladigan ikonka (lucide nomi) */
  icon: string;
  hue: number;
  alt: string;
  /** Admin yuklagan haqiqiy rasm (/api/images/<id>) */
  src?: string;
  /** Galereya ko'rinishlari uchun fon ohangi */
  variant?: number;
  className?: string;
  eager?: boolean;
}

const SAFE_SRC = /^\/api\/images\/[a-f0-9]{24}$/;

/** Haqiqiy rasm; bo'lmasa (yoki yuklanmasa) — bosiq fonda chiziqli ikonka */
export const ProductImage = memo(function ProductImage({ icon, hue, alt, src, variant = 0, className, eager }: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  if (src && SAFE_SRC.test(src) && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        onError={() => setFailed(true)}
        className={cn('bg-slate-100 object-cover dark:bg-slate-800', className)}
      />
    );
  }
  return (
    <div
      role="img"
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      style={{ '--h': ((hue % 360) + 360) % 360, '--l': `${96 - (variant % 3) * 2}%` } as CSSProperties}
      className={cn(
        'grid place-items-center bg-[hsl(var(--h)_25%_var(--l))] text-[hsl(var(--h)_30%_38%)] dark:bg-[hsl(var(--h)_12%_16%)] dark:text-[hsl(var(--h)_25%_70%)]',
        className,
      )}
    >
      <AppIcon name={icon} className="h-auto w-[38%]" strokeWidth={1.25} />
    </div>
  );
});
