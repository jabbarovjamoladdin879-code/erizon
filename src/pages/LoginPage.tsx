import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, LogIn, ShieldCheck } from 'lucide-react';
import { OtpSender } from '@/components/auth/OtpSender';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/Field';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { useErrorMessage, useFieldError } from '@/hooks/useFormHelpers';
import { useSeo } from '@/hooks/useSeo';
import { useT } from '@/hooks/useT';
import { api, type LoginResult } from '@/services/api';
import { useAuthStore, useCurrentUser } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { cn } from '@/utils/cn';
import { normalizePhone } from '@/utils/phone';
import { safeRedirect } from '@/utils/redirect';
import { loginSchema, otpCodeSchema, otpLoginFormSchema, type LoginForm, type OtpLoginForm } from '@/utils/validation';

/** Admin 2FA ikkinchi bosqichi */
function TotpStep({ mfaToken, onDone }: { mfaToken: string; onDone: () => void }) {
  const t = useT();
  const errorMessage = useErrorMessage();
  const applyLogin = useAuthStore((s) => s.applyLogin);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!otpCodeSchema.safeParse(code).success) {
      toast.error(t('otp.format'));
      return;
    }
    setBusy(true);
    try {
      applyLogin(await api.auth.loginTotp(mfaToken, code));
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <p className="flex gap-2 rounded-xl bg-brand-50 p-3 text-sm dark:bg-brand-950/50">
        <ShieldCheck className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
        {t('auth.totpHint')}
      </p>
      <InputField
        label={t('auth.totpCode')}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        autoFocus
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        className="text-center font-mono text-xl tracking-[0.5em]"
      />
      <Button type="submit" block size="lg" loading={busy}>
        {t('auth.confirm')}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  const t = useT();
  useSeo(t('auth.login'));
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const user = useCurrentUser();
  const applyLogin = useAuthStore((s) => s.applyLogin);
  const fieldError = useFieldError();
  const errorMessage = useErrorMessage();
  const [mode, setMode] = useState<'password' | 'email'>('password');
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const redirect = safeRedirect(params.get('redirect'));

  const pwForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { phone: '', password: '' } });
  const emailForm = useForm<OtpLoginForm>({ resolver: zodResolver(otpLoginFormSchema), defaultValues: { email: '', otp: '' } });

  if (user && !mfaToken) return <Navigate to={user.role === 'admin' && redirect === '/profile' ? '/admin' : redirect} replace />;

  const handleResult = (res: LoginResult) => {
    const { mfaToken: token } = applyLogin(res);
    if (token) {
      setMfaToken(token);
      return;
    }
    toast.success(t('toast.welcome'));
  };

  const onPassword = pwForm.handleSubmit(async (data) => {
    setError(null);
    try {
      handleResult(await api.auth.login(normalizePhone(data.phone), data.password));
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  const onEmail = emailForm.handleSubmit(async (data) => {
    setError(null);
    try {
      handleResult(await api.auth.loginOtp(data.email, data.otp));
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <div className="container-page grid place-items-center py-10">
      <div className="card relative w-full max-w-md animate-fade-up overflow-hidden p-6 shadow-lift before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-brand-gradient sm:p-8">
        <h1 className="text-2xl font-extrabold">{mfaToken ? t('auth.totpTitle') : t('auth.login')}</h1>
        {!mfaToken && <p className="muted mt-1 text-sm">{t('auth.loginText')}</p>}

        {mfaToken ? (
          <TotpStep
            mfaToken={mfaToken}
            onDone={() => {
              setMfaToken(null);
              toast.success(t('toast.welcome'));
              navigate('/admin', { replace: true });
            }}
          />
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="tablist" aria-label={t('auth.method')}>
              {(['password', 'email'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => {
                    setMode(m);
                    setError(null);
                  }}
                  className={cn('rounded-lg py-2 text-sm font-semibold transition', mode === m ? 'bg-white shadow-sm dark:bg-slate-900' : 'text-slate-500')}
                >
                  {m === 'password' ? t('auth.byPassword') : t('auth.byEmail')}
                </button>
              ))}
            </div>

            {mode === 'password' ? (
              <form onSubmit={onPassword} noValidate className="mt-5 space-y-4">
                <Controller
                  control={pwForm.control}
                  name="phone"
                  render={({ field }) => (
                    <PhoneInput label={t('form.phone')} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} error={fieldError(pwForm.formState.errors.phone?.message)} />
                  )}
                />
                <InputField
                  type="password"
                  label={t('form.password')}
                  autoComplete="current-password"
                  maxLength={64}
                  error={fieldError(pwForm.formState.errors.password?.message)}
                  {...pwForm.register('password')}
                />
                <div className="text-right">
                  <Link to="/reset" className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">
                    {t('auth.forgot')}
                  </Link>
                </div>
                {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{error}</p>}
                <Button type="submit" block size="lg" loading={pwForm.formState.isSubmitting}>
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  {t('auth.login')}
                </Button>
              </form>
            ) : (
              <form onSubmit={onEmail} noValidate className="mt-5 space-y-4">
                <InputField
            type="email"
            label={t('form.email')}
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            placeholder="namuna@gmail.com"
            error={fieldError(emailForm.formState.errors.email?.message)}
            {...emailForm.register('email')}
          />
                <OtpSender email={emailForm.watch('email')} purpose="login" onDevCode={(code) => emailForm.setValue('otp', code)} />
                <InputField
                  label={t('otp.code')}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="text-center font-mono tracking-[0.4em]"
                  error={fieldError(emailForm.formState.errors.otp?.message)}
                  {...emailForm.register('otp')}
                />
                {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{error}</p>}
                <Button type="submit" block size="lg" loading={emailForm.formState.isSubmitting}>
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                  {t('auth.login')}
                </Button>
              </form>
            )}

            <p className="muted mt-5 text-center text-sm">
              {t('auth.noAccount')}{' '}
              <Link to={`/register?redirect=${encodeURIComponent(redirect)}`} className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
                {t('auth.register')}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
