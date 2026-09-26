import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiRequestError } from '@/services/http';
import { toast } from '@/store/toastStore';

/** Admin sahifalari uchun ma'lumot yuklash; 2FA talab qilinsa — xavfsizlik sahifasiga */
export function useAdminQuery<T>(loader: () => Promise<T>): { data: T | null; error: string | null; reload: () => void } {
  const navigate = useNavigate();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    loader()
      .then((d) => {
        if (alive) {
          setData(d);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!alive) return;
        const code = err instanceof ApiRequestError ? err.code : 'err.server';
        if (code === 'auth.mfaSetup') {
          toast.info('Avval ikki bosqichli himoyani (2FA) yoqing');
          navigate('/admin/security', { replace: true });
          return;
        }
        if (code === 'auth.mfaRequired' || code === 'err.unauthorized') {
          navigate('/login?redirect=/admin', { replace: true });
          return;
        }
        setError(code);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loader har renderda yangi funksiya bo'lishi mumkin
  }, [tick, navigate]);

  return { data, error, reload };
}

/** Admin amallaridagi xatolarni o'zbekcha xabarga aylantirish */
export function adminErrorText(err: unknown): string {
  const code = err instanceof ApiRequestError ? err.code : 'err.server';
  const map: Record<string, string> = {
    'err.validation': "Ma'lumotlar noto'g'ri to'ldirilgan",
    'admin.imageTooLarge': 'Rasm hajmi 1.5 MB dan oshmasin',
    'admin.imageType': 'Faqat PNG, JPEG yoki WEBP rasm yuklash mumkin',
    'admin.statusLocked': "Yakunlangan buyurtma holatini o'zgartirib bo'lmaydi",
    'admin.dealPrice': "Aksiya narxi joriy narxdan kichik bo'lishi kerak",
    'admin.2faAlready': '2FA allaqachon yoqilgan',
    'auth.totpInvalid': "Kod noto'g'ri yoki muddati o'tgan",
    'auth.tooMany': "Juda ko'p urinish, biroz kuting",
    'v.tooMany': "Juda ko'p so'rov, biroz kuting",
    'err.forbidden': "Ruxsat yo'q",
    'err.notFound': 'Topilmadi',
  };
  return map[code] ?? "Xatolik yuz berdi. Qayta urinib ko'ring.";
}
