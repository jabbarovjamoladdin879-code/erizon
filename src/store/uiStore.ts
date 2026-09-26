import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { z } from 'zod';
import type { Lang, Theme } from '@/types';
import { createSafeStorage, passthroughMigrate, validatedMerge } from '@/utils/storage';

interface UiState {
  theme: Theme;
  lang: Lang;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setLang: (lang: Lang) => void;
}

const persistedSchema = z.object({
  theme: z.enum(['light', 'dark']),
  lang: z.enum(['uz', 'ru', 'kaa']),
});

function systemTheme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: systemTheme(),
      lang: 'uz',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      setLang: (lang) => set({ lang }),
    }),
    {
      name: 'erizon-ui',
      version: 1,
      storage: createSafeStorage(),
      partialize: (s) => ({ theme: s.theme, lang: s.lang }),
      merge: validatedMerge<UiState>(persistedSchema),
      migrate: passthroughMigrate,
    },
  ),
);
