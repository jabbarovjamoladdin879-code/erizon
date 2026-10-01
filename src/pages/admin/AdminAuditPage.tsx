import { Skeleton } from '@/components/ui/Skeleton';
import { useAdminQuery } from '@/hooks/useAdminQuery';
import { useSeo } from '@/hooks/useSeo';
import { api } from '@/services/api';
import { formatDateTime } from '@/utils/format';

const ACTIONS: Record<string, string> = {
  'product.create': "Mahsulot qo'shildi",
  'product.update': 'Mahsulot tahrirlandi',
  'product.delete': "Mahsulot o'chirildi",
  'product.inStock': 'Omborga qaytdi',
  'product.outOfStock': "Omborda yo'q deb belgilandi",
  'image.upload': 'Rasm yuklandi',
  'promo.save': 'Promokod saqlandi',
  'promo.toggle': "Promokod holati o'zgardi",
  'promo.delete': "Promokod o'chirildi",
  'deal.set': "Kun aksiyasi o'rnatildi",
  'deal.end': 'Kun aksiyasi yakunlandi',
  'gift.create': 'Sertifikatlar yaratildi',
  'gift.delete': "Sertifikat o'chirildi",
  '2fa.enable': '2FA yoqildi',
  '2fa.disable': "2FA o'chirildi",
};

/** Admin amallari jurnali — kim, qachon, nima qilgani (server 365 kun saqlaydi) */
export default function AdminAuditPage() {
  useSeo('Admin — audit jurnali');
  const { data } = useAdminQuery(api.admin.audit);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Audit jurnali</h1>
      {!data ? (
        <Skeleton className="h-64 w-full" />
      ) : data.entries.length === 0 ? (
        <p className="muted card p-6 text-center text-sm">Hali yozuvlar yo'q</p>
      ) : (
        <ul className="card divide-y divide-slate-100 dark:divide-slate-800">
          {data.entries.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
              <div>
                <b>{ACTIONS[e.action] ?? (e.action.startsWith('order.') ? `Buyurtma holati: ${e.action.slice(6)}` : e.action)}</b>
                {e.target && <span className="muted ml-2 font-mono text-xs">{e.target}</span>}
              </div>
              <div className="muted text-xs">
                {e.adminName} · {formatDateTime(e.createdAt, 'uz')}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
