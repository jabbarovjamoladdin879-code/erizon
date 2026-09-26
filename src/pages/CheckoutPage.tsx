import { useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Banknote, CreditCard, MapPin, ShieldCheck, Store, Truck, Wallet } from 'lucide-react';
import { OrderSummary } from '@/components/cart/OrderSummary';
import { DeliveryMap } from '@/components/DeliveryMap';
import { MobileActionBar, MobileActionBarSpacer } from '@/components/layout/MobileActionBar';
import { Button } from '@/components/ui/Button';
import { InputField, TextareaField } from '@/components/ui/Field';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { DELIVERY_SLOTS, DELIVERY_ZONES, STORE_INFO, ZONE_MAP } from '@/data/zones';
import { useCartLines, useQuote } from '@/hooks/useCart';
import { useErrorMessage, useFieldError, useSubmitGuard } from '@/hooks/useFormHelpers';
import { useSeo } from '@/hooks/useSeo';
import { usePrice, useT } from '@/hooks/useT';
import { api } from '@/services/api';
import { useCurrentUser } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useCatalogStore } from '@/store/catalogStore';
import { useOrderStore } from '@/store/orderStore';
import { toast } from '@/store/toastStore';
import { PAYMENT_METHODS, type PaymentMethod } from '@/types';
import { cn } from '@/utils/cn';
import { formatPhoneMask, isValidPhone, normalizePhone } from '@/utils/phone';
import { sanitizeText } from '@/utils/sanitize';
import { checkoutSchema, type CheckoutForm } from '@/utils/validation';

const PAY_ICONS: Record<PaymentMethod, typeof Wallet> = { cash: Banknote, click: CreditCard, payme: Wallet };

/** Faqat rasmiy to'lov sahifalariga yo'naltirishga ruxsat (open redirect himoyasi) */
function isTrustedPaymentUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && ['checkout.paycom.uz', 'test.paycom.uz', 'my.click.uz'].includes(u.hostname);
  } catch {
    return false;
  }
}

