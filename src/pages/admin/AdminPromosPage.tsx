import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Flame, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { adminErrorText, useAdminQuery } from '@/hooks/useAdminQuery';
import { useCountdown, useNow } from '@/hooks/useNow';
import { useSeo } from '@/hooks/useSeo';
import { api } from '@/services/api';
import { useCatalogStore, useProduct } from '@/store/catalogStore';
import { toast } from '@/store/toastStore';
import { cn } from '@/utils/cn';
import { formatNumber, pad2 } from '@/utils/format';

const promoForm = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,20}$/, '3–20 ta lotin harfi yoki raqam'),
    type: z.enum(['percent', 'fixed']),
    value: z.string().regex(/^\d{1,7}$/, 'Butun son'),
    minOrder: z.string().regex(/^\d{0,9}$/, 'Butun son'),
    maxDiscount: z.string().regex(/^\d{0,9}$/, 'Butun son'),
    maxUses: z.string().regex(/^\d{0,7}$/, 'Butun son'),
    expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Sanani tanlang'),
    firstOrderOnly: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const n = Number(v.value);
    if (n <= 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: "0 dan katta bo'lsin" });
    if (v.type === 'percent' && n > 90) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: "Foiz 1–90 oralig'ida" });
  });
type PromoForm = z.infer<typeof promoForm>;

const dealForm = z.object({
  productId: z.string().min(1, 'Mahsulotni tanlang'),
  dealPrice: z.string().regex(/^\d{3,9}$/, 'Narx: butun son'),
  hours: z.string().regex(/^([1-9]|[1-6]\d|7[0-2])$/, '1–72 soat'),
});
type DealForm = z.infer<typeof dealForm>;

function DealManager() {
  const products = useCatalogStore((s) => s.products);
  const deal = useCatalogStore((s) => s.deal);
  const loadCatalog = useCatalogStore((s) => s.load);
  const dealProduct = useProduct(deal?.productId);
  const { hours, minutes, seconds, done } = useCountdown(deal?.endsAt);
  const { register, handleSubmit, formState, reset } = useForm<DealForm>({
    resolver: zodResolver(dealForm),
    defaultValues: { productId: '', dealPrice: '', hours: '24' },
  });

  const onSubmit = handleSubmit(async (v) => {
    try {
      await api.admin.setDeal(v.productId, Number(v.dealPrice), Number(v.hours));
      toast.success("Kun aksiyasi o'rnatildi");
      reset();
      await loadCatalog();
    } catch (err) {
      toast.error(adminErrorText(err));
    }
  });

  const end = async () => {
    try {
      await api.admin.endDeal();
      toast.info('Aksiya yakunlandi');
      await loadCatalog();
    } catch (err) {
      toast.error(adminErrorText(err));
    }
  };

  return (
    <section className="card space-y-4 p-5" aria-labelledby="deal-h">
      <h2 id="deal-h" className="flex items-center gap-2 text-lg font-bold">
        <Flame className="h-5 w-5 text-accent-500" aria-hidden="true" /> Kun aksiyasi
      </h2>
      {deal && dealProduct && !done ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-accent-400/10 p-4 text-sm">
          <div>
            <b>{dealProduct.name}</b> — {formatNumber(deal.dealPrice)} so'm <span className="text-slate-500 line-through dark:text-slate-400">{formatNumber(dealProduct.price)}</span>
            <div className="muted text-xs">Tugashiga: {pad2(hours)}:{pad2(minutes)}:{pad2(seconds)}</div>
          </div>
          <Button variant="outline" size="sm" onClick={() => void end()}>Hozir yakunlash</Button>
        </div>
      ) : (
        <p className="muted text-sm">Faol aksiya yo'q (yoki muddati tugagan).</p>
      )}
      <form onSubmit={onSubmit} noValidate className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-start">
        <div>
          <label htmlFor="deal-p" className="label">Mahsulot</label>
          <select id="deal-p" className={cn('input', formState.errors.productId && 'input-error')} {...register('productId')}>
            <option value="">Tanlang…</option>
            {products.filter((p) => p.inStock).map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {formatNumber(p.price)}</option>
            ))}
          </select>
          {formState.errors.productId && <p className="mt-1 text-xs text-red-600" role="alert">{formState.errors.productId.message}</p>}
        </div>
        <InputField label="Aksiya narxi" inputMode="numeric" maxLength={9} error={formState.errors.dealPrice?.message} {...register('dealPrice')} />
        <InputField label="Davomiyligi (soat)" inputMode="numeric" maxLength={2} error={formState.errors.hours?.message} {...register('hours')} />
        <Button type="submit" className="sm:mt-7" loading={formState.isSubmitting}>O'rnatish</Button>
      </form>
    </section>
  );
}

