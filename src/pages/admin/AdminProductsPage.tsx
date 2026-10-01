import { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, ImagePlus, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { InputField, TextareaField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { AppIcon } from '@/components/ui/AppIcon';
import { ProductImage } from '@/components/ui/ProductImage';
import { Skeleton } from '@/components/ui/Skeleton';
import { CATEGORIES } from '@/data/categories';
import { DEFAULT_ICON, ICON_NAMES } from '@/data/icons';
import { adminErrorText, useAdminQuery } from '@/hooks/useAdminQuery';
import { useSeo } from '@/hooks/useSeo';
import { api, type AdminProductInput } from '@/services/api';
import { useCatalogStore } from '@/store/catalogStore';
import { toast } from '@/store/toastStore';
import { CATEGORY_IDS, UNITS, type CategoryId, type Product } from '@/types';
import { cn } from '@/utils/cn';
import { formatNumber } from '@/utils/format';
import { sanitizeText } from '@/utils/sanitize';
import { normalizeSearch } from '@/utils/search';

const CAT_LABEL: Record<CategoryId, string> = {
  clothing: 'Kiyim-kechak',
  grocery: 'Oziq-ovqat',
  drinks: 'Ichimliklar',
  meat: "Go'sht mahsulotlari",
  fastfood: 'Fast-food',
  dairy: 'Sut mahsulotlari',
  produce: 'Meva va sabzavotlar',
  sweets: 'Shirinliklar va non',
  chemicals: 'Maishiy kimyo',
  cosmetics: 'Kosmetika',
  kids: 'Bolalar uchun',
  home: "Uy-ro'zg'or",
};
const UNIT_LABEL: Record<(typeof UNITS)[number], string> = { pcs: 'dona', kg: 'kg', l: 'litr', pack: 'paket', box: 'quti', set: "to'plam" };

const SAFE = /^[^<>{}$]*$/;
const schema = z
  .object({
    name: z.string().trim().min(3, 'Kamida 3 ta belgi').max(80, "Ko'pi bilan 80 ta belgi").regex(SAFE, 'Ruxsat etilmagan belgilar (< > { } $)'),
    categoryId: z.enum(CATEGORY_IDS),
    price: z.string().regex(/^\d{3,9}$/, 'Narx: 100 dan 999 999 999 gacha butun son'),
    oldPrice: z.string().regex(/^(\d{3,9})?$/, "Eski narx: butun son yoki bo'sh"),
    unit: z.enum(UNITS),
    inStock: z.boolean(),
    description: z.string().trim().min(10, 'Kamida 10 ta belgi').max(600, "Ko'pi bilan 600 ta belgi").regex(SAFE, 'Ruxsat etilmagan belgilar'),
    icon: z.enum(ICON_NAMES, { message: 'Ikonkani tanlang' }),
    manufacturer: z.string().trim().max(80, 'Juda uzun').regex(SAFE, 'Ruxsat etilmagan belgilar'),
    expiry: z.string().trim().max(60, 'Juda uzun').regex(SAFE, 'Ruxsat etilmagan belgilar'),
    halal: z.boolean(),
    prepTime: z.string().regex(/^(\d{1,3})?$/, 'Daqiqa: butun son'),
  })
  .superRefine((v, ctx) => {
    if (v.oldPrice && Number(v.oldPrice) <= Number(v.price)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['oldPrice'], message: "Eski narx joriy narxdan katta bo'lishi kerak" });
    }
  });
type Form = z.infer<typeof schema>;

function toForm(p?: Product): Form {
  return {
    name: p?.name ?? '',
    categoryId: p?.categoryId ?? 'grocery',
    price: p ? String(p.price) : '',
    oldPrice: p?.oldPrice ? String(p.oldPrice) : '',
    unit: p?.unit ?? 'pcs',
    inStock: p?.inStock ?? true,
    description: p?.description ?? '',
    icon: p?.icon ?? DEFAULT_ICON,
    manufacturer: p?.manufacturer ?? '',
    expiry: p?.expiry ?? '',
    halal: p?.halal ?? false,
    prepTime: p?.prepTime ? String(p.prepTime) : '',
  };
}

