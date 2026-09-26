import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Factory, GitCompareArrows, Heart, PackageCheck, PackageX, Ruler, ShoppingCart, Timer, Zap, CalendarClock } from 'lucide-react';
import { FastFoodConfigurator } from '@/components/product/FastFoodConfigurator';
import { HalalBadge } from '@/components/product/HalalBadge';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ProductRail } from '@/components/product/ProductRail';
import { QuickBuyModal } from '@/components/product/QuickBuyModal';
import { ReviewsSection } from '@/components/product/ReviewsSection';
import { SizeChartModal } from '@/components/product/SizeChartModal';
import { MobileActionBar, MobileActionBarSpacer } from '@/components/layout/MobileActionBar';
import { Button } from '@/components/ui/Button';
import { PriceTag } from '@/components/ui/PriceTag';
import { QtyStepper } from '@/components/ui/QtyStepper';
import { Stars } from '@/components/ui/Stars';
import { CUT_SURCHARGE, QTY_MAX, WEIGHT_MAX, WEIGHT_MIN, WEIGHT_STEP } from '@/data/options';
import { useNow } from '@/hooks/useNow';
import { DEFAULT_FASTFOOD, useProductActions } from '@/hooks/useProductActions';
import { useSeo } from '@/hooks/useSeo';
import { usePrice, useT } from '@/hooks/useT';
import { useCatalogStore, useProduct } from '@/store/catalogStore';
import { useListsStore } from '@/store/listsStore';
import { api } from '@/services/api';
import { StockAlertButton } from '@/components/product/StockAlertButton';
import { toast } from '@/store/toastStore';
import { MEAT_CUTS, type CartItemOptions, type FastFoodOptions, type MeatCut, type Product } from '@/types';
import { cn } from '@/utils/cn';
import { getEffectivePrice, getOptionsSurcharge } from '@/utils/pricing';
import { getBoughtTogether, getSimilar } from '@/utils/recommend';
import NotFoundPage from './NotFoundPage';

