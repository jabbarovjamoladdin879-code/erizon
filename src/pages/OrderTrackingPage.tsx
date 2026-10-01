import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PackageSearch, RotateCcw } from 'lucide-react';
import { OrderDetails } from '@/components/OrderDetails';
import { OrderTracker } from '@/components/OrderTracker';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { useFieldError } from '@/hooks/useFormHelpers';
import { useOrder } from '@/hooks/useOrder';
import { useReorder } from '@/hooks/useReorder';
import { useSeo } from '@/hooks/useSeo';
import { usePrice, useT } from '@/hooks/useT';
import { api } from '@/services/api';
import { useCurrentUser } from '@/store/authStore';
import { useOrderStore } from '@/store/orderStore';
import type { Order } from '@/types';
import { trackSchema, type TrackForm } from '@/utils/validation';

function RecentOrders() {
  const t = useT();
  const fmt = usePrice();
  const user = useCurrentUser();
  const guestOrders = useOrderStore((s) => s.guestOrders);
  const [mine, setMine] = useState<Order[] | null>(null);

  useEffect(() => {
    if (!user) return undefined;
    let alive = true;
    api
      .myOrders()
      .then((r) => alive && setMine(r.orders.slice(0, 5)))
      .catch(() => alive && setMine([]));
    return () => {
      alive = false;
    };
  }, [user]);

  const items = user
    ? (mine ?? []).map((o) => ({ id: o.id, href: `/track/${o.id}`, extra: fmt(o.total) }))
    : guestOrders.slice(0, 5).map((o) => ({ id: o.id, href: `/track/${o.id}?t=${encodeURIComponent(o.token)}`, extra: '' }));
  if (!items.length) return null;
  return (
    <section className="mt-6">
      <h2 className="mb-3 font-bold">{t('track.recent')}</h2>
      <ul className="space-y-2">
        {items.map((o) => (
          <li key={o.id}>
            <Link to={o.href} className="card flex items-center justify-between p-4 hover:shadow-md">
              <span className="font-mono font-semibold">{o.id}</span>
              <span className="muted text-sm">{o.extra}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function OrderTrackingPage() {
  const t = useT();
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const fieldError = useFieldError();
  const reorder = useReorder();
  useSeo(t('nav.track'), t('seo.track'));
  const { order, status } = useOrder(id?.toUpperCase(), params.get('t'));

  const { register, handleSubmit, formState } = useForm<TrackForm>({
    resolver: zodResolver(trackSchema),
    defaultValues: { orderId: id ?? '' },
  });
  const onSubmit = handleSubmit((data) => navigate(`/track/${data.orderId}`));

  return (
    <div className="container-page max-w-3xl py-8">
      <h1 className="mb-5 text-2xl font-bold sm:text-3xl">{t('nav.track')}</h1>
      <form onSubmit={onSubmit} noValidate className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-start">
        <div className="flex-1">
          <InputField
            label={t('track.orderId')}
            placeholder="EM-XXXXXXXX"
            maxLength={16}
            className="font-mono uppercase"
            error={fieldError(formState.errors.orderId?.message)}
            {...register('orderId')}
          />
        </div>
        <Button type="submit" className="sm:mt-7">
          <PackageSearch className="h-4 w-4" aria-hidden="true" />
          {t('track.find')}
        </Button>
      </form>

      {id && status === 'loading' && <Skeleton className="mt-5 h-48 w-full" />}

      {id && (status === 'notFound' || status === 'error') && (
        <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" role="alert">
          {t('track.notFound')}
        </p>
      )}

      {order && (
        <>
          <section className="card mt-5 p-5 sm:p-6" aria-labelledby="st-h">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="st-h" className="text-lg font-bold">{t('track.status')}</h2>
              <span className="chip font-mono">{order.id}</span>
            </div>
            <OrderTracker order={order} />
          </section>
          <section className="card mt-5 p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold">{t('order.details')}</h2>
              <Button variant="secondary" size="sm" onClick={() => reorder(order)}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {t('reorder.button')}
              </Button>
            </div>
            <OrderDetails order={order} />
          </section>
        </>
      )}

      {!id && <RecentOrders />}
    </div>
  );
}
