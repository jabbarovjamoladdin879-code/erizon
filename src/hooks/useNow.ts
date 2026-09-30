import { useCallback, useSyncExternalStore } from 'react';

/**
 * Umumiy taymerlar: bir xil intervaldagi barcha komponentlar BITTA setInterval'dan foydalanadi
 * (masalan, katalogdagi 100+ mahsulot kartasi uchun 100 ta taymer emas, bitta).
 * Tinglovchi qolmasa taymer to'xtaydi.
 */
interface Ticker {
  now: number;
  listeners: Set<() => void>;
  timer?: number;
}
const tickers = new Map<number, Ticker>();

function ticker(intervalMs: number): Ticker {
  let t = tickers.get(intervalMs);
  if (!t) {
    t = { now: Date.now(), listeners: new Set() };
    tickers.set(intervalMs, t);
  }
  return t;
}

/** Har `intervalMs` da yangilanadigan joriy vaqt */
export function useNow(intervalMs = 1000, enabled = true): number {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!enabled) return () => undefined;
      const t = ticker(intervalMs);
      t.listeners.add(onChange);
      if (t.timer === undefined) {
        // Taymer uzoq to'xtab turgan bo'lishi mumkin — vaqtni darhol yangilaymiz
        t.now = Date.now();
        onChange();
        t.timer = window.setInterval(() => {
          t.now = Date.now();
          t.listeners.forEach((l) => l());
        }, intervalMs);
      }
      return () => {
        t.listeners.delete(onChange);
        if (t.listeners.size === 0 && t.timer !== undefined) {
          window.clearInterval(t.timer);
          t.timer = undefined;
        }
      };
    },
    [intervalMs, enabled],
  );
  const getSnapshot = useCallback(() => ticker(intervalMs).now, [intervalMs]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export interface Countdown {
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

export function useCountdown(endsAt: string | null | undefined): Countdown {
  const end = endsAt ? Date.parse(endsAt) : 0;
  const now = useNow(1000, end > 0);
  const diff = Math.max(0, end - now);
  return {
    hours: Math.floor(diff / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
    done: diff <= 0,
  };
}
