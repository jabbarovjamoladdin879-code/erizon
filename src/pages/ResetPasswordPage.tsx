import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { OtpSender } from '@/components/auth/OtpSender';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/Field';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { useErrorMessage, useFieldError } from '@/hooks/useFormHelpers';
import { useSeo } from '@/hooks/useSeo';
import { useT } from '@/hooks/useT';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { normalizePhone } from '@/utils/phone';
import { resetFormSchema, type ResetForm } from '@/utils/validation';

/** Parolni SMS kod orqali tiklash — barcha qurilmalardagi sessiyalar bekor qilinadi */
export default function ResetPasswordPage() {
  const t = useT();
  useSeo(t('auth.resetTitle'));
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const fieldError = useFieldError();
  const errorMessage = useErrorMessage();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, control, formState, watch, setValue } = useForm<ResetForm>({
    resolver: zodResolver(resetFormSchema),
    defaultValues: { phone: '', otp: '', password: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async (data) => {
    setError(null);
    try {
      await api.auth.reset(normalizePhone(data.phone), data.otp, data.password);
      setUser(null);
      toast.success(t('auth.resetDone'));
      navigate('/login', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <div className="container-page grid place-items-center py-10">
      <div className="card relative w-full max-w-md animate-fade-up overflow-hidden p-6 shadow-lift before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-brand-gradient sm:p-8">
        <h1 className="text-2xl font-extrabold">{t('auth.resetTitle')}</h1>
        <p className="muted mt-1 text-sm">{t('auth.resetText')}</p>
        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <PhoneInput label={t('form.phone')} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} error={fieldError(formState.errors.phone?.message)} />
            )}
          />
          <OtpSender phone={watch('phone')} purpose="reset" onDevCode={(code) => setValue('otp', code)} />
          <InputField label={t('otp.code')} inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="text-center font-mono tracking-[0.4em]" error={fieldError(formState.errors.otp?.message)} {...register('otp')} />
          <InputField type="password" label={t('auth.newPassword')} autoComplete="new-password" maxLength={64} hint={t('auth.passHint')} error={fieldError(formState.errors.password?.message)} {...register('password')} />
          <InputField type="password" label={t('form.confirm')} autoComplete="new-password" maxLength={64} error={fieldError(formState.errors.confirm?.message)} {...register('confirm')} />
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{error}</p>}
          <Button type="submit" block size="lg" loading={formState.isSubmitting}>
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            {t('auth.resetSubmit')}
          </Button>
        </form>
        <p className="muted mt-5 text-center text-sm">
          <Link to="/login" className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
            ← {t('auth.login')}
          </Link>
        </p>
      </div>
    </div>
  );
}
