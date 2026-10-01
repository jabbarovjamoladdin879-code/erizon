import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingCart } from 'lucide-react';
import { ProductImage } from '@/components/ui/ProductImage';
import { AppIcon } from '@/components/ui/AppIcon';
import { COMBOS } from '@/data/combos';
import { useNow } from '@/hooks/useNow';
import { usePrice, useT } from '@/hooks/useT';
import { useCartStore } from '@/store/cartStore';
import { useCatalogStore, useProductMap } from '@/store/catalogStore';
import { toast } from '@/store/toastStore';
import type { Combo } from '@/types';
import { formatQty } from '@/utils/format';
import { getComboRegularPrice, isComboAvailable } from '@/utils/pricing';

const ComboCard = memo(function ComboCard({ combo }: { combo: Combo }) {
  const t = useT();
  const fmt = usePrice();
  const map = useProductMap();
  const deal = useCatalogStore((s) => s.deal);
  const add = useCartStore((s) => s.add);
  const now = useNow(60_000);
  const regular = getComboRegularPrice(combo, map, deal, now);
  const available = isComboAvailable(combo, map);
  const saving = Math.max(0, regular - combo.price);

  return (
    <article className="card flex flex-col p-4">
      <div className="flex items-center gap-3">
        <ProductImage icon={combo.icon} hue={combo.hue} alt="" className="h-16 w-16 shrink-0 rounded-xl" />
        <div>
          <h3 className="font-bold leading-tight">{t(combo.nameKey)}</h3>
          {saving > 0 && (
            <span className="mt-1 inline-block rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              {t('combo.save', { sum: fmt(saving) })}
            </span>
          )}
        </div>
      </div>
      <ul className="mt-3 flex-1 space-y-1 text-sm">
        {combo.items.map((item) => {
          const p = map.get(item.productId);
          if (!p) return null;
          return (
            <li key={item.productId} className="flex justify-between gap-2">
              <Link to={`/product/${p.id}`} className="muted flex min-w-0 items-center gap-2 hover:text-brand-700">
                <AppIcon name={p.icon} className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="truncate">{p.name}</span>
              </Link>
              <span className="shrink-0 font-medium">
                {formatQty(item.qty)} {t(`unit.${p.unit}`)}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-xl font-bold text-accent-600 dark:text-accent-400">{fmt(combo.price)}</div>
          {regular > combo.price && <div className="text-xs text-slate-400 line-through">{fmt(regular)}</div>}
        </div>
        <button
          type="button"
          disabled={!available}
          onClick={() => {
            add('combo', combo.id, 1);
            toast.success(t('toast.addedToCart'));
          }}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-600 transition hover:bg-brand-700 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
        >
          <ShoppingCart className="h-4 w-4" aria-hidden="true" />
          {available ? t('product.toCart') : t('product.outOfStock')}
        </button>
      </div>
    </article>
  );
});

export function ComboSection() {
  const t = useT();
  return (
    <section className="py-6" aria-labelledby="combo-title">
      <h2 id="combo-title" className="section-title mb-4 flex items-center gap-2">
        <Package className="h-6 w-6 text-brand-600" aria-hidden="true" />
        {t('home.combos')}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {COMBOS.map((c) => (
          <ComboCard key={c.id} combo={c} />
        ))}
      </div>
    </section>
  );
}
