import { useCallback } from 'react';
import { translate, type TFunction } from '@/i18n';
import { useUiStore } from '@/store/uiStore';
import { formatNumber } from '@/utils/format';

export function useT(): TFunction {
  const lang = useUiStore((s) => s.lang);
  return useCallback<TFunction>((key, params) => translate(lang, key, params), [lang]);
}

/** Narxni "125 000 so'm" formatida qaytaradi */
export function usePrice(): (value: number) => string {
  const t = useT();
  return useCallback((value: number) => `${formatNumber(value)} ${t('currency')}`, [t]);
}
