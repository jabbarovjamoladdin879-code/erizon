import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { z } from 'zod';
import { COMPARE_MAX, RECENT_MAX } from '@/data/options';
import { createSafeStorage, passthroughMigrate, validatedMerge } from '@/utils/storage';

/** Sevimlilar, solishtirish va yaqinda ko'rilganlar ro'yxatlari */
interface ListsState {
  favorites: string[];
  compare: string[];
  recent: string[];
  toggleFavorite: (id: string) => boolean;
  /** Natija: 'added' | 'removed' | 'full' */
  toggleCompare: (id: string) => 'added' | 'removed' | 'full';
  removeCompare: (id: string) => void;
  clearCompare: () => void;
  pushRecent: (id: string) => void;
  clearRecent: () => void;
}

const idList = (max: number) => z.array(z.string().min(1).max(40)).max(max);

const persistedSchema = z.object({
  favorites: idList(500),
  compare: idList(COMPARE_MAX),
  recent: idList(RECENT_MAX),
});

export const useListsStore = create<ListsState>()(
  persist(
    (set, get) => ({
      favorites: [],
      compare: [],
      recent: [],
      toggleFavorite: (id) => {
        const has = get().favorites.includes(id);
        set({ favorites: has ? get().favorites.filter((f) => f !== id) : [id, ...get().favorites] });
        return !has;
      },
      toggleCompare: (id) => {
        const list = get().compare;
        if (list.includes(id)) {
          set({ compare: list.filter((c) => c !== id) });
          return 'removed';
        }
        if (list.length >= COMPARE_MAX) return 'full';
        set({ compare: [...list, id] });
        return 'added';
      },
      removeCompare: (id) => set({ compare: get().compare.filter((c) => c !== id) }),
      clearCompare: () => set({ compare: [] }),
      pushRecent: (id) => set({ recent: [id, ...get().recent.filter((r) => r !== id)].slice(0, RECENT_MAX) }),
      clearRecent: () => set({ recent: [] }),
    }),
    {
      name: 'erizon-lists',
      version: 1,
      storage: createSafeStorage(),
      partialize: (s) => ({ favorites: s.favorites, compare: s.compare, recent: s.recent }),
      merge: validatedMerge<ListsState>(persistedSchema),
      migrate: passthroughMigrate,
    },
  ),
);