export default function CheckoutPage() {
  const t = useT();
  const fmt = usePrice();
  const navigate = useNavigate();
  useSeo(t('checkout.title'));
  const user = useCurrentUser();
  const items = useCartStore((s) => s.items);
  const promoCode = useCartStore((s) => s.promoCode);
  const useBonus = useCartStore((s) => s.useBonus);
  const clearCart = useCartStore((s) => s.clear);
  const payments = useCatalogStore((s) => s.config.payments);
  const rememberOrder = useOrderStore((s) => s.remember);
  const { lines, subtotal } = useCartLines();
  const fieldError = useFieldError();
  const errorMessage = useErrorMessage();
  const guard = useSubmitGuard(3, 60_000);
  const [submitting, setSubmitting] = useState(false);
  // Bir xil buyurtma ikki marta yaratilmasligi uchun (tarmoq uzilib qayta yuborilsa ham)
  const idempotencyKey = useRef(crypto.randomUUID());

  const firstAddress = user?.addresses[0];
  const { register, handleSubmit, control, watch, setValue, formState } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: user?.name ?? '',
      phone: user ? formatPhoneMask(user.phone) : '',
      deliveryMethod: 'delivery',
      zoneId: firstAddress?.zoneId ?? '',
      address: firstAddress?.address ?? '',
      deliveryTime: 'asap',
      paymentMethod: 'cash',
      comment: '',
    },
  });

  const method = watch('deliveryMethod');
  const zoneId = watch('zoneId');
  const payment = watch('paymentMethod');
  const phone = watch('phone');
  const zone = ZONE_MAP[zoneId] ?? null;
  const hasFastFood = lines.some((l) => l.isFastFood);

  const quoteParams = useMemo(
    () => ({
      items,
      promoCode: promoCode ?? undefined,
      useBonus: useBonus && !!user,
      deliveryMethod: method,
      zoneId: method === 'delivery' && zone ? zone.id : undefined,
      phone: isValidPhone(phone) ? normalizePhone(phone) : undefined,
    }),
    [items, promoCode, useBonus, user, method, zone, phone],
  );
  const { quote, loading } = useQuote(quoteParams);
  const total = quote?.total ?? subtotal;
  const promoOk = !!quote?.promo?.ok;

  if (items.length === 0 && !submitting) return <Navigate to="/cart" replace />;

  const onSubmit = handleSubmit(async (data) => {
    if (submitting || !guard()) return;
    setSubmitting(true);
    try {
      const res = await api.placeOrder(
        {
          items,
          customerName: sanitizeText(data.name, 50),
          phone: normalizePhone(data.phone),
          deliveryMethod: data.deliveryMethod,
          zoneId: data.deliveryMethod === 'delivery' ? data.zoneId : undefined,
          address: data.deliveryMethod === 'delivery' ? sanitizeText(data.address, 200) : undefined,
          deliveryTime: data.deliveryTime,
          paymentMethod: data.paymentMethod,
          comment: sanitizeText(data.comment, 300, { multiline: true }) || undefined,
          promoCode: promoOk && promoCode ? promoCode : undefined,
          useBonus: useBonus && !!user,
        },
        idempotencyKey.current,
      );
      rememberOrder({ id: res.order.id, token: res.trackToken, createdAt: res.order.createdAt });
      clearCart();
      toast.success(t('toast.orderPlaced'));
      if (res.paymentUrl && isTrustedPaymentUrl(res.paymentUrl)) {
        window.location.assign(res.paymentUrl);
        return;
      }
      navigate(`/order/success/${res.order.id}?t=${encodeURIComponent(res.trackToken)}`, { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
      setSubmitting(false);
    }
  });

  return (
    <div className="container-page py-6">
      <h1 className="mb-5 text-2xl font-extrabold sm:text-3xl">{t('checkout.title')}</h1>
      <form id="checkout-form" onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <section className="card space-y-4 p-5" aria-labelledby="c-contact">
            <h2 id="c-contact" className="text-lg font-bold">1. {t('checkout.contact')}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField label={t('form.name')} autoComplete="name" maxLength={50} error={fieldError(formState.errors.name?.message)} {...register('name')} />
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <PhoneInput
                    label={t('form.phone')}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    ref={field.ref}
                    error={fieldError(formState.errors.phone?.message)}
                  />
                )}
              />
            </div>
          </section>

          <section className="card space-y-4 p-5" aria-labelledby="c-delivery">
            <h2 id="c-delivery" className="text-lg font-bold">2. {t('checkout.delivery')}</h2>
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t('checkout.method')}>
              {(['delivery', 'pickup'] as const).map((m) => {
                const Icon = m === 'delivery' ? Truck : Store;
                return (
                  <label
                    key={m}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500',
                      method === m ? 'border-brand-600 bg-brand-50/60 dark:bg-brand-950/40' : 'border-slate-200 dark:border-slate-700',
                    )}
                  >
                    <input type="radio" value={m} className="sr-only" {...register('deliveryMethod')} />
                    <Icon className="h-6 w-6 text-brand-600" aria-hidden="true" />
                    <span>
                      <span className="block font-semibold">{t(`checkout.${m}`)}</span>
                      <span className="muted text-xs">{m === 'delivery' ? t('checkout.deliveryHint') : t('checkout.pickupHint')}</span>
                    </span>
                  </label>
                );
              })}
            </div>

            {method === 'delivery' ? (
              <div className="space-y-4">
                {user && user.addresses.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {user.addresses.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className={cn('chip', zoneId === a.zoneId && watch('address') === a.address && 'chip-active')}
                        onClick={() => {
                          setValue('zoneId', a.zoneId, { shouldValidate: true });
                          setValue('address', a.address, { shouldValidate: true });
                        }}
                      >
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}
                <div>
                  <label htmlFor="zone" className="label">{t('checkout.zone')}</label>
                  <select
                    id="zone"
                    className={cn('input', formState.errors.zoneId && 'input-error')}
                    aria-invalid={!!formState.errors.zoneId}
                    {...register('zoneId')}
                  >
                    <option value="">{t('checkout.chooseZone')}</option>
                    {DELIVERY_ZONES.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} — {fmt(z.fee)}, ~{z.minutes} {t('common.min')}
                      </option>
                    ))}
                  </select>
                  {formState.errors.zoneId && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{fieldError(formState.errors.zoneId.message)}</p>}
                </div>
                <details className="group rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <summary className="cursor-pointer text-sm font-semibold text-brand-700 dark:text-brand-300">{t('checkout.chooseOnMap')}</summary>
                  <div className="mt-3">
                    <DeliveryMap selected={zoneId} onSelect={(id) => setValue('zoneId', id, { shouldValidate: true })} />
                  </div>
                </details>
                <InputField
                  label={t('checkout.address')}
                  placeholder={t('checkout.addressPh')}
                  autoComplete="street-address"
                  maxLength={200}
                  error={fieldError(formState.errors.address?.message)}
                  {...register('address')}
                />
              </div>
            ) : (
              <div className="flex gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
                <Store className="h-5 w-5 shrink-0" aria-hidden="true" />
                <div>
                  <b>Erizon Mall</b> — {STORE_INFO.address}
                  <div className="text-xs opacity-80">{t('contact.everyDay')} {STORE_INFO.hours} · {t('cart.free')}</div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="slot" className="label">{method === 'pickup' ? t('checkout.pickupTime') : t('checkout.time')}</label>
              <select id="slot" className="input" {...register('deliveryTime')}>
                {DELIVERY_SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {s === 'asap' ? (hasFastFood ? t('checkout.asapFood') : t('checkout.asap')) : s.replace('-', ' – ')}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="card space-y-4 p-5" aria-labelledby="c-pay">
            <h2 id="c-pay" className="text-lg font-bold">3. {t('checkout.payment')}</h2>
            <div className="grid grid-cols-3 gap-2 sm:gap-3" role="radiogroup" aria-label={t('checkout.payment')}>
              {PAYMENT_METHODS.map((p) => {
                const Icon = PAY_ICONS[p];
                const enabled = payments[p];
                return (
                  <label
                    key={p}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-center text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 sm:flex-row sm:gap-3 sm:p-4 sm:text-left sm:text-base',
                      enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                      payment === p ? 'border-brand-600 bg-brand-50/60 dark:bg-brand-950/40' : 'border-slate-200 dark:border-slate-700',
                    )}
                  >
                    <input type="radio" value={p} className="sr-only" disabled={!enabled} {...register('paymentMethod')} />
                    <Icon className="h-6 w-6 text-brand-600" aria-hidden="true" />
                    <span className="font-semibold">{t(`pay.${p}`)}</span>
                  </label>
                );
              })}
            </div>
            {(!payments.click || !payments.payme) && (
              <p className="muted text-xs">{t('checkout.payUnavailable')}</p>
            )}
            {payment !== 'cash' && (
              <p className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                {t('checkout.payRedirect')}
              </p>
            )}
            <TextareaField
              label={t('checkout.comment')}
              maxLength={300}
              placeholder={t('checkout.commentPh')}
              error={fieldError(formState.errors.comment?.message)}
              {...register('comment')}
            />
          </section>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-28 lg:self-start">
          <OrderSummary
            quote={quote}
            fallbackSubtotal={subtotal}
            loading={loading}
            user={user}
            showDelivery={method === 'delivery'}
            deliveryKnown={!!zone}
          >
            <ul className="max-h-48 space-y-1.5 overflow-y-auto text-sm">
              {lines.filter((l) => l.available).map((l) => (
                <li key={l.item.key} className="flex justify-between gap-2">
                  <span className="muted truncate">
                    {l.combo ? t(l.combo.nameKey) : l.product?.name} × {l.item.qty}
                  </span>
                  <span className="shrink-0 font-medium">{fmt(l.lineTotal)}</span>
                </li>
              ))}
            </ul>
            {promoOk && quote?.promo && (
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{t('promo.applied', { code: quote.promo.code })}</p>
            )}
          </OrderSummary>
          <Button type="submit" block size="lg" loading={submitting} className="hidden md:inline-flex">
            {t('checkout.confirm', { sum: fmt(total) })}
          </Button>
          <p className="muted px-1 text-center text-xs">
            {t('checkout.agree')} <Link to="/faq" className="underline">{t('nav.faq')}</Link>
          </p>
        </aside>
      </form>

      <MobileActionBarSpacer />
      <MobileActionBar label={t('cart.summary')}>
        <div className="min-w-0 flex-1">
          <div className="muted text-[11px]">{t('cart.total')}</div>
          <div className="text-lg font-extrabold leading-tight tabular-nums">{fmt(total)}</div>
        </div>
        <Button type="submit" form="checkout-form" loading={submitting} className="px-6">
          {t('checkout.submitShort')}
        </Button>
      </MobileActionBar>
    </div>
  );
}
