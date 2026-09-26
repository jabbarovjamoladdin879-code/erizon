import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Gift, UserPlus } from 'lucide-react';
import { OtpSender } from '@/components/auth/OtpSender';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/Field';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { useErrorMessage, useFieldError, useSubmitGuard } from '@/hooks/useFormHelpers';
import { useSeo } from '@/hooks/useSeo';
import { useT } from '@/hooks/useT';
import { api } from '@/services/api';
import { useAuthStore, useCurrentUser } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { normalizePhone } from '@/utils/phone';
import { safeRedirect } from '@/utils/redirect';
import { sanitizeText } from '@/utils/sanitize';
import { registerStepSchema, type RegisterStepForm } from '@/utils/validation';

export default function RegisterPage() {
  const t = useT();
  useSeo(t('auth.register'));
  const [params] = useSearchParams();
  const user = useCurrentUser();
  const setUser = useAuthStore((s) => s.setUser);
  const fieldError = useFieldError();
  const errorMessage = useErrorMessage();
  const guard = useSubmitGuard(3, 60_000);
  const [error, setError] = useState<string | null>(null);
  const redirect = safeRedirect(params.get('redirect'));
  const refFromLink = (params.get('ref') ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);

  const { register, handleSubmit, control, formState, watch, setValue } = useForm<RegisterStepForm>({
    resolver: zodResolver(registerStepSchema),
    defaultValues: { name: '', phone: '', password: '', confirm: '', otp: '', referralCode: refFromLink },
  });

  if (user) return <Navigate to={redirect} replace />;

  const onSubmit = handleSubmit(async (data) => {
    if (!guard()) return;
    setError(null);
    try {
      const res = await api.auth.register({
        name: sanitizeText(data.name, 50),
        phone: normalizePhone(data.phone),
        password: data.password,
        otp: data.otp,
        referralCode: data.referralCode || undefined,
      });
      setUser(res.user);
      toast.success(t('toast.registered'));
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <div className="container-page grid place-items-center py-10">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold">{t('auth.register')}</h1>
        <p className="muted mt-1 text-sm">{t('auth.registerText')}</p>
        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
          <InputField label={t('form.name')} autoComplete="name" maxLength={50} error={fieldError(formState.errors.name?.message)} {...register('name')} />
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <PhoneInput label={t('form.phone')} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} error={fieldError(formState.errors.phone?.message)} />
            )}
          />
          <OtpSender phone={watch('phone')} purpose="register" onDevCode={(code) => setValue('otp', code)} />
          <InputField
            label={t('otp.code')}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="text-center font-mono tracking-[0.4em]"
            error={fieldError(formState.errors.otp?.message)}
            {...register('otp')}
          />
          <InputField
            type="password"
            label={t('form.password')}
            autoComplete="new-password"
            maxLength={64}
            hint={t('auth.passHint')}
            error={fieldError(formState.errors.password?.message)}
            {...register('password')}
          />
          <InputField
            type="password"
            label={t('form.confirm')}
            autoComplete="new-password"
            maxLength={64}
            error={fieldError(formState.errors.confirm?.message)}
            {...register('confirm')}
          />
          <InputField
            label={t('auth.referral')}
            hint={t('auth.referralHint')}
            maxLength={10}
            className="font-mono uppercase"
            error={fieldError(formState.errors.referralCode?.message)}
            {...register('referralCode')}
          />
          {refFromLink && (
            <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              <Gift className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t('auth.referralApplied')}
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </p>
          )}
          <Button type="submit" block size="lg" loading={formState.isSubmitting}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {t('auth.register')}
          </Button>
          <p className="muted text-center text-xs">{t('auth.securityNote')}</p>
        </form>
        <p className="muted mt-5 text-center text-sm">
          {t('auth.haveAccount')}{' '}
          <Link to={`/login?redirect=${encodeURIComponent(redirect)}`} className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
            {t('auth.login')}
          </Link>
        </p>
      </div>
    </div>
  );
}
