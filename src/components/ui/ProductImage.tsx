import { memo, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/utils/cn';
import { productImage } from '@/utils/image';

interface ProductImageProps {
  emoji: string;
  hue: number;
  alt: string;
  /** Admin yuklagan haqiqiy rasm (/api/images/<id>) */
  src?: string;
  variant?: number;
  className?: string;
  eager?: boolean;
}

const SAFE_SRC = /^\/api\/images\/[a-f0-9]{24}$/;

/** Haqiqiy rasm → lokal SVG placeholder → gradient + ikonka (har bosqichda zaxira bor) */
export const ProductImage = memo(function ProductImage({ emoji, hue, alt, src, variant = 0, className, eager }: ProductImageProps) {
  const [stage, setStage] = useState<0 | 1 | 2>(src && SAFE_SRC.test(src) ? 0 : 1);
  if (stage === 2) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn('grid place-items-center bg-gradient-to-br from-brand-100 to-accent-400/30 dark:from-brand-950 dark:to-slate-800', className)}
      >
        <ImageOff className="h-10 w-10 text-brand-400" aria-hidden="true" />
      </div>
    );
  }
  return (
    <img
      src={stage === 0 && src ? src : productImage(emoji, hue, variant)}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      onError={() => setStage((s) => (s === 0 ? 1 : 2))}
      className={cn('bg-slate-100 object-cover dark:bg-slate-800', className)}
    />
  );
});
