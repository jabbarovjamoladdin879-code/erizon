import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

/**
 * Telefonda pastki navigatsiya ustida turadigan yopishqoq harakat paneli
 * (asosiy tugma doim ko'rinib turadi). md va undan katta ekranlarda yashiriladi.
 * Sahifa oxirida `MobileActionBarSpacer` qo'yish kerak — kontent panel ostida qolmasligi uchun.
 */
export function MobileActionBar({ children, label }: { children: ReactNode; label: string }) {
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 26, stiffness: 300 }}
      role="region"
      aria-label={label}
      className="fixed inset-x-3 bottom-[calc(var(--bottom-nav-h,4.75rem)+env(safe-area-inset-bottom))] z-30 rounded-3xl border border-white/70 bg-white/85 px-3 py-2.5 shadow-float backdrop-blur-xl backdrop-saturate-150 dark:border-white/[0.08] dark:bg-slate-900/85 md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-center gap-3">{children}</div>
    </motion.div>
  );
}

export function MobileActionBarSpacer() {
  return <div aria-hidden="true" className="h-20 md:hidden" />;
}
