import type { Product } from '@/types';

const APOSTROPHES = /['`ʻʼ‘’´ʹ"]/g;

/**
 * Qidiruv uchun matnni normallashtirish: kichik harf, diakritikalarsiz,
 * apostroflarsiz ("go'sht" -> "gosht"), ortiqcha belgilarsiz.
 */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(APOSTROPHES, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Tez-tez uchraydigan imlo chalkashliklarini birxillashtirish (x/h, q/k) */
function loosen(word: string): string {
  return word.replace(/x/g, 'h').replace(/q/g, 'k').replace(/yo/g, 'e');
}

export function levenshtein(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

function tokenScore(token: string, words: string[]): number {
  const lt = loosen(token);
  const allowed = token.length >= 7 ? 2 : token.length >= 4 ? 1 : 0;
  let best = 0;
  for (const word of words) {
    const lw = loosen(word);
    if (word.startsWith(token) || lw.startsWith(lt)) return 30;
    if (word.includes(token) || lw.includes(lt)) best = Math.max(best, 20);
    else if (allowed > 0) {
      const prefix = lw.slice(0, lt.length);
      const d = Math.min(levenshtein(lt, prefix, allowed), levenshtein(lt, lw, allowed));
      if (d <= allowed) best = Math.max(best, 12 - d * 2);
    }
  }
  return best;
}

export interface SearchIndexEntry {
  product: Product;
  text: string;
  words: string[];
}

export function buildSearchIndex(products: Product[], categoryName: (p: Product) => string): SearchIndexEntry[] {
  return products.map((product) => {
    const text = normalizeSearch(`${product.name} ${categoryName(product)} ${product.manufacturer ?? ''}`);
    return { product, text, words: text.split(' ') };
  });
}

/** Imlo xatolariga chidamli qidiruv. Natijalar mos kelish darajasi bo'yicha saralanadi. */
export function searchIndex(index: SearchIndexEntry[], query: string, limit = Infinity): Product[] {
  const q = normalizeSearch(query);
  if (!q) return [];
  const tokens = q.split(' ').filter(Boolean);
  const scored: Array<{ p: Product; score: number }> = [];
  for (const entry of index) {
    let score = 0;
    const nameNorm = entry.text;
    if (nameNorm.startsWith(q)) score += 120;
    else if (nameNorm.includes(q)) score += 100;
    let allMatched = true;
    for (const token of tokens) {
      const s = tokenScore(token, entry.words);
      if (s === 0) {
        allMatched = false;
        break;
      }
      score += s;
    }
    if (!allMatched) continue;
    scored.push({ p: entry.product, score });
  }
  scored.sort((a, b) => b.score - a.score || b.p.popularity - a.p.popularity);
  return scored.slice(0, limit).map((s) => s.p);
}
