import { useEffect, useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useErrorMessage } from '@/hooks/useFormHelpers';
import { useT } from '@/hooks/useT';
import { api } from '@/services/api';
import { toast } from '@/store/toastStore';
import { isValidPhone, normalizePhone } from '@/utils/phone';

interface Props {
  phone: string;
  purpose: 'register' | 'login' | 'reset';
  /** Demo rejimida server kodni qaytarsa — maydonga avtomatik qo'yiladi */
  onDevCode?: (code: string) => void;
  onSent?: () => void;
}

/** SMS kod yuborish tugmasi (qayta yuborish 60 soniyadan keyin) */
export function OtpSender({ phone, purpose, onDevCode, onSent }: Props) {
  const t = useT();
  const errorMessage = useErrorMessage();
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  useEffect(() => {
    if (left <= 0) return undefined;
    const id = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [left]);

  const send = async () => {
    if (!isValidPhone(phone)) {
      toast.error(t('v.phone'));
      return;
    }
    setBusy(true);
    try {
      const r = await api.auth.requestOtp(normalizePhone(phone), purpose);
      setLeft(60);
      toast.success(t('otp.sent'));
      if (r.devCode) {
        setDevCode(r.devCode);
        onDevCode?.(r.devCode);
      }
      onSent?.();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button type="button" variant="secondary" block onClick={() => void send()} loading={busy} disabled={left > 0}>
        <MessageSquareText className="h-4 w-4" aria-hidden="true" />
        {left > 0 ? t('otp.resendIn', { s: left }) : t('otp.send')}
      </Button>
      {devCode && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" role="status">
          {t('otp.demo', { code: devCode })}
        </p>
      )}
    </div>
  );
}
