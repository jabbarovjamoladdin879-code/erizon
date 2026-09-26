import { useEffect, useState } from 'react';

/** Har `intervalMs` da yangilanadigan joriy vaqt */
export function useNow(intervalMs = 1000, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, enabled]);
  return now;
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
