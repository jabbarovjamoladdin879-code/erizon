import { useCallback, useRef } from 'react';
import { isTKey } from '@/i18n';
import { ApiRequestError } from '@/services/http';
import { toast } from '@/store/toastStore';
import { createRateLimiter } from '@/utils/rateLimit';
import { useT } from './useT';

/** Zod xato kalitini joriy tilga tarjima qiladi */
export function useFieldError(): (message?: string) => string | undefined {
  const t = useT();
  return useCallback((message) => (message ? (isTKey(message) ? t(message) : message) : undefined), [t]);
}

/** API xatosini joriy tildagi xabarga aylantiradi (server faqat i18n kodini qaytaradi) */
export function useErrorMessage(): (err: unknown) => string {
  const t = useT();
  return useCallback(
    (err) => {
      if (err instanceof ApiRequestError) {
        const retry = typeof err.extra.retryAfter === 'number' ? err.extra.retryAfter : undefined;
        if (retry && (err.code === 'v.tooMany' || err.code === 'auth.tooMany' || err.code === 'auth.locked' || err.code.startsWith('otp.') || err.code === 'promo.locked')) {
          return `${isTKey(err.code) ? t(err.code, { s: retry }) : t('v.tooMany', { s: retry })}`;
        }
        if (err.code === 'err.validation' && err.extra.fields && typeof err.extra.fields === 'object') {
          const first = Object.values(err.extra.fields as Record<string, string>)[0];
          if (first && isTKey(first)) return t(first);
        }
        if (isTKey(err.code)) return t(err.code, { s: retry ?? 60, sum: '' });
      }
      return t('err.server');
    },
    [t],
  );
}

/**
 * Formani ketma-ket ko'p yuborishga qarshi cheklov.
 * Standart: 30 soniyada 3 martadan ko'p emas.
 */
export function useSubmitGuard(max = 3, windowMs = 30_000): () => boolean {
  const t = useT();
  const limiter = useRef(createRateLimiter(max, windowMs));
  return useCallback(() => {
    if (limiter.current.tryHit()) return true;
    const sec = Math.ceil(limiter.current.retryAfter() / 1000);
    toast.error(t('v.tooMany', { s: sec }));
    return false;
  }, [t]);
}
