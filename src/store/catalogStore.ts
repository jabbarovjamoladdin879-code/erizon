import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { z } from 'zod';
import { api, type AppConfig } from '@/services/api';
import type { DealOfDay, Product } from '@/types';
import { dealSchema, productSchema } from '@/utils/schemas';
import { createSafeStorage, passthroughMigrate } from '@/utils/storage';

/**
 * Katalog holati — manba: backend (/api/catalog).
 * Oxirgi olingan katalog localStorage'da keshlanadi (sahifa darhol ochilishi va
 * internet sekin bo'lganda ham ko'rinishi uchun); o'qishda Zod bilan tekshiriladi.
 */
interface CatalogState {
  products: Product[];
  deal: DealOfDay | null;
  config: AppConfig;
  status: 'idle' | 'loading' | 'ready' | 'error';
  load: () => Promise<void>;
  upsertProduct: (p: Product) => void;
  removeProduct: (id: string) => void;
}

const DEFAULT_CONFIG: AppConfig = { payments: { cash: true, click: false, payme: false }, demoOtp: false };

const persistedSchema = z.object({
  products: z.array(productSchema).max(5000),
  deal: dealSchema.nullable(),
});

let inflight: Promise<void> | null = null;

export const useCatalogStore = create<CatalogState>()(
  persist(
    (set) => ({
      products: [],
      deal: null,
      config: DEFAULT_CONFIG,
      status: 'idle',
      load: () => {
        inflight ??= (async () => {
          set((s) => ({ status: s.products.length ? s.status : 'loading' }));
          try {
            const [catalog, config] = await Promise.all([api.catalog(), api.config().catch(() => DEFAULT_CONFIG)]);
            set({ products: catalog.products, deal: catalog.deal, config, status: 'ready' });
          } catch {
            set((s) => ({ status: s.products.length ? 'ready' : 'error' }));
          } finally {
            inflight = null;
          }
        })();
        return inflight;
      },
      upsertProduct: (p) =>
        set((s) => {
          const exists = s.products.some((x) => x.id === p.id);
          return { products: exists ? s.products.map((x) => (x.id === p.id ? p : x)) : [p, ...s.products] };
        }),
      removeProduct: (id) => set((s) => ({ products: s.products.filter((p) => p.id !== id) })),
    }),
    {
      name: 'erizon-catalog-cache',
      version: 2,
      storage: createSafeStorage(),
      partialize: (s) => ({ products: s.products, deal: s.deal }),
      migrate: passthroughMigrate,
      merge: (persisted, current) => {
        const r = persistedSchema.safeParse(persisted);
        return r.success ? { ...current, ...r.data, status: r.data.products.length ? 'ready' : current.status } : current;
      },
    },
  ),
);

/** ID bo'yicha tez qidirish uchun xarita (memo bilan) */
let lastProducts: Product[] | null = null;
let lastMap = new Map<string, Product>();
export function getProductMap(products: Product[]): Map<string, Product> {
  if (products !== lastProducts) {
    lastProducts = products;
    lastMap = new Map(products.map((p) => [p.id, p]));
  }
  return lastMap;
}

export function useProductMap(): Map<string, Product> {
  const products = useCatalogStore((s) => s.products);
  return getProductMap(products);
}

/**
 * Katalog holati sahifalar uchun: 'loading' (hali kelmagan — skelet ko'rsatiladi),
 * 'ready' (ma'lumot bor), 'error' (yuklab bo'lmadi va keshda ham yo'q).
 * Keshdagi katalog bo'lsa darhol 'ready' — sahifa kutmasdan ochiladi.
 */
export function useCatalogStatus(): 'loading' | 'ready' | 'error' {
  return useCatalogStore((s) => (s.products.length > 0 ? 'ready' : s.status === 'error' ? 'error' : 'loading'));
}

export function useProduct(id: string | undefined): Product | undefined {
  return useCatalogStore((s) => (id ? s.products.find((p) => p.id === id) : undefined));
}