function StockSwitch({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={cn('relative inline-flex h-6 w-11 shrink-0 rounded-full transition', on ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700')}
    >
      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} />
    </button>
  );
}

const MAX_IMAGE_BYTES = 1_500_000;

function ImageUploader({ images, onChange }: { images: string[]; onChange: (v: string[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const next = [...images];
    for (const file of Array.from(files).slice(0, 6 - images.length)) {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        toast.error(`${file.name}: faqat PNG, JPEG yoki WEBP`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error(`${file.name}: 1.5 MB dan katta`);
        continue;
      }
      try {
        next.push((await api.admin.uploadImage(file)).url);
      } catch (err) {
        toast.error(adminErrorText(err));
      }
    }
    onChange(next);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <span className="label">Rasmlar (6 tagacha, har biri ≤ 1.5 MB)</span>
      <div className="flex flex-wrap gap-2">
        {images.map((src, i) => (
          <div key={src} className="relative">
            <img src={src} alt={`Rasm ${i + 1}`} className="h-20 w-20 rounded-xl object-cover" />
            <button
              type="button"
              onClick={() => onChange(images.filter((x) => x !== src))}
              className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-red-600 text-white shadow"
              aria-label={`${i + 1}-rasmni o'chirish`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {images.length < 6 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="grid h-20 w-20 place-items-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-brand-500 hover:text-brand-600 disabled:opacity-50 dark:border-slate-700"
            aria-label="Rasm yuklash"
          >
            <ImagePlus className={cn('h-6 w-6', busy && 'animate-pulse')} />
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={(e) => void upload(e.target.files)} />
    </div>
  );
}

function ProductForm({ product, onDone }: { product?: Product; onDone: (p: Product) => void }) {
  const { register, handleSubmit, formState, watch } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: toForm(product) });
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const category = watch('categoryId');

  const onSubmit = handleSubmit(async (v) => {
    const clean = (s: string, max: number) => sanitizeText(s, max) || undefined;
    const data: AdminProductInput = {
      name: sanitizeText(v.name, 80),
      categoryId: v.categoryId,
      price: Number(v.price),
      oldPrice: v.oldPrice ? Number(v.oldPrice) : null,
      unit: v.unit,
      inStock: v.inStock,
      description: sanitizeText(v.description, 600),
      icon: v.icon,
      manufacturer: clean(v.manufacturer, 80),
      expiry: clean(v.expiry, 60),
      halal: v.halal,
      prepTime: v.categoryId === 'fastfood' && v.prepTime ? Math.min(180, Math.max(1, Number(v.prepTime))) : null,
      images,
    };
    try {
      const res = product ? await api.admin.updateProduct(product.id, data) : await api.admin.createProduct(data);
      toast.success(product ? 'Mahsulot yangilandi' : "Mahsulot qo'shildi");
      onDone(res.product);
    } catch (err) {
      toast.error(adminErrorText(err));
    }
  });

  const err = formState.errors;
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <InputField label="Nomi" maxLength={80} error={err.name?.message} {...register('name')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pf-cat" className="label">Kategoriya</label>
          <select id="pf-cat" className="input" {...register('categoryId')}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{CAT_LABEL[c.id]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="pf-unit" className="label">O'lchov birligi</label>
          <select id="pf-unit" className="input" {...register('unit')}>
            {UNITS.map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}
          </select>
        </div>
        <InputField label="Narx (so'm)" inputMode="numeric" maxLength={9} error={err.price?.message} {...register('price')} />
        <InputField label="Eski narx (ixtiyoriy)" inputMode="numeric" maxLength={9} error={err.oldPrice?.message} {...register('oldPrice')} />
        <div>
          <label htmlFor="pf-icon" className="label">Ikonka (rasm bo'lmasa)</label>
          <div className="flex items-center gap-2">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300">
              <AppIcon name={watch('icon')} className="h-5 w-5" />
            </span>
            <select id="pf-icon" className="input" aria-invalid={!!err.icon} {...register('icon')}>
              {ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          {err.icon?.message && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{err.icon.message}</p>}
        </div>
        <InputField label="Ishlab chiqaruvchi (brend)" maxLength={80} error={err.manufacturer?.message} {...register('manufacturer')} />
        <InputField label="Yaroqlilik muddati" maxLength={60} error={err.expiry?.message} {...register('expiry')} />
        {category === 'fastfood' && (
          <InputField label="Tayyorlanish vaqti (daqiqa)" inputMode="numeric" maxLength={3} error={err.prepTime?.message} {...register('prepTime')} />
        )}
      </div>
      <ImageUploader images={images} onChange={setImages} />
      <TextareaField label="Tavsif" maxLength={600} error={err.description?.message} {...register('description')} />
      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-5 w-5 accent-brand-600" {...register('inStock')} /> Omborda bor</label>
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-5 w-5 accent-emerald-600" {...register('halal')} /> Halol</label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" loading={formState.isSubmitting}>{product ? 'Saqlash' : "Qo'shish"}</Button>
      </div>
    </form>
  );
}

export default function AdminProductsPage() {
  useSeo('Admin — mahsulotlar');
  const { data, error, reload } = useAdminQuery(api.admin.products);
  const upsertProduct = useCatalogStore((s) => s.upsertProduct);
  const removeProduct = useCatalogStore((s) => s.removeProduct);
  const [local, setLocal] = useState<Product[] | null>(null);
  const products = local ?? data?.products ?? null;
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<CategoryId | ''>('');
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const list = useMemo(() => {
    if (!products) return [];
    const nq = normalizeSearch(q);
    return products.filter((p) => (!cat || p.categoryId === cat) && (!nq || normalizeSearch(p.name).includes(nq)));
  }, [products, q, cat]);

  const apply = (p: Product) => {
    setLocal((cur) => {
      const base = cur ?? data?.products ?? [];
      return base.some((x) => x.id === p.id) ? base.map((x) => (x.id === p.id ? p : x)) : [p, ...base];
    });
    // Do'kon sahifalarida darhol aks etadi (ichki maydonlarsiz)
    const { views: _views, ...pub } = p;
    upsertProduct(pub);
  };

  const toggle = async (p: Product) => {
    try {
      apply((await api.admin.toggleStock(p.id)).product);
    } catch (err) {
      toast.error(adminErrorText(err));
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await api.admin.deleteProduct(deleting.id);
      setLocal((cur) => (cur ?? data?.products ?? []).filter((x) => x.id !== deleting.id));
      removeProduct(deleting.id);
      toast.info("Mahsulot o'chirildi");
    } catch (err) {
      toast.error(adminErrorText(err));
    }
    setDeleting(null);
  };

  if (error) {
    return (
      <div className="card p-6 text-sm">
        Mahsulotlarni yuklab bo'lmadi. <Button size="sm" variant="ghost" onClick={reload}>Qayta urinish</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Mahsulotlar <span className="muted text-base font-medium">({products?.length ?? '…'})</span></h1>
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Yangi mahsulot
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <label htmlFor="ap-search" className="sr-only">Qidirish</label>
          <input id="ap-search" className="input pl-9" placeholder="Nomi bo'yicha qidirish" maxLength={60} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label htmlFor="ap-cat" className="sr-only">Kategoriya</label>
        <select id="ap-cat" className="input w-auto" value={cat} onChange={(e) => setCat(e.target.value as CategoryId | '')}>
          <option value="">Barcha kategoriyalar</option>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{CAT_LABEL[c.id]}</option>)}
        </select>
      </div>

      {!products ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          {/* Telefon: kartochkalar ro'yxati */}
          <ul className="space-y-2 md:hidden">
            {list.map((p) => (
              <li key={p.id} className="card flex items-center gap-3 p-3">
                <ProductImage icon={p.icon} hue={p.hue} src={p.images?.[0]} alt="" className="h-14 w-14 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className="muted truncate text-xs">{CAT_LABEL[p.categoryId]} · <Eye className="inline h-3 w-3" aria-label="ko'rishlar" /> {p.views ?? 0}</div>
                  <div className="mt-0.5 text-sm font-bold tabular-nums">{formatNumber(p.price)} so'm</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StockSwitch on={p.inStock} label={`${p.name}: omborda bor`} onToggle={() => void toggle(p)} />
                  <div className="flex gap-0.5">
                    <button type="button" onClick={() => setEditing(p)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={`Tahrirlash: ${p.name}`}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setDeleting(p)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950" aria-label={`O'chirish: ${p.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60">
                <tr>
                  <th scope="col" className="p-3">Mahsulot</th>
                  <th scope="col" className="p-3">Kategoriya</th>
                  <th scope="col" className="p-3 text-right">Narx</th>
                  <th scope="col" className="p-3 text-right">Ko'rishlar</th>
                  <th scope="col" className="p-3 text-center">Omborda</th>
                  <th scope="col" className="p-3 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <ProductImage icon={p.icon} hue={p.hue} src={p.images?.[0]} alt="" className="h-10 w-10 shrink-0 rounded-lg" />
                        <div className="min-w-0">
                          <div className="truncate font-medium">{p.name}</div>
                          <div className="muted font-mono text-xs">{p.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">{CAT_LABEL[p.categoryId]}</td>
                    <td className="p-3 text-right font-semibold tabular-nums">
                      {formatNumber(p.price)}
                      {p.oldPrice && <div className="text-xs font-normal text-slate-400 line-through">{formatNumber(p.oldPrice)}</div>}
                    </td>
                    <td className="p-3 text-right tabular-nums">{p.views ?? 0}</td>
                    <td className="p-3 text-center">
                      <StockSwitch on={p.inStock} label={`${p.name}: omborda bor`} onToggle={() => void toggle(p)} />
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => setEditing(p)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-brand-700 dark:hover:bg-slate-800" aria-label={`Tahrirlash: ${p.name}`}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setDeleting(p)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950" aria-label={`O'chirish: ${p.name}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && <p className="muted p-6 text-center text-sm">Hech narsa topilmadi</p>}
          </div>
        </>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Yangi mahsulot' : 'Mahsulotni tahrirlash'} size="lg">
        {editing !== null && (
          <ProductForm
            key={editing === 'new' ? 'new' : editing.id}
            product={editing === 'new' ? undefined : editing}
            onDone={(p) => {
              apply(p);
              setEditing(null);
            }}
          />
        )}
      </Modal>

      <Modal open={deleting !== null} onClose={() => setDeleting(null)} title="Mahsulotni o'chirish" size="sm">
        <p className="text-sm">«{deleting?.name}» mahsulotini o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.</p>
        <div className="mt-5 flex gap-2">
          <Button variant="danger" onClick={() => void remove()}>O'chirish</Button>
          <Button variant="ghost" onClick={() => setDeleting(null)}>Bekor qilish</Button>
        </div>
      </Modal>
    </div>
  );
}