function ProductDetails({ product }: { product: Product }) {
  const t = useT();
  const fmt = usePrice();
  const products = useCatalogStore((s) => s.products);
  const deal = useCatalogStore((s) => s.deal);
  const pushRecent = useListsStore((s) => s.pushRecent);
  const isFav = useListsStore((s) => s.favorites.includes(product.id));
  const inCompare = useListsStore((s) => s.compare.includes(product.id));
  const { addToCart, onToggleFavorite, onToggleCompare } = useProductActions();
  const now = useNow(30_000);

  const weighted = product.unit === 'kg';
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(product.colors?.[0]?.name ?? null);
  const [cut, setCut] = useState<MeatCut>('pieces');
  const [ff, setFf] = useState<FastFoodOptions>(DEFAULT_FASTFOOD);
  const [sizeChart, setSizeChart] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  useSeo(product.name, product.description);
  useEffect(() => pushRecent(product.id), [product.id, pushRecent]);
  // Ko'rishlar statistikasi (server bitta IP dan takroriy hisobni cheklaydi)
  useEffect(() => {
    api.trackView(product.id).catch(() => undefined);
  }, [product.id]);

  const options: CartItemOptions | undefined = useMemo(() => {
    if (product.categoryId === 'fastfood') return { fastfood: ff };
    if (product.cuttable) return { cut };
    if (product.sizes || product.colors) return { size: size ?? undefined, color: color ?? undefined };
    return undefined;
  }, [product, ff, cut, size, color]);

  const base = getEffectivePrice(product, deal, now);
  const unitPrice = base.price + getOptionsSurcharge(product, options);
  const total = Math.round(unitPrice * qty);
  const needsSize = !!product.sizes?.length && !size;

  const bought = useMemo(() => getBoughtTogether(product, products), [product, products]);
  const similar = useMemo(() => getSimilar(product, products), [product, products]);

  const onAdd = () => {
    if (needsSize) {
      toast.error(t('product.chooseSize'));
      return;
    }
    addToCart(product, qty, options);
  };

  const onQuick = () => {
    if (needsSize) {
      toast.error(t('product.chooseSize'));
      return;
    }
    setQuickOpen(true);
  };

  const specs: Array<[string, string]> = [
    [t('product.category'), t(`cat.${product.categoryId}`)],
    [t('product.unit'), t(`unit.${product.unit}`)],
    ...(product.manufacturer ? [[t('product.manufacturer'), product.manufacturer] as [string, string]] : []),
    ...(product.expiry ? [[t('product.expiry'), product.expiry] as [string, string]] : []),
    ...Object.entries(product.specs ?? {}),
  ];

  return (
    <div className="container-page py-6">
      <nav aria-label={t('common.breadcrumb')} className="muted mb-4 text-sm">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link to="/" className="hover:text-brand-700">{t('nav.home')}</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link to={`/catalog?cat=${product.categoryId}`} className="hover:text-brand-700">{t(`cat.${product.categoryId}`)}</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="truncate text-slate-700 dark:text-slate-300">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <ProductGallery product={product} />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.halal && <HalalBadge />}
            {base.isDeal && <span className="rounded-md bg-accent-500 px-2.5 py-1 text-xs font-bold text-white">{t('badge.deal')}</span>}
            {product.prepTime && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <Timer className="h-3.5 w-3.5" aria-hidden="true" />
                {t('product.prepTime', { n: product.prepTime })}
              </span>
            )}
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold',
                product.inStock ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
              )}
            >
              {product.inStock ? <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" /> : <PackageX className="h-3.5 w-3.5" aria-hidden="true" />}
              {product.inStock ? t('product.inStock') : t('product.outOfStock')}
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{product.name}</h1>
          <a href="#reviews-title" className="mt-2 inline-flex items-center gap-2 text-sm">
            <Stars value={product.rating} size="md" />
            <span className="font-semibold">{product.rating.toFixed(1)}</span>
            <span className="muted">· {t('reviews.count', { n: product.reviewsCount })}</span>
          </a>

          <div className="mt-4">
            <PriceTag price={base.price} oldPrice={base.oldPrice} unit={product.unit} size="lg" />
          </div>

          <div className="mt-6 space-y-5">
            {product.sizes && (
              <fieldset>
                <div className="mb-2 flex items-center justify-between">
                  <legend className="text-sm font-bold">{t('product.size')}</legend>
                  <button type="button" onClick={() => setSizeChart(true)} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">
                    <Ruler className="h-4 w-4" aria-hidden="true" />
                    {t('size.chartTitle')}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <label key={s} className={cn('chip min-w-[3rem] cursor-pointer justify-center', size === s && 'chip-active')}>
                      <input type="radio" name="size" value={s} className="sr-only" checked={size === s} onChange={() => setSize(s)} />
                      {s}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {product.colors && (
              <fieldset>
                <legend className="mb-2 text-sm font-bold">
                  {t('product.color')}: <span className="font-medium">{color}</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((c) => (
                    <label key={c.name} className="cursor-pointer" title={c.name}>
                      <input type="radio" name="color" className="peer sr-only" checked={color === c.name} onChange={() => setColor(c.name)} />
                      <span className="sr-only">{c.name}</span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          'block h-9 w-9 rounded-full border-2 ring-offset-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 dark:ring-offset-slate-950',
                          color === c.name ? 'border-brand-600 ring-2 ring-brand-600' : 'border-slate-200 dark:border-slate-700',
                        )}
                        style={{ backgroundColor: c.hex }}
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {product.cuttable && (
              <fieldset>
                <legend className="mb-2 text-sm font-bold">{t('cut.title')}</legend>
                <div className="flex flex-wrap gap-2">
                  {MEAT_CUTS.map((c) => (
                    <label key={c} className={cn('chip cursor-pointer', cut === c && 'chip-active')}>
                      <input type="radio" name="cut" className="sr-only" checked={cut === c} onChange={() => setCut(c)} />
                      {t(`cut.${c}`)}
                      {CUT_SURCHARGE[c] > 0 && ` +${fmt(CUT_SURCHARGE[c])}/${t('unit.kg')}`}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {product.categoryId === 'fastfood' && <FastFoodConfigurator value={ff} onChange={setFf} />}

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
              <div>
                <div className="mb-1 text-sm font-bold">{weighted ? t('product.weight') : t('qty.label')}</div>
                <QtyStepper
                  value={qty}
                  onChange={setQty}
                  step={weighted ? WEIGHT_STEP : 1}
                  min={weighted ? WEIGHT_MIN : 1}
                  max={weighted ? WEIGHT_MAX : QTY_MAX}
                  suffix={weighted ? t('unit.kg') : undefined}
                />
              </div>
              <div className="text-right">
                <div className="muted text-xs">{t('cart.total')}</div>
                <div className="text-2xl font-extrabold tabular-nums" aria-live="polite">{fmt(total)}</div>
              </div>
            </div>

            {product.inStock ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <Button size="lg" onClick={onAdd}>
                  <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                  {t('product.addToCart')}
                </Button>
                <Button size="lg" variant="accent" onClick={onQuick}>
                  <Zap className="h-5 w-5" aria-hidden="true" />
                  {t('quick.button')}
                </Button>
              </div>
            ) : (
              <StockAlertButton productId={product.id} />
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => onToggleFavorite(product)} aria-pressed={isFav}>
                <Heart className={cn('h-4 w-4', isFav && 'fill-red-500 text-red-500')} aria-hidden="true" />
                {isFav ? t('product.inFav') : t('product.addFav')}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => onToggleCompare(product)} aria-pressed={inCompare}>
                <GitCompareArrows className={cn('h-4 w-4', inCompare && 'text-brand-600')} aria-hidden="true" />
                {inCompare ? t('product.inCompare') : t('product.compare')}
              </Button>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <div>
              <h2 className="mb-2 text-lg font-bold">{t('product.description')}</h2>
              <p className="leading-relaxed text-slate-700 dark:text-slate-300">{product.description}</p>
            </div>
            {(product.manufacturer || product.expiry) && (
              <div className="grid gap-2 sm:grid-cols-2">
                {product.manufacturer && (
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <Factory className="h-5 w-5 text-brand-600" aria-hidden="true" />
                    <div>
                      <div className="muted text-xs">{t('product.manufacturer')}</div>
                      <div className="text-sm font-semibold">{product.manufacturer}</div>
                    </div>
                  </div>
                )}
                {product.expiry && (
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <CalendarClock className="h-5 w-5 text-brand-600" aria-hidden="true" />
                    <div>
                      <div className="muted text-xs">{t('product.expiry')}</div>
                      <div className="text-sm font-semibold">{product.expiry}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div>
              <h2 className="mb-2 text-lg font-bold">{t('product.specs')}</h2>
              <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm dark:divide-slate-800 dark:border-slate-800">
                {specs.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
                    <dt className="muted">{k}</dt>
                    <dd className="text-right font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>

      <ProductRail title={t('product.boughtTogether')} products={bought} />
      <ReviewsSection product={product} />
      <ProductRail title={t('product.similar')} products={similar} moreHref={`/catalog?cat=${product.categoryId}`} />

      <MobileActionBarSpacer />
      <MobileActionBar label={t('product.addToCart')}>
        <div className="min-w-0 flex-1">
          <div className="muted truncate text-[11px]">
            {weighted ? `${qty} ${t('unit.kg')}` : `${qty} × ${fmt(unitPrice)}`}
          </div>
          <div className="text-lg font-extrabold leading-tight tabular-nums">{fmt(total)}</div>
        </div>
        <Button variant="accent" size="icon" onClick={onQuick} disabled={!product.inStock} aria-label={t('quick.button')}>
          <Zap className="h-5 w-5" />
        </Button>
        <Button onClick={onAdd} disabled={!product.inStock} className="px-5">
          <ShoppingCart className="h-4 w-4" aria-hidden="true" />
          {product.inStock ? t('product.toCart') : t('product.outOfStock')}
        </Button>
      </MobileActionBar>

      {product.sizes && <SizeChartModal open={sizeChart} onClose={() => setSizeChart(false)} kids={product.gender === 'kids'} />}
      <QuickBuyModal open={quickOpen} onClose={() => setQuickOpen(false)} product={product} qty={qty} options={options} total={total} />
    </div>
  );
}

export default function ProductPage() {
  const { id } = useParams();
  const product = useProduct(id);
  if (!product) return <NotFoundPage />;
  return <ProductDetails key={product.id} product={product} />;
}
