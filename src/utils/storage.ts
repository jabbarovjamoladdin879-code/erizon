import type { PersistStorage, StorageValue } from 'zustand/middleware';
import type { z } from 'zod';

/**
 * localStorage uchun xavfsiz adapter: JSON xatolari, to'lib qolgan xotira yoki
 * bloklangan storage saytni ishdan chiqarmaydi.
 */
export function createSafeStorage<S>(kind: 'local' | 'session' = 'local'): PersistStorage<S> {
  const getStore = (): Storage | null => {
    try {
      return kind === 'local' ? window.localStorage : window.sessionStorage;
    } catch {
      return null;
    }
  };
  return {
    getItem: (name) => {
      try {
        const raw = getStore()?.getItem(name);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && 'state' in parsed) {
          return parsed as StorageValue<S>;
        }
        return null;
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      try {
        getStore()?.setItem(name, JSON.stringify(value));
      } catch {
        /* xotira to'lgan yoki bloklangan — jimgina o'tkazib yuboramiz */
      }
    },
    removeItem: (name) => {
      try {
        getStore()?.removeItem(name);
      } catch {
        /* e'tiborsiz */
      }
    },
  };
}

/**
 * Saqlangan holatni Zod bilan tekshiradi. Ma'lumot buzilgan yoki qo'lda
 * o'zgartirilgan bo'lsa — standart (joriy) holatga qaytadi.
 */
export function validatedMerge<T>(schema: z.ZodType<Partial<T>, z.ZodTypeDef, unknown>) {
  return (persisted: unknown, current: T): T => {
    const result = schema.safeParse(persisted);
    if (!result.success) return current;
    return { ...current, ...result.data };
  };
}

/** Versiya almashganda konsolda xato chiqmasligi uchun: ma'lumotni merge'da qayta tekshiramiz */
export function passthroughMigrate(persisted: unknown): never {
  return persisted as never;
}
