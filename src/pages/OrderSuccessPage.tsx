import { Link, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Copy, RotateCcw } from 'lucide-react';
import { OrderDetails } from '@/components/OrderDetails';
import { OrderTracker } from '@/components/OrderTracker';
import { Button } from '@/components/ui/Button';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { useOrder } from '@/hooks/useOrder';
import { useReorder } from '@/hooks/useReorder';
import { useSeo } from '@/hooks/useSeo';
import { useT } from '@/hooks/useT';
import { toast } from '@/store/toastStore';
import NotFoundPage from './NotFoundPage';

export default function OrderSuccessPage() {
  const t = useT();
  const { id } = useParams();
  const [params] = useSearchParams();
  const { order, status } = useOrder(id, params.get('t'));
  const reorder = useReorder();
  useSeo(t('order.successTitle'));
  if (status === 'loading') return <PageSkeleton />;
  if (!order) return <NotFoundPage />;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(order.id);
      toast.success(t('toast.copied'));
    } catch {
      toast.info(order.id);
    }
  };

  return (
    <div className="container-page max-w-3xl py-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-6 text-center sm:p-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
          className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
        >
          <CheckCircle2 className="h-11 w-11" aria-hidden="true" />
        </motion.div>
        <h1 className="mt-4 text-2xl font-extrabold">{t('order.successTitle')}</h1>
        <p className="muted mt-1">{order.deliveryMethod === 'quick' ? t('quick.success') : t('order.successText')}</p>
        {order.paymentStatus === 'pending' && <p className="mt-2 text-sm font-semibold text-amber-600">{t('order.awaitingPayment')}</p>}
        <button type="button" onClick={() => void copy()} className="chip mt-4 font-mono">
          {order.id} <Copy className="h-3.5 w-3.5" aria-label={t('order.copy')} />
        </button>
      </motion.div>

      <section className="card mt-5 p-5 sm:p-6" aria-labelledby="track-h">
        <h2 id="track-h" className="text-lg font-bold">{t('track.status')}</h2>
        {order.hasFastFood && <p className="muted mt-1 text-xs">{t('track.fastfoodNote')}</p>}
        <OrderTracker order={order} />
      </section>

      <section className="card mt-5 p-5 sm:p-6" aria-labelledby="details-h">
        <h2 id="details-h" className="mb-4 text-lg font-bold">{t('order.details')}</h2>
        <OrderDetails order={order} />
      </section>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to={`/track/${order.id}`} className="inline-flex h-11 items-center rounded-2xl bg-brand-gradient shadow-glow transition hover:brightness-110 active:scale-[0.97] px-5 text-sm font-semibold text-white">
          {t('nav.track')}
        </Link>
        <Button variant="outline" onClick={() => reorder(order)}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {t('reorder.button')}
        </Button>
        <Link to="/catalog" className="inline-flex h-11 items-center rounded-xl border border-slate-300 px-5 text-sm font-semibold hover:border-brand-500 dark:border-slate-700">
          {t('order.continue')}
        </Link>
      </div>
    </div>
  );
}
