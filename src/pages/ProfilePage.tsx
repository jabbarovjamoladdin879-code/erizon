import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Bell, Coins, Copy, Gift, LogOut, MapPin, Package, Plus, RotateCcw, Share2, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { InputField } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { BONUS_MAX_SHARE, CASHBACK_PERCENT } from '@/data/options';
import { DELIVERY_ZONES, ZONE_MAP } from '@/data/zones';
import { useErrorMessage, useFieldError, useSubmitGuard } from '@/hooks/useFormHelpers';
import { useReorder } from '@/hooks/useReorder';
import { useSeo } from '@/hooks/useSeo';
import { usePrice, useT } from '@/hooks/useT';
import { api } from '@/services/api';
import { useAuthStore, useCurrentUser } from '@/store/authStore';
import { useProductMap } from '@/store/catalogStore';
import { toast } from '@/store/toastStore';
import { useUiStore } from '@/store/uiStore';
import type { AppNotification, BonusEntry, Order } from '@/types';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/format';
import { displayPhone } from '@/utils/phone';
import { sanitizeText } from '@/utils/sanitize';
import { addressFormSchema, giftFormSchema, type AddressForm, type GiftForm } from '@/utils/validation';

const TABS = ['orders', 'bonus', 'addresses', 'notifications', 'security'] as const;
type Tab = (typeof TABS)[number];

