import { useCallback } from 'react';
import { useCartStore } from '@/store/cartStore';
import { useListsStore } from '@/store/listsStore';
import { toast } from '@/store/toastStore';
import type { CartItemOptions, FastFoodOptions, Product } from '@/types';
import { clampQty } from '@/utils/pricing';
import { useT } from './useT';

export const DEFAULT_FASTFOOD: FastFoodOptions = { sauce: 'ketchup', extraCheese: false, spicy: false, extras: [] };

/** Mahsulot kartochkasidan tezkor qo'shishda standart sozlamalar */
export function defaultOptionsFor(product: Product): CartItemOptions | undefined {
  if (product.categoryId === 'fastfood') return { fastfood: DEFAULT_FASTFOOD };
  if (product.cuttable) return { cut: 'pieces' };
  return undefined;
}

/** Kiyimlarda o'lcham tanlash majburiy — kartochkadan to'g'ridan-to'g'ri qo'shilmaydi */
export function needsSelection(product: Product): boolean {
  return !!product.sizes?.length || !!product.colors?.length;
}

export function useProductActions() {
  const t = useT();
  const add = useCartStore((s) => s.add);
  const toggleFavorite = useListsStore((s) => s.toggleFavorite);
  const toggleCompare = useListsStore((s) => s.toggleCompare);

  const addToCart = useCallback(
    (product: Product, qty = 1, options?: CartItemOptions) => {
      if (!product.inStock) {
        toast.error(t('product.outOfStock'));
        return;
      }
      add('product', product.id, clampQty(product.unit, qty), options ?? defaultOptionsFor(product));
      toast.success(t('toast.addedToCart'));
    },
    [add, t],
  );

  const onToggleFavorite = useCallback(
    (product: Product) => {
      const added = toggleFavorite(product.id);
      toast.info(added ? t('toast.favAdded') : t('toast.favRemoved'));
    },
    [toggleFavorite, t],
  );

  const onToggleCompare = useCallback(
    (product: Product) => {
      const res = toggleCompare(product.id);
      if (res === 'full') toast.error(t('toast.compareFull'));
      else toast.info(res === 'added' ? t('toast.compareAdded') : t('toast.compareRemoved'));
    },
    [toggleCompare, t],
  );

  return { addToCart, onToggleFavorite, onToggleCompare };
}
