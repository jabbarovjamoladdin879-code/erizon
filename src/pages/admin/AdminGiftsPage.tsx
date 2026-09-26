import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Copy, Gift, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { adminErrorText, useAdminQuery } from '@/hooks/useAdminQuery';
import { useSeo } from '@/hooks/useSeo';
import { api } from '@/services/api';
import { toast } from '@/store/toastStore';
import { formatNumber } from '@/utils/format';

const schema = z.object({
  value: z.string().regex(/^\d{4,7}$/, "1 000 dan 5 000 000 so'mgacha"),
  count: z.string().regex(/^([1-9]|[1-4]\d|50)$/, '1–50 dona'),
  days: z.string().regex(/^([1-9]\d{0,2})$/, '1–365 kun'),
});
type Form = z.infer<typeof schema>;

export default function AdminGiftsPage() {
  useSeo("Admin — sovg'a sertifikatlari");
  const { data, reload } = useAdminQuery(api.admin.gifts);
  const [created, setCreated] = useState<string[]>([]);
  const { register, handleSubmit, formState } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { value: '50000', count: '5', days: '90' } });

  const onSubmit = handleSubmit(async (v) => {
    try {
      const r = await api.admin.createGifts(Number(v.value), Number(v.count), Math.min(365, Number(v.days)));
      setCreated(r.codes);
      toast.success(`${r.codes.length} ta sertifikat yaratildi`);
      reload();
    } catch (err) {
      toast.error(adminErrorText(err));
    }
  });

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(created.join('\n'));
      toast.success('Nusxalandi');
    } catch {
      toast.error("Nusxalab bo'lmadi");
    }
  };

  const remove = async (code: string) => {
    try {
      await api.admin.deleteGift(code);
      reload();
    } catch (err) {
      toast.error(adminErrorText(err));
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Sovg'a sertifikatlari</h1>
      <p className="muted text-sm">
        Sertifikat mijoz profilida faollashtiriladi va uning bonus balansiga qo'shiladi (1 bonus = 1 so'm). Har bir kod faqat bir marta ishlatiladi;
        kodlarni taxmin qilishga urinishlar serverda cheklangan.
      </p>
      <form onSubmit={onSubmit} noValidate className="card grid gap-3 p-5 sm:grid-cols-4 sm:items-start">
        <InputField label="Qiymati (so'm)" inputMode="numeric" maxLength={7} error={formState.errors.value?.message} {...register('value')} />
        <InputField label="Soni" inputMode="numeric" maxLength={2} error={formState.errors.count?.message} {...register('count')} />
        <InputField label="Amal qilish (kun)" inputMode="numeric" maxLength={3} error={formState.errors.days?.message} {...register('days')} />
        <Button type="submit" className="sm:mt-7" loading={formState.isSubmitting}>
          <Gift className="h-4 w-4" aria-hidden="true" /> Yaratish
        </Button>
      </form>

      {created.length > 0 && (
        <div className="card space-y-3 border-2 border-emerald-300 p-5 dark:border-emerald-800">
          <div className="flex items-center justify-between">
            <b>Yangi kodlar (hozir nusxalab oling)</b>
            <Button size="sm" variant="secondary" onClick={() => void copyAll()}>
              <Copy className="h-4 w-4" aria-hidden="true" /> Hammasini nusxalash
            </Button>
          </div>
          <ul className="grid gap-1 font-mono text-sm sm:grid-cols-2">
            {created.map((c) => <li key={c}>{c}</li>)}
          </ul>
        </div>
      )}

      {!data ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <section className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60">
              <tr>
                <th scope="col" className="p-3">Kod</th>
                <th scope="col" className="p-3">Qiymati</th>
                <th scope="col" className="p-3">Muddati</th>
                <th scope="col" className="p-3">Holat</th>
                <th scope="col" className="p-3 text-right">Amal</th>
              </tr>
            </thead>
            <tbody>
              {data.gifts.map((g) => (
                <tr key={g.code} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-3 font-mono">{g.code}</td>
                  <td className="p-3">{formatNumber(g.value)} so'm</td>
                  <td className="p-3">{g.expiresAt.slice(0, 10)}</td>
                  <td className="p-3">{g.usedAt ? <span className="text-slate-500">Ishlatilgan ({g.usedAt.slice(0, 10)})</span> : <span className="font-semibold text-emerald-600">Faol</span>}</td>
                  <td className="p-3 text-right">
                    {!g.usedAt && (
                      <button type="button" onClick={() => void remove(g.code)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950" aria-label={`O'chirish: ${g.code}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.gifts.length === 0 && <p className="muted p-6 text-center text-sm">Hali sertifikatlar yo'q</p>}
        </section>
      )}
    </div>
  );
}
