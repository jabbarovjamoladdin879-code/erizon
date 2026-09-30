import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, ShoppingBag, Trash2 } from 'lucide-react';
import { OrderSummary } from '@/components/cart/OrderSummary';
import { PromoBox } from '@/components/cart/PromoBox';
import { MobileActionBar, MobileActionBarSpacer } from '@/components/layout/MobileActionBar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProductImage } from '@/components/ui/ProductImage';
import { QtyStepper } from '@/components/ui/QtyStepper';
import { QTY_MAX, WEIGHT_MAX, WEIGHT_MIN, WEIGHT_STEP } from '@/data/options';
import { useCartLines, useDescribeOptions, useQuote } from '@/hooks/useCart';
import { useSeo } from '@/hooks/useSeo';
import { usePrice, useT } from '@/hooks/useT';
import { useCurrentUser } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useCatalogStatus } from '@/store/catalogStore';
import { CatalogError } from '@/components/CatalogError';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { toast } from '@/store/toastStore';

export default function CartPage() {
  const t = useT();
  const fmt = usePrice();
  const navigate = useNavigate();
  useSeo(t('nav.cart'));
  const { lines, subtotal, hasUnavailable } = useCartLines();
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);
  const useBonus = useCartStore((s) => s.useBonus);
  const items = useCartStore((s) => s.items);
  const promoCode = useCartStore((s) => s.promoCode);
  const user = useCurrentUser();
  const describe = useDescribeOptions();
  const catalogStatus = useCatalogStatus();

  const quoteParams = useMemo(
    () => ({ items, promoCode: promoCode ?? undefined, useBonus: useBonus && !!user, deliveryMethod: 'pickup' as const }),
    [items, promoCode, useBonus, user],
  );
  const { quote, loading } = useQuote(quoteParams);
  const total = quote?.total ?? subtotal;

  // Savatda mahsulot bor, lekin katalog hali kelmagan — "savat bo'sh" deb ko'rsatmaymiz
  if (items.length > 0 && catalogStatus === 'loading') return <PageSkeleton />;
  if (items.length > 0 && catalogStatus === 'error') return <CatalogError />;

  if (lines.length === 0) {
    return (
      <div className="container-page py-8">
        <EmptyState
          icon={ShoppingBag}
          titleAs="h1"
          title={t('cart.empty')}
          text={t('cart.emptyText')}
          action={<Link to="/catalog" className="inline-flex h-11 items-center rounded-2xl bg-brand-gradient shadow-glow transition hover:brightness-110 active:scale-[0.97] px-5 text-sm font-semibold text-white">{t('cart.goShopping')}</Link>}
        />
      </div>
    );
  }

  return (
    <div className="container-page py-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold sm:text-3xl">
          {t('nav.cart')} <span className="muted text-base font-medium">({lines.length})</span>
        </h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            clear();
            toast.info(t('toast.cartCleared'));
          }}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {t('cart.clear')}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          {hasUnavailable && (
            <p className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" role="alert">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t('cart.unavailableNote')}
            </p>
          )}
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {lines.map((line) => {
                const { item, product, combo } = line;
                const name = combo ? t(combo.nameKey) : (product?.name ?? '');
                const emoji = combo?.emoji ?? product?.emoji ?? '📦';
                const hue = combo?.hue ?? product?.hue ?? 260;
                const weighted = line.unit === 'kg';
                const optionsText = describe(product, item.options);
                const href = product ? `/product/${product.id}` : '/';
                return (
                  <motion.li
                    key={item.key}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    className="card flex gap-3 p-3 sm:gap-4 sm:p-4"
                  >
                    <Link to={href} className="shrink-0" tabIndex={-1} aria-hidden="true">
                      <ProductImage emoji={emoji} hue={hue} alt="" className={line.available ? 'h-20 w-20 rounded-xl sm:h-24 sm:w-24' : 'h-20 w-20 rounded-xl opacity-50 grayscale sm:h-24 sm:w-24'} />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link to={href} className="line-clamp-2 font-semibold hover:text-brand-700">
                            {name}
                          </Link>
                          {optionsText && <p className="muted mt-0.5 text-xs">{optionsText}</p>}
                          {combo && (
                            <p className="muted mt-0.5 text-xs">{t('cart.comboItems', { n: combo.items.length })}</p>
                          )}
                          <p className="muted mt-0.5 text-xs">
                            {fmt(line.unitPrice)}
                            {weighted ? ` / ${t('unit.kg')}` : ''}
                          </p>
                          {!line.available && <p className="mt-1 text-xs font-semibold text-red-600">{t('product.outOfStock')}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            remove(item.key);
                            toast.info(t('toast.removed'));
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                          aria-label={`${t('common.remove')}: ${name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                        <QtyStepper
                          size="sm"
                          value={item.qty}
                          onChange={(v) => setQty(item.key, v)}
                          step={weighted ? WEIGHT_STEP : 1}
                          min={weighted ? WEIGHT_MIN : 1}
                          max={weighted ? WEIGHT_MAX : QTY_MAX}
                          suffix={weighted ? t('unit.kg') : undefined}
                        />
                        <span className="whitespace-nowrap text-base font-extrabold tabular-nums sm:text-lg">{fmt(line.lineTotal)}</span>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <OrderSummary quote={quote} fallbackSubtotal={subtotal} loading={loading} user={user} showDelivery={false} deliveryKnown={false}>
            <PromoBox promo={quote?.promo ?? null} loading={loading} />
          </OrderSummary>
          <p className="muted mt-3 px-1 text-xs">{t('cart.deliveryAtCheckout')}</p>
          <Button block size="lg" className="mt-3 hidden md:inline-flex" disabled={subtotal <= 0} onClick={() => navigate('/checkout')}>
            {t('cart.checkout')}
          </Button>
        </aside>
      </div>

      <MobileActionBarSpacer />
      <MobileActionBar label={t('cart.summary')}>
        <div className="min-w-0 flex-1">
          <div className="muted text-[11px]">{t('cart.total')}</div>
          <div className="text-lg font-extrabold leading-tight tabular-nums">{fmt(total)}</div>
        </div>
        <Button disabled={subtotal <= 0} onClick={() => navigate('/checkout')} className="px-6">
          {t('cart.checkout')}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </MobileActionBar>
    </div>
  );
}
