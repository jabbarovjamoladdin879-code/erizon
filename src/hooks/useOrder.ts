import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';
import { ApiRequestError } from '@/services/http';
import { useOrderStore } from '@/store/orderStore';
import type { Order } from '@/types';

const ORDER_ID_RE = /^EM-[A-Z0-9]{5,12}$/;

/**
 * Buyurtmani serverdan olish (egasi sessiya orqali, mehmon esa maxfiy track token bilan).
 * Holat o'zgarishini ko'rsatish uchun har 20 soniyada yangilanadi.
 */
export function useOrder(id: string | undefined, token?: string | null): { order: Order | null; status: 'loading' | 'ready' | 'notFound' | 'error'; reload: () => void } {
  const storedToken = useOrderStore((s) => (id ? s.guestOrders.find((o) => o.id === id)?.token : undefined));
  const effectiveToken = token || storedToken;
  const [state, setState] = useState<{ order: Order | null; status: 'loading' | 'ready' | 'notFound' | 'error' }>({ order: null, status: 'loading' });
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  // Noto'g'ri formatdagi raqam — serverga so'rov yubormasdan "topilmadi"
  const validId = !!id && ORDER_ID_RE.test(id);

  useEffect(() => {
    if (!id || !validId) return undefined;
    let alive = true;
    api
      .trackOrder(id, effectiveToken)
      .then((r) => {
        if (!alive) return;
        const found = r.order;
        setState((s) => (found ? { order: found, status: 'ready' } : s.order ? s : { order: null, status: 'notFound' }));
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setState((s) => (s.order ? s : { order: null, status: err instanceof ApiRequestError && err.status === 404 ? 'notFound' : 'error' }));
      });
    return () => {
      alive = false;
    };
  }, [id, validId, effectiveToken, tick]);

  useEffect(() => {
    if (!validId || state.order?.status === 'delivered' || state.order?.status === 'cancelled') return undefined;
    const timer = window.setInterval(reload, 20_000);
    return () => window.clearInterval(timer);
  }, [validId, state.order?.status, reload]);

  if (id && !validId) return { order: null, status: 'notFound', reload };
  return { ...state, reload };
}
