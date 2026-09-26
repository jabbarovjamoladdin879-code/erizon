import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '@/store/cartStore';
import { getProductMap, useCatalogStore } from '@/store/catalogStore';
import { toast } from '@/store/toastStore';
import type { Order } from '@/types';
import { useT } from './useT';

/** "Qayta buyurtma berish": eski buyurtma qatorlarini joriy narxlar bilan savatga qo'shadi */
export function useReorder(): (order: Order) => void {
  const t = useT();
  const navigate = useNavigate();
  const add = useCartStore((s) => s.add);
  return useCallback(
    (order) => {
      const products = getProductMap(useCatalogStore.getState().products);
      let added = 0;
      let skipped = 0;
      for (const line of order.lines) {
        const available = line.kind === 'combo' || products.get(line.refId)?.inStock;
        if (!available) {
          skipped += 1;
          continue;
        }
        add(line.kind, line.refId, line.qty, line.options);
        added += 1;
      }
      if (added) toast.success(t('reorder.done', { n: added }));
      if (skipped) toast.info(t('reorder.skipped', { n: skipped }));
      if (added) navigate('/cart');
    },
    [add, navigate, t],
  );
}