function OrdersTab() {
  const t = useT();
  const fmt = usePrice();
  const lang = useUiStore((s) => s.lang);
  const reorder = useReorder();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .myOrders()
      .then((r) => alive && setOrders(r.orders))
      .catch(() => alive && setOrders([]));
    return () => {
      alive = false;
    };
  }, []);

  if (!orders) return <Skeleton className="h-40 w-full" />;
  if (!orders.length) {
    return (
      <EmptyState
        icon={Package}
        title={t('profile.noOrders')}
        action={<Link to="/catalog" className="inline-flex h-11 items-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700">{t('cart.goShopping')}</Link>}
      />
    );
  }
  return (
    <ul className="space-y-3">
      {orders.map((o) => (
        <li key={o.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <Link to={`/track/${o.id}`} className="min-w-0 hover:text-brand-700">
            <div className="font-mono font-semibold">{o.id}</div>
            <div className="muted text-xs">
              {formatDateTime(o.createdAt, lang)} · {t('profile.items', { n: o.lines.length })}
            </div>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-bold',
                o.status === 'delivered' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
                o.status === 'cancelled' && 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
                !['delivered', 'cancelled'].includes(o.status) && 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
              )}
            >
              {t(`status.${o.status}`)}
            </span>
            <span className="font-extrabold">{fmt(o.total)}</span>
            <Button size="sm" variant="ghost" onClick={() => reorder(o)} aria-label={`${t('reorder.button')}: ${o.id}`}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t('reorder.button')}</span>
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function BonusTab() {
  const t = useT();
  const fmt = usePrice();
  const lang = useUiStore((s) => s.lang);
  const user = useCurrentUser();
  const setUser = useAuthStore((s) => s.setUser);
  const fieldError = useFieldError();
  const errorMessage = useErrorMessage();
  const [data, setData] = useState<{ balance: number; entries: BonusEntry[] } | null>(null);
  const { register, handleSubmit, formState, reset } = useForm<GiftForm>({ resolver: zodResolver(giftFormSchema), defaultValues: { code: '' } });

  const load = useCallback(() => {
    api.me
      .bonus()
      .then(setData)
      .catch(() => setData({ balance: user?.bonus ?? 0, entries: [] }));
  }, [user?.bonus]);

  useEffect(load, [load]);

  if (!user) return null;
  const inviteLink = `${window.location.origin}/register?ref=${user.referralCode}`;

  const redeem = handleSubmit(async ({ code }) => {
    try {
      const r = await api.me.redeemGift(code);
      toast.success(t('gift.added', { n: fmt(r.added) }));
      setUser({ ...user, bonus: r.balance });
      reset();
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  const share = async () => {
    const text = t('referral.shareText', { link: inviteLink });
    try {
      if (navigator.share) await navigator.share({ title: 'Erizon Mall', text, url: inviteLink });
      else {
        await navigator.clipboard.writeText(inviteLink);
        toast.success(t('toast.copied'));
      }
    } catch {
      /* foydalanuvchi bekor qildi */
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="card p-5">
        <div className="muted text-sm">{t('profile.balance')}</div>
        <div className="mt-1 text-3xl font-extrabold text-amber-600">{fmt(data?.balance ?? user.bonus)}</div>
        <ul className="muted mt-3 list-disc space-y-1 pl-5 text-xs">
          <li>{t('profile.bonusRule1', { p: CASHBACK_PERCENT })}</li>
          <li>{t('profile.bonusRule2', { p: Math.round(BONUS_MAX_SHARE * 100) })}</li>
          <li>{t('profile.bonusRule3')}</li>
        </ul>
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="flex items-center gap-2 font-bold">
          <Share2 className="h-5 w-5 text-brand-600" aria-hidden="true" />
          {t('referral.title')}
        </h2>
        <p className="muted text-sm">{t('referral.text')}</p>
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
          <code className="flex-1 truncate px-2 text-sm font-bold">{user.referralCode}</code>
          <Button size="sm" variant="secondary" onClick={() => void share()}>
            <Copy className="h-4 w-4" aria-hidden="true" />
            {t('referral.share')}
          </Button>
        </div>
      </div>

      <form onSubmit={redeem} noValidate className="card space-y-3 p-5 md:col-span-2">
        <h2 className="flex items-center gap-2 font-bold">
          <Gift className="h-5 w-5 text-accent-500" aria-hidden="true" />
          {t('gift.title')}
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="flex-1">
            <InputField label={t('gift.code')} placeholder="ERZ-XXXX-XXXX-XXXX" maxLength={24} className="font-mono uppercase" error={fieldError(formState.errors.code?.message)} {...register('code')} />
          </div>
          <Button type="submit" className="sm:mt-7" loading={formState.isSubmitting}>
            {t('gift.redeem')}
          </Button>
        </div>
      </form>

      <div className="card p-5 md:col-span-2">
        <h2 className="mb-3 font-bold">{t('bonus.history')}</h2>
        {!data ? (
          <Skeleton className="h-24 w-full" />
        ) : data.entries.length === 0 ? (
          <p className="muted text-sm">{t('bonus.historyEmpty')}</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {data.entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <div className="font-medium">{t(`bonusReason.${e.reason}`)}</div>
                  <div className="muted text-xs">
                    {formatDateTime(e.createdAt, lang)}
                    {e.orderId ? ` · ${e.orderId}` : ''}
                  </div>
                </div>
                <span className={cn('font-bold tabular-nums', e.delta > 0 ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-300')}>
                  {e.delta > 0 ? '+' : ''}
                  {fmt(e.delta)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AddressesTab() {
  const t = useT();
  const user = useCurrentUser();
  const setUser = useAuthStore((s) => s.setUser);
  const fieldError = useFieldError();
  const errorMessage = useErrorMessage();
  const guard = useSubmitGuard(5, 60_000);
  const [adding, setAdding] = useState(false);
  const { register, handleSubmit, formState, reset } = useForm<AddressForm>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: { label: '', zoneId: '', address: '' },
  });

  if (!user) return null;

  const onSubmit = handleSubmit(async (data) => {
    if (!guard()) return;
    try {
      const r = await api.me.addAddress({ label: sanitizeText(data.label, 30), zoneId: data.zoneId, address: sanitizeText(data.address, 200) });
      setUser(r.user);
      reset();
      setAdding(false);
      toast.success(t('toast.addressSaved'));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  const remove = async (id: string) => {
    try {
      setUser((await api.me.removeAddress(id)).user);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="space-y-3">
      {user.addresses.map((a) => (
        <div key={a.id} className="card flex items-start justify-between gap-3 p-4">
          <div className="flex gap-3">
            <MapPin className="mt-0.5 h-5 w-5 text-brand-600" aria-hidden="true" />
            <div>
              <div className="font-semibold">{a.label}</div>
              <div className="muted text-sm">
                {ZONE_MAP[a.zoneId]?.name}, {a.address}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void remove(a.id)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
            aria-label={`${t('common.remove')}: ${a.label}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      {adding ? (
        <form onSubmit={onSubmit} noValidate className="card space-y-4 p-5">
          <InputField label={t('profile.addrLabel')} placeholder={t('profile.addrLabelPh')} maxLength={30} error={fieldError(formState.errors.label?.message)} {...register('label')} />
          <div>
            <label htmlFor="addr-zone" className="label">{t('checkout.zone')}</label>
            <select id="addr-zone" className={cn('input', formState.errors.zoneId && 'input-error')} {...register('zoneId')}>
              <option value="">{t('checkout.chooseZone')}</option>
              {DELIVERY_ZONES.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
            {formState.errors.zoneId && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{fieldError(formState.errors.zoneId.message)}</p>}
          </div>
          <InputField label={t('checkout.address')} placeholder={t('checkout.addressPh')} maxLength={200} error={fieldError(formState.errors.address?.message)} {...register('address')} />
          <div className="flex gap-2">
            <Button type="submit" loading={formState.isSubmitting}>{t('common.save')}</Button>
            <Button variant="ghost" onClick={() => setAdding(false)}>{t('common.cancel')}</Button>
          </div>
        </form>
      ) : (
        user.addresses.length < 10 && (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('profile.addAddress')}
          </Button>
        )
      )}
    </div>
  );
}

function NotificationsTab() {
  const t = useT();
  const lang = useUiStore((s) => s.lang);
  const products = useProductMap();
  const refreshUnread = useAuthStore((s) => s.refreshUnread);
  const [list, setList] = useState<AppNotification[] | null>(null);

  useEffect(() => {
    let alive = true;
    api.me
      .notifications()
      .then(async (r) => {
        if (!alive) return;
        setList(r.notifications);
        if (r.unread > 0) {
          await api.me.readNotifications().catch(() => undefined);
          void refreshUnread();
        }
      })
      .catch(() => alive && setList([]));
    return () => {
      alive = false;
    };
  }, [refreshUnread]);

  if (!list) return <Skeleton className="h-32 w-full" />;
  if (!list.length) return <EmptyState icon={Bell} title={t('notify.empty')} />;
  return (
    <ul className="space-y-2">
      {list.map((n) => {
        const product = n.productId ? products.get(n.productId) : undefined;
        const href = n.type === 'back_in_stock' && n.productId ? `/product/${n.productId}` : n.orderId ? `/track/${n.orderId}` : undefined;
        const text = n.type === 'back_in_stock' ? t('notify.backInStock', { name: product?.name ?? n.text }) : n.text;
        const body = (
          <div className={cn('card flex items-start gap-3 p-4', !n.read && 'ring-2 ring-brand-200 dark:ring-brand-900')}>
            <Bell className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
            <div>
              <div className="text-sm font-medium">{text}</div>
              <div className="muted text-xs">{formatDateTime(n.createdAt, lang)}</div>
            </div>
          </div>
        );
        return <li key={n.id}>{href ? <Link to={href}>{body}</Link> : body}</li>;
      })}
    </ul>
  );
}

function SecurityTab() {
  const t = useT();
  const setUser = useAuthStore((s) => s.setUser);
  const errorMessage = useErrorMessage();
  const [busy, setBusy] = useState(false);
  const logoutAll = async () => {
    setBusy(true);
    try {
      await api.auth.logoutAll();
      setUser(null);
      toast.success(t('security.loggedOutAll'));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card space-y-4 p-5">
      <h2 className="flex items-center gap-2 font-bold">
        <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" />
        {t('security.title')}
      </h2>
      <ul className="muted list-disc space-y-1 pl-5 text-sm">
        <li>{t('security.point1')}</li>
        <li>{t('security.point2')}</li>
        <li>{t('security.point3')}</li>
      </ul>
      <div className="flex flex-wrap gap-2">
        <Link to="/reset" className="inline-flex h-11 items-center rounded-xl border border-slate-300 px-4 text-sm font-semibold hover:border-brand-500 dark:border-slate-700">
          {t('security.changePassword')}
        </Link>
        <Button variant="danger" loading={busy} onClick={() => void logoutAll()}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {t('security.logoutAll')}
        </Button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const t = useT();
  const fmt = usePrice();
  useSeo(t('nav.profile'));
  const user = useCurrentUser();
  const status = useAuthStore((s) => s.status);
  const logout = useAuthStore((s) => s.logout);
  const unread = useAuthStore((s) => s.unread);
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab') as Tab | null;
  const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : 'orders';

  if (status !== 'ready') return <div className="container-page py-8"><Skeleton className="h-40 w-full" /></div>;
  if (!user) return <Navigate to="/login?redirect=/profile" replace />;

  const tabs: Array<{ id: Tab; label: string; icon: typeof Package; badge?: number }> = [
    { id: 'orders', label: t('profile.orders'), icon: Package },
    { id: 'bonus', label: t('profile.bonus'), icon: Coins },
    { id: 'addresses', label: t('profile.addresses'), icon: MapPin },
    { id: 'notifications', label: t('notify.title'), icon: Bell, badge: unread },
    { id: 'security', label: t('security.title'), icon: ShieldCheck },
  ];

  return (
    <div className="container-page py-6">
      <div className="card mb-5 flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-accent-500 text-2xl font-black text-white" aria-hidden="true">
            {user.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <h1 className="text-xl font-extrabold">{user.name}</h1>
            <p className="muted text-sm">{displayPhone(user.phone)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl bg-amber-50 px-4 py-2 text-right dark:bg-amber-950/40">
            <div className="text-xs text-amber-700 dark:text-amber-400">{t('profile.bonus')}</div>
            <div className="font-extrabold text-amber-800 dark:text-amber-300">{fmt(user.bonus)}</div>
          </div>
          {user.role === 'admin' && (
            <Link to="/admin" className="inline-flex h-9 items-center rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">
              {t('footer.admin')}
            </Link>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void logout().then(() => toast.info(t('toast.loggedOut')));
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {t('auth.logout')}
          </Button>
        </div>
      </div>

      <div role="tablist" aria-label={t('nav.profile')} className="scrollbar-none -mx-4 mb-5 flex gap-2 overflow-x-auto px-4">
        {tabs.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => setParams(id === 'orders' ? {} : { tab: id }, { replace: true })}
            className={cn('chip shrink-0', tab === id && 'chip-active')}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
            {!!badge && <span className="rounded-full bg-accent-500 px-1.5 text-[10px] font-bold text-white">{badge}</span>}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'orders' && <OrdersTab />}
        {tab === 'bonus' && <BonusTab />}
        {tab === 'addresses' && <AddressesTab />}
        {tab === 'notifications' && <NotificationsTab />}
        {tab === 'security' && <SecurityTab />}
      </div>
    </div>
  );
}
