import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { z } from 'zod';
import type { OrderStatus } from '@/types';
import { guestOrderRefSchema } from '@/utils/schemas';
import { createSafeStorage, passthroughMigrate, validatedMerge } from '@/utils/storage';

/**
 * Buyurtmalarning o'zi serverda saqlanadi. Bu yerda faqat mehmon (ro'yxatdan
 * o'tmagan) xaridor o'z buyurtmalarini qayta ko'rishi uchun ID + track token saqlanadi.
 */
export interface GuestOrderRef {
  id: string;
  token: string;
  createdAt: string;
}

interface OrderRefState {
  guestOrders: GuestOrderRef[];
  remember: (ref: GuestOrderRef) => void;
  tokenFor: (id: string) => string | undefined;
}

const persistedSchema = z.object({ guestOrders: z.array(guestOrderRefSchema).max(30) });

export const useOrderStore = create<OrderRefState>()(
  persist(
    (set, get) => ({
      guestOrders: [],
      remember: (ref) => set((s) => ({ guestOrders: [ref, ...s.guestOrders.filter((o) => o.id !== ref.id)].slice(0, 30) })),
      tokenFor: (id) => get().guestOrders.find((o) => o.id === id)?.token,
    }),
    {
      name: 'erizon-orders',
      version: 2,
      storage: createSafeStorage(),
      partialize: (s) => ({ guestOrders: s.guestOrders }),
      merge: validatedMerge<OrderRefState>(persistedSchema),
      migrate: passthroughMigrate,
    },
  ),
);

export const STATUS_FLOW: OrderStatus[] = ['accepted', 'preparing', 'on_the_way', 'delivered'];
