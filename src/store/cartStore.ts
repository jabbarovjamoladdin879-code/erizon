import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { z } from 'zod';
import type { CartItem, CartItemOptions } from '@/types';
import { makeCartKey, normalizePromoCode } from '@/utils/pricing';
import { cartItemSchema } from '@/utils/schemas';
import { createSafeStorage, passthroughMigrate, validatedMerge } from '@/utils/storage';

/**
 * Savat: faqat ID, miqdor va sozlamalar saqlanadi. Narxlar hech qachon saqlanmaydi —
 * ular har safar katalogdan qayta hisoblanadi (utils/pricing.ts).
 */
interface CartState {
  items: CartItem[];
  promoCode: string | null;
  useBonus: boolean;
  add: (kind: CartItem['kind'], refId: string, qty: number, options?: CartItemOptions) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  setPromo: (code: string | null) => void;
  setUseBonus: (v: boolean) => void;
}

const MAX_LINES = 60;

const persistedSchema = z.object({
  items: z.array(cartItemSchema).max(MAX_LINES),
  promoCode: z.string().regex(/^[A-Z0-9]{3,20}$/).nullable(),
  useBonus: z.boolean(),
});

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      promoCode: null,
      useBonus: false,
      add: (kind, refId, qty, options) =>
        set((s) => {
          const key = makeCartKey(kind, refId, options);
          const existing = s.items.find((i) => i.key === key);
          if (existing) {
            return {
              items: s.items.map((i) => (i.key === key ? { ...i, qty: Math.min(99, i.qty + qty) } : i)),
            };
          }
          if (s.items.length >= MAX_LINES) return s;
          return { items: [...s.items, { key, kind, refId, qty, options }] };
        }),
      setQty: (key, qty) =>
        set((s) => ({ items: s.items.map((i) => (i.key === key ? { ...i, qty: Math.max(0.5, Math.min(99, qty)) } : i)) })),
      remove: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
      clear: () => set({ items: [], promoCode: null, useBonus: false }),
      setPromo: (code) => set({ promoCode: code ? normalizePromoCode(code) : null }),
      setUseBonus: (useBonus) => set({ useBonus }),
    }),
    {
      name: 'erizon-cart',
      version: 1,
      storage: createSafeStorage(),
      partialize: (s) => ({ items: s.items, promoCode: s.promoCode, useBonus: s.useBonus }),
      merge: validatedMerge<CartState>(persistedSchema),
      migrate: passthroughMigrate,
    },
  ),
);

export function useCartCount(): number {
  return useCartStore((s) => s.items.reduce((n, i) => n + (Number.isInteger(i.qty) ? i.qty : 1), 0));
}
