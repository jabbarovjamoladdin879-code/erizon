import { useState } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { OrderDetails } from '@/components/OrderDetails';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { adminErrorText, useAdminQuery } from '@/hooks/useAdminQuery';
import { useSeo } from '@/hooks/useSeo';
import { api } from '@/services/api';
import { toast } from '@/store/toastStore';
import { ORDER_STATUSES, type Order, type OrderStatus } from '@/types';
import { cn } from '@/utils/cn';
import { formatDateTime, formatNumber } from '@/utils/format';
import { displayPhone } from '@/utils/phone';

const LABEL: Record<OrderStatus, string> = {
  accepted: 'Qabul qilindi',
  preparing: 'Tayyorlanmoqda',
  on_the_way: "Yo'lda",
  delivered: 'Yetkazildi',
  cancelled: 'Bekor qilindi',
};
const METHOD: Record<string, string> = { delivery: 'Yetkazish', pickup: "O'zi olib ketish", quick: '1 klik' };
const PAY: Record<string, string> = { cash: 'Naqd', pending: "To'lov kutilmoqda", paid: "To'langan", cancelled: "To'lov bekor" };

export default function AdminOrdersPage() {
  useSeo('Admin — buyurtmalar');
  const [filter, setFilter] = useState<OrderStatus | ''>('');
  const { data, reload } = useAdminQuery(() => api.admin.orders(filter || undefined));
  const [overrides, setOverrides] = useState<Record<string, Order>>({});
  const [open, setOpen] = useState<string | null>(null);
  const orders = data?.orders.map((o) => overrides[o.id] ?? o) ?? null;

  const changeStatus = async (o: Order, status: OrderStatus) => {
    if (status === o.status) return;
    if ((status === 'cancelled' || status === 'delivered') && !window.confirm(`${o.id}: "${LABEL[status]}" holatiga o'tkazilsinmi? Bu yakuniy holat.`)) return;
    try {
      const r = await api.admin.setStatus(o.id, status);
      setOverrides((m) => ({ ...m, [o.id]: r.order }));
      toast.success('Holat yangilandi');
    } catch (err) {
      toast.error(adminErrorText(err));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Buyurtmalar <span className="muted text-base font-medium">({orders?.length ?? '…'})</span></h1>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            Holat:
            <select
              className="input w-auto"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value as OrderStatus | '');
                setOverrides({});
                setTimeout(reload, 0);
              }}
            >
              <option value="">Barchasi</option>
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
            </select>
          </label>
          <Button variant="outline" size="icon" onClick={() => { setOverrides({}); reload(); }} aria-label="Yangilash">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <p className="muted text-xs">
        Holatlar: Qabul qilindi → Tayyorlanmoqda → Yo'lda → Yetkazildi. "Yetkazildi" bo'lganda mijozga keshbek bonusi avtomatik beriladi;
        "Bekor qilindi" bo'lganda ishlatilgan bonus qaytariladi. Mijozga har bir o'zgarish haqida bildirishnoma yuboriladi.
      </p>

      {!orders ? (
        <Skeleton className="h-48 w-full" />
      ) : orders.length === 0 ? (
        <div className="card muted p-10 text-center text-sm">Buyurtmalar yo'q</div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => {
            const expanded = open === o.id;
            const locked = o.status === 'delivered' || o.status === 'cancelled';
            return (
              <li key={o.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <button type="button" onClick={() => setOpen(expanded ? null : o.id)} aria-expanded={expanded} className="flex min-w-[220px] flex-1 items-center gap-3 text-left">
                    <ChevronDown className={cn('h-4 w-4 shrink-0 transition', expanded && 'rotate-180')} aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="font-mono font-semibold">{o.id}</div>
                      <div className="muted text-xs">
                        {formatDateTime(o.createdAt, 'uz')} · {o.customerName} · {displayPhone(o.phone)} · {METHOD[o.deliveryMethod]}
                      </div>
                    </div>
                  </button>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-semibold',
                      o.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                    )}
                  >
                    {PAY[o.paymentStatus]}
                  </span>
                  <span className="font-extrabold tabular-nums">{formatNumber(o.total)} so'm</span>
                  <label className="sr-only" htmlFor={`st-${o.id}`}>Holat</label>
                  <select id={`st-${o.id}`} className="input w-auto py-1.5" value={o.status} disabled={locked} onChange={(e) => void changeStatus(o, e.target.value as OrderStatus)}>
                    {ORDER_STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
                  </select>
                </div>
                {expanded && (
                  <div className="border-t border-slate-100 p-4 dark:border-slate-800">
                    <OrderDetails order={o} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
