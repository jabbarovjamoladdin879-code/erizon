/**
 * Oddiy "sliding window" cheklovchi. Ketma-ket ko'p yuborishning oldini oladi.
 * Frontenddagi cheklov faqat UX uchun — haqiqiy himoya serverda bo'lishi shart.
 */
export interface RateLimiter {
  /** Urinishni qayd qiladi; ruxsat bo'lsa true */
  tryHit: () => boolean;
  /** Keyingi urinishgacha qolgan vaqt (ms) */
  retryAfter: () => number;
  reset: () => void;
}

export function createRateLimiter(max: number, windowMs: number, storageKey?: string): RateLimiter {
  const load = (): number[] => {
    if (!storageKey) return [];
    try {
      const raw = sessionStorage.getItem(storageKey);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : [];
    } catch {
      return [];
    }
  };
  let hits = load();
  const save = () => {
    if (!storageKey) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(hits));
    } catch {
      /* e'tiborsiz */
    }
  };
  const prune = (now: number) => {
    hits = hits.filter((t) => now - t < windowMs);
  };
  return {
    tryHit() {
      const now = Date.now();
      prune(now);
      if (hits.length >= max) return false;
      hits.push(now);
      save();
      return true;
    },
    retryAfter() {
      const now = Date.now();
      prune(now);
      if (hits.length < max) return 0;
      return Math.max(0, windowMs - (now - hits[0]));
    },
    reset() {
      hits = [];
      save();
    },
  };
}

