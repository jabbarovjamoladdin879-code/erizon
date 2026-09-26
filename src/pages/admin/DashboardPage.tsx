import { Banknote, Package, PackageX, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAdminQuery } from '@/hooks/useAdminQuery';
import { useSeo } from '@/hooks/useSeo';
import { api } from '@/services/api';
import type { OrderStatus } from '@/types';
import { formatNumber } from '@/utils/format';

const STATUS_LABEL: Record<OrderStatus, string> = {
  accepted: 'Qabul qilindi',
  preparing: 'Tayyorlanmoqda',
  on_the_way: "Yo'lda",
  delivered: 'Yetkazildi',
  cancelled: 'Bekor qilindi',
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  accepted: 'bg-sky-500',
  preparing: 'bg-amber-500',
  on_the_way: 'bg-brand-500',
  delivered: 'bg-emerald-500',
  cancelled: 'bg-red-500',
};

const som = (n: number) => `${formatNumber(n)} so'm`;

function BarList({ title, hint, items, color }: { title: string; hint: string; items: Array<{ name: string; value: number }>; color: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <section className="card p-5">
      <h2 className="mb-4 font-bold">
        {title} <span className="muted text-xs font-normal">({hint})</span>
      </h2>
      {items.length === 0 ? (
        <p className="muted text-sm">Hozircha ma'lumot yo'q</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((p, i) => (
            <li key={`${i}-${p.name}`} className="text-sm">
              <div className="mb-1 flex justify-between gap-2">
                <span className="truncate">{p.name}</span>
                <span className="font-semibold tabular-nums">{formatNumber(p.value)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${(p.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function DashboardPage() {
  useSeo('Admin — boshqaruv paneli');
  const { data: stats, error } = useAdminQuery(api.admin.stats);

  if (error) return <p className="card p-6 text-sm text-red-600">Statistikani yuklab bo'lmadi</p>;
  if (!stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const maxDay = Math.max(1, ...stats.last7.map((d) => d.sum));
  const cards = [
    { label: 'Bugungi buyurtmalar', value: String(stats.todayCount), icon: ShoppingBag, color: 'text-brand-600 bg-brand-50 dark:bg-brand-950' },
    { label: 'Bugungi tushum', value: som(stats.todayRevenue), icon: Banknote, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950' },
    { label: "O'rtacha chek", value: som(stats.avgCheck), icon: TrendingUp, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950' },
    { label: 'Jami buyurtmalar', value: String(stats.totalOrders), icon: Package, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950' },
    { label: 'Foydalanuvchilar', value: String(stats.users), icon: Users, color: 'text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-950' },
    { label: "Omborda yo'q", value: String(stats.outOfStock), icon: PackageX, color: 'text-red-600 bg-red-50 dark:bg-red-950' },
  ];
  const statuses = Object.keys(STATUS_LABEL) as OrderStatus[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Boshqaruv paneli</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-4 p-5">
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${color}`}>
              <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="muted text-xs">{label}</div>
              <div className="truncate text-xl font-extrabold">{value}</div>
            </div>
          </div>
        ))}
      </div>

      <section className="card p-5" aria-labelledby="rev-h">
        <h2 id="rev-h" className="mb-4 font-bold">Oxirgi 7 kun tushumi</h2>
        <div className="flex h-48 items-end gap-2" role="img" aria-label={stats.last7.map((d) => `${d.day}: ${som(d.sum)}`).join(', ')}>
          {stats.last7.map((d) => (
            <div key={d.day} className="flex h-full flex-1 flex-col items-center gap-1">
              <div className="relative w-full flex-1">
                <div
                  className="absolute inset-x-0 bottom-0 rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400 transition-all"
                  style={{ height: `${Math.max(2, (d.sum / maxDay) * 100)}%` }}
                  title={som(d.sum)}
                />
              </div>
              <span className="muted text-[10px]">{d.day.slice(8, 10)}.{d.day.slice(5, 7)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <BarList title="Ko'p sotilganlar" hint="sotilgan miqdor" items={stats.topProducts} color="bg-accent-500" />
        <BarList title="Ko'p ko'rilganlar" hint="ko'rishlar" items={stats.topViewed} color="bg-sky-500" />
      </div>

      <section className="card p-5" aria-labelledby="st-h">
        <h2 id="st-h" className="mb-4 font-bold">Buyurtmalar holati (jami: {stats.totalOrders})</h2>
        {stats.totalOrders === 0 ? (
          <p className="muted text-sm">Hali buyurtmalar yo'q.</p>
        ) : (
          <>
            <div className="flex h-4 overflow-hidden rounded-full">
              {statuses.map((s) => {
                const n = stats.byStatus[s] ?? 0;
                return n > 0 ? <div key={s} className={STATUS_COLOR[s]} style={{ width: `${(n / stats.totalOrders) * 100}%` }} title={`${STATUS_LABEL[s]}: ${n}`} /> : null;
              })}
            </div>
            <ul className="mt-3 flex flex-wrap gap-4 text-sm">
              {statuses.map((s) => (
                <li key={s} className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${STATUS_COLOR[s]}`} aria-hidden="true" />
                  {STATUS_LABEL[s]}: <b>{stats.byStatus[s] ?? 0}</b>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
