import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useErrorMessage } from '@/hooks/useFormHelpers';
import { useT } from '@/hooks/useT';
import { api } from '@/services/api';
import { useCurrentUser } from '@/store/authStore';
import { toast } from '@/store/toastStore';

/** "Kelganda xabar berish" — omborda yo'q mahsulot qaytganda bildirishnoma */
export function StockAlertButton({ productId }: { productId: string }) {
  const t = useT();
  const user = useCurrentUser();
  const location = useLocation();
  const errorMessage = useErrorMessage();
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return undefined;
    let alive = true;
    api.me
      .alerts()
      .then((r) => alive && setSubscribed(r.productIds.includes(productId)))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [user, productId]);

  if (!user) {
    return (
      <Link
        to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-100 text-sm font-semibold text-amber-900 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-200"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {t('alert.loginToSubscribe')}
      </Link>
    );
  }

  const toggle = async () => {
    setBusy(true);
    try {
      if (subscribed) {
        await api.me.removeAlert(productId);
        setSubscribed(false);
        toast.info(t('alert.unsubscribed'));
      } else {
        await api.me.addAlert(productId);
        setSubscribed(true);
        toast.success(t('alert.subscribed'));
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="lg" block variant={subscribed ? 'outline' : 'accent'} loading={busy} onClick={() => void toggle()} aria-pressed={subscribed}>
      {subscribed ? <BellOff className="h-5 w-5" aria-hidden="true" /> : <Bell className="h-5 w-5" aria-hidden="true" />}
      {subscribed ? t('alert.cancel') : t('alert.subscribe')}
    </Button>
  );
}
