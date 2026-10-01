import { Flame, Plus } from 'lucide-react';
import { EXTRA_CHEESE_PRICE, EXTRAS, SAUCES } from '@/data/options';
import { usePrice, useT } from '@/hooks/useT';
import type { FastFoodOptions } from '@/types';
import { cn } from '@/utils/cn';

interface Props {
  value: FastFoodOptions;
  onChange: (v: FastFoodOptions) => void;
}

/** Taomni sozlash: sous, pishloq, achchiqlik, qo'shimchalar — narx avtomatik o'zgaradi */
export function FastFoodConfigurator({ value, onChange }: Props) {
  const t = useT();
  const fmt = usePrice();
  const plus = (p: number) => (p > 0 ? ` +${fmt(p)}` : '');

  const toggleExtra = (id: string) =>
    onChange({
      ...value,
      extras: value.extras.includes(id) ? value.extras.filter((e) => e !== id) : [...value.extras, id],
    });

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <h3 className="font-bold">{t('ff.customize')}</h3>
      <fieldset>
        <legend className="label">{t('ff.sauce')}</legend>
        <div className="flex flex-wrap gap-2">
          {SAUCES.map((s) => (
            <label key={s.id} className={cn('chip cursor-pointer', value.sauce === s.id && 'chip-active')}>
              <input
                type="radio"
                name="sauce"
                className="sr-only"
                checked={value.sauce === s.id}
                onChange={() => onChange({ ...value, sauce: s.id })}
              />
              {t(`ff.sauce.${s.id}`)}
              {plus(s.price)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <label className={cn('chip cursor-pointer', value.extraCheese && 'chip-active')}>
          <input
            type="checkbox"
            className="sr-only"
            checked={value.extraCheese}
            onChange={(e) => onChange({ ...value, extraCheese: e.target.checked })}
          />
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> {t('ff.extraCheese')}
          {plus(EXTRA_CHEESE_PRICE)}
        </label>
        <fieldset className="contents">
          <legend className="sr-only">{t('ff.spiciness')}</legend>
          <label className={cn('chip cursor-pointer', !value.spicy && 'chip-active')}>
            <input type="radio" name="spicy" className="sr-only" checked={!value.spicy} onChange={() => onChange({ ...value, spicy: false })} />
            {t('ff.notSpicy')}
          </label>
          <label className={cn('chip cursor-pointer', value.spicy && 'chip-active')}>
            <input type="radio" name="spicy" className="sr-only" checked={value.spicy} onChange={() => onChange({ ...value, spicy: true })} />
            <Flame className="h-3.5 w-3.5" aria-hidden="true" /> {t('ff.spicy')}
          </label>
        </fieldset>
      </div>

      <fieldset>
        <legend className="label">{t('ff.extras')}</legend>
        <div className="flex flex-wrap gap-2">
          {EXTRAS.map((ex) => (
            <label key={ex.id} className={cn('chip cursor-pointer', value.extras.includes(ex.id) && 'chip-active')}>
              <input type="checkbox" className="sr-only" checked={value.extras.includes(ex.id)} onChange={() => toggleExtra(ex.id)} />
              {t(`ff.extra.${ex.id}`)}
              {plus(ex.price)}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
