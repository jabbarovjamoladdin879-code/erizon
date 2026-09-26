import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ProductImage } from '@/components/ui/ProductImage';
import { useT } from '@/hooks/useT';
import type { Product } from '@/types';
import { cn } from '@/utils/cn';

export function ProductGallery({ product }: { product: Product }) {
  const t = useT();
  const [active, setActive] = useState(0);
  // Haqiqiy rasmlar bo'lsa — ular, aks holda 3 xil SVG ko'rinish
  const slides = product.images?.length ? product.images.map((src, i) => ({ src, variant: i })) : [0, 1, 2].map((v) => ({ src: undefined, variant: v }));
  const current = slides[Math.min(active, slides.length - 1)];

  return (
    <div>
      <div className="card relative overflow-hidden p-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ProductImage
              emoji={product.emoji}
              hue={product.hue}
              src={current.src}
              variant={current.variant}
              eager
              alt={t('product.imageAlt', { name: product.name, n: active + 1 })}
              className="aspect-square w-full"
            />
          </motion.div>
        </AnimatePresence>
      </div>
      {slides.length > 1 && (
        <div className="mt-3 flex gap-2" role="tablist" aria-label={t('product.gallery')}>
          {slides.map((s, i) => (
            <button
              key={`${s.src ?? 'svg'}-${s.variant}`}
              type="button"
              role="tab"
              aria-selected={active === i}
              aria-label={t('product.imageN', { n: i + 1 })}
              onClick={() => setActive(i)}
              className={cn('overflow-hidden rounded-xl border-2 transition', active === i ? 'border-brand-600' : 'border-transparent opacity-70 hover:opacity-100')}
            >
              <ProductImage emoji={product.emoji} hue={product.hue} src={s.src} variant={s.variant} alt="" className="h-16 w-16 sm:h-20 sm:w-20" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
