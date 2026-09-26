import { useCallback, useEffect, useMemo, useState } from 'react';
import { EXTRAS, SAUCES } from '@/data/options';
import { api, type QuoteParams } from '@/services/api';
import { useCartStore } from '@/store/cartStore';
import { useCatalogStore, useProductMap } from '@/store/catalogStore';
import type { CartItemOptions, Product, Quote } from '@/types';
import { computeCartLines, type CartLine } from '@/utils/pricing';
import { useDebounce } from './useDebounce';
import { useNow } from './useNow';
import { useT } from './useT';

/** Savat qatorlari — tezkor ko'rsatish uchun lokal hisob (yakuniy summa serverdan: useQuote) */
export function useCartLines(): { lines: CartLine[]; subtotal: number; hasUnavailable: boolean } {
  const items = useCartStore((s) => s.items);
  const deal = useCatalogStore((s) => s.deal);
  const map = useProductMap();
  const now = useNow(60_000);
  return useMemo(() => {
    const lines = computeCartLines(items, map, deal, now);
    return {
      lines,
      subtotal: lines.reduce((s, l) => s + l.lineTotal, 0),
      hasUnavailable: lines.some((l) => !l.available),
    };
  }, [items, map, deal, now]);
}

/** Tanlangan sozlamalarni o'qiladigan matnga aylantiradi (joriy tilda) */
export function useDescribeOptions(): (product: Product | undefined, options?: CartItemOptions) => string {
  const t = useT();
  return useCallback(
    (product, options) => {
      if (!options) return '';
      const parts: string[] = [];
      if (options.size) parts.push(`${t('product.size')}: ${options.size}`);
      if (options.color) parts.push(`${t('product.color')}: ${options.color}`);
      if (options.cut && product?.cuttable) parts.push(t(`cut.${options.cut}`));
      if (options.fastfood && product?.categoryId === 'fastfood') {
        const ff = options.fastfood;
        const sauce = SAUCES.find((s) => s.id === ff.sauce);
        if (sauce) parts.push(`${t('ff.sauce')}: ${t(`ff.sauce.${sauce.id}`)}`);
        if (ff.extraCheese) parts.push(t('ff.extraCheese'));
        parts.push(ff.spicy ? t('ff.spicy') : t('ff.notSpicy'));
        for (const id of ff.extras) {
          const extra = EXTRAS.find((e) => e.id === id);
          if (extra) parts.push(`+ ${t(`ff.extra.${extra.id}`)}`);
        }
      }
      return parts.join(', ');
    },
    [t],
  );
}

/**
 * Server hisobi (narx, promokod, bonus, yetkazish). So'rovlar debounce qilinadi va
 * eski so'rov bekor qilinadi. `params` null bo'lsa — so'rov yuborilmaydi.
 */
export function useQuote(params: QuoteParams | null): { quote: Quote | null; loading: boolean; error: string | null } {
  const key = params && params.items.length ? JSON.stringify(params) : null;
  const debouncedKey = useDebounce(key, 300);
  const [state, setState] = useState<{ key: string | null; quote: Quote | null; error: string | null }>({ key: null, quote: null, error: null });

  useEffect(() => {
    if (!debouncedKey) return undefined;
    const controller = new AbortController();
    const body = JSON.parse(debouncedKey) as QuoteParams;
    api
      .quote(body)
      .then((r) => {
        if (!controller.signal.aborted) setState({ key: debouncedKey, quote: r.quote, error: null });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const code = err instanceof Error ? err.message : 'err.server';
        setState((s) => ({ key: debouncedKey, quote: s.quote, error: code }));
      });
    return () => controller.abort();
  }, [debouncedKey]);

  if (!key) return { quote: null, loading: false, error: null };
  return { quote: state.quote, loading: state.key !== key, error: state.error };
}