export default function AdminPromosPage() {
  useSeo('Admin — promokodlar');
  const { data, reload } = useAdminQuery(api.admin.promos);
  const { register, handleSubmit, formState, reset, watch } = useForm<PromoForm>({
    resolver: zodResolver(promoForm),
    defaultValues: { code: '', type: 'percent', value: '', minOrder: '0', maxDiscount: '', maxUses: '', expiresAt: '', firstOrderOnly: false },
  });
  const type = watch('type');

  const onSubmit = handleSubmit(async (v) => {
    try {
      await api.admin.savePromo({
        code: v.code,
        type: v.type,
        value: Number(v.value),
        minOrder: Number(v.minOrder || 0),
        maxDiscount: v.maxDiscount ? Number(v.maxDiscount) : undefined,
        maxUses: v.maxUses ? Number(v.maxUses) : undefined,
        expiresAt: new Date(`${v.expiresAt}T23:59:59+05:00`).toISOString(),
        active: true,
        firstOrderOnly: v.firstOrderOnly,
      });
      toast.success('Promokod saqlandi');
      reset();
      reload();
    } catch (err) {
      toast.error(adminErrorText(err));
    }
  });

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      toast.info(msg);
      reload();
    } catch (err) {
      toast.error(adminErrorText(err));
    }
  };

  const now = useNow(60_000);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Promokodlar va aksiyalar</h1>
      <DealManager />

      <section className="card space-y-4 p-5" aria-labelledby="new-promo">
        <h2 id="new-promo" className="text-lg font-bold">Yangi promokod (yoki mavjudini yangilash)</h2>
        <form onSubmit={onSubmit} noValidate className="grid gap-3 sm:grid-cols-3">
          <InputField label="Kod" maxLength={20} className="uppercase" error={formState.errors.code?.message} {...register('code')} />
          <div>
            <label htmlFor="pr-type" className="label">Turi</label>
            <select id="pr-type" className="input" {...register('type')}>
              <option value="percent">Foiz (%)</option>
              <option value="fixed">Qat'iy summa (so'm)</option>
            </select>
          </div>
          <InputField label={type === 'percent' ? 'Qiymat (%)' : "Qiymat (so'm)"} inputMode="numeric" maxLength={7} error={formState.errors.value?.message} {...register('value')} />
          <InputField label="Minimal buyurtma (so'm)" inputMode="numeric" maxLength={9} error={formState.errors.minOrder?.message} {...register('minOrder')} />
          <InputField label="Maksimal chegirma (ixtiyoriy)" inputMode="numeric" maxLength={9} error={formState.errors.maxDiscount?.message} {...register('maxDiscount')} />
          <InputField label="Umumiy limit (necha marta, ixtiyoriy)" inputMode="numeric" maxLength={7} error={formState.errors.maxUses?.message} {...register('maxUses')} />
          <InputField label="Amal qilish muddati" type="date" error={formState.errors.expiresAt?.message} {...register('expiresAt')} />
          <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2 sm:mt-7">
            <input type="checkbox" className="h-5 w-5 accent-brand-600" {...register('firstOrderOnly')} /> Faqat birinchi xarid uchun
          </label>
          <Button type="submit" loading={formState.isSubmitting}>Saqlash</Button>
        </form>
      </section>

      {!data ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <section className="card overflow-x-auto" aria-label="Promokodlar ro'yxati">
          <table className="w-full min-w-[780px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60">
              <tr>
                <th scope="col" className="p-3">Kod</th>
                <th scope="col" className="p-3">Chegirma</th>
                <th scope="col" className="p-3">Min. buyurtma</th>
                <th scope="col" className="p-3">Ishlatilgan</th>
                <th scope="col" className="p-3">Muddati</th>
                <th scope="col" className="p-3">Faol</th>
                <th scope="col" className="p-3 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {data.promos.map((p) => {
                const expired = Date.parse(p.expiresAt) <= now;
                return (
                  <tr key={p.code} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="p-3 font-mono font-bold">
                      {p.code}
                      {p.firstOrderOnly && <span className="ml-2 rounded bg-sky-100 px-1.5 py-0.5 font-sans text-[10px] font-bold text-sky-700">1-xarid</span>}
                    </td>
                    <td className="p-3">
                      {p.type === 'percent' ? `${p.value}%` : `${formatNumber(p.value)} so'm`}
                      {p.maxDiscount ? <span className="muted text-xs"> (maks. {formatNumber(p.maxDiscount)})</span> : null}
                    </td>
                    <td className="p-3">{formatNumber(p.minOrder)}</td>
                    <td className="p-3 tabular-nums">{p.usedCount ?? 0}{p.maxUses ? ` / ${p.maxUses}` : ''}</td>
                    <td className={cn('p-3', expired && 'text-red-600')}>{p.expiresAt.slice(0, 10)}{expired && ' (tugagan)'}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={p.active}
                        aria-label={`${p.code}: faol`}
                        onClick={() => void act(() => api.admin.togglePromo(p.code), 'Holat o\'zgartirildi')}
                        className={cn('relative inline-flex h-6 w-11 rounded-full transition', p.active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700')}
                      >
                        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', p.active ? 'left-[22px]' : 'left-0.5')} />
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => window.confirm(`${p.code} o'chirilsinmi?`) && void act(() => api.admin.deletePromo(p.code), "Promokod o'chirildi")}
                        className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                        aria-label={`O'chirish: ${p.code}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
