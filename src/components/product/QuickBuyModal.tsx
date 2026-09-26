import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { useErrorMessage, useFieldError, useSubmitGuard } from '@/hooks/useFormHelpers';
import { usePrice, useT } from '@/hooks/useT';
import { api } from '@/services/api';
import { useCurrentUser } from '@/store/authStore';
import { useOrderStore } from '@/store/orderStore';
import { toast } from '@/store/toastStore';
import type { CartItemOptions, Product } from '@/types';
import { normalizePhone, formatPhoneMask } from '@/utils/phone';
import { makeCartKey } from '@/utils/pricing';
import { sanitizeText } from '@/utils/sanitize';
import { quickBuySchema, type QuickBuyForm } from '@/utils/validation';

interface Props {
  open: boolean;
  onClose: () => void;
  product: Product;
  qty: number;
  options?: CartItemOptions;
  total: number;
}

/** "1 klikda xarid" — ro'yxatdan o'tmasdan, faqat ism va telefon bilan */
export function QuickBuyModal({ open, onClose, product, qty, options, total }: Props) {
  const t = useT();
  const fmt = usePrice();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const fieldError = useFieldError();
  const guard = useSubmitGuard(2, 30_000);
  const errorMessage = useErrorMessage();
  const rememberOrder = useOrderStore((s) => s.remember);
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKey = useRef(crypto.randomUUID());

  const { register, handleSubmit, control, formState } = useForm<QuickBuyForm>({
    resolver: zodResolver(quickBuySchema),
    defaultValues: { name: user?.name ?? '', phone: user ? formatPhoneMask(user.phone) : '' },
  });

  const onSubmit = handleSubmit(async (data) => {
    if (submitting || !guard()) return;
    setSubmitting(true);
    try {
      const res = await api.placeOrder(
        {
          items: [{ key: makeCartKey('product', product.id, options), kind: 'product', refId: product.id, qty, options }],
          customerName: sanitizeText(data.name, 50),
          phone: normalizePhone(data.phone),
          deliveryMethod: 'quick',
          deliveryTime: 'asap',
          paymentMethod: 'cash',
        },
        idempotencyKey.current,
      );
      rememberOrder({ id: res.order.id, token: res.trackToken, createdAt: res.order.createdAt });
      toast.success(t('toast.orderPlaced'));
      onClose();
      navigate(`/order/success/${res.order.id}?t=${encodeURIComponent(res.trackToken)}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Modal open={open} onClose={onClose} title={t('quick.title')} size="sm">
      <p className="muted mb-4 text-sm">{t('quick.text')}</p>
      <div className="mb-4 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
        <div className="font-semibold">{product.name}</div>
        <div className="muted">
          {qty} × · {t('cart.total')}: <b className="text-slate-900 dark:text-white">{fmt(total)}</b>
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <InputField
          label={t('form.name')}
          autoComplete="name"
          maxLength={50}
          error={fieldError(formState.errors.name?.message)}
          {...register('name')}
        />
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
        <Button type="submit" block size="lg" variant="accent" loading={submitting}>
          <Zap className="h-4 w-4" aria-hidden="true" />
          {t('quick.submit')}
        </Button>
      </form>
    </Modal>
  );
}
