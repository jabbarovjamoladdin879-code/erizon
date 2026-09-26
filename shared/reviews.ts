import type { Review } from './types.js';

const AUTHORS = ['Dilnoza', 'Jasur', 'Aziza', 'Bekzod', 'Gulnora', 'Sardor', 'Madina', 'Rustam', 'Zarina', 'Oybek'];
const TEXTS: Record<number, string[]> = {
  5: [
    "Juda yaxshi mahsulot, sifati a'lo. Yetkazib berish ham tez bo'ldi!",
    'Narxiga nisbatan zo\'r. Yana buyurtma beraman.',
    'Hammasi rasmdagidek, rahmat Erizon Mall!',
  ],
  4: [
    "Yaxshi, lekin qadoqlash biroz yaxshiroq bo'lishi mumkin edi.",
    "Sifati yaxshi, kuryer biroz kechikdi, ammo xushmuomala ekan.",
  ],
  3: ["O'rtacha. Kutganimdek emas, lekin yomon ham emas."],
};

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Har bir mahsulot uchun deterministik namuna sharhlar (mock) */
export function getSeedReviews(productId: string, rating: number): Review[] {
  const h = hash(productId);
  const count = 2 + (h % 2);
  return Array.from({ length: count }, (_, i) => {
    const k = (h >> (i * 3)) >>> 0;
    const r = i === 0 ? 5 : Math.max(3, Math.min(5, Math.round(rating - (k % 3) * 0.5)));
    const pool = TEXTS[r] ?? TEXTS[5];
    return {
      id: `seed-${productId}-${i}`,
      productId,
      author: AUTHORS[(k + i) % AUTHORS.length],
      rating: r,
      text: pool[k % pool.length],
      createdAt: new Date(Date.UTC(2026, 7, 1 + ((k + i * 5) % 28))).toISOString(),
      helpful: k % 17,
    };
  });
}

/** Reyting bo'yicha yulduzlar taqsimoti (mock statistika) */
export function getSeedDistribution(rating: number, total: number): number[] {
  // 5, 4, 3, 2, 1 yulduzlar ulushlari
  const five = Math.max(0.3, Math.min(0.9, (rating - 3.6) / 1.4));
  const four = Math.max(0.05, (1 - five) * 0.6);
  const three = Math.max(0.02, (1 - five - four) * 0.6);
  const two = Math.max(0.01, (1 - five - four - three) * 0.6);
  const one = Math.max(0, 1 - five - four - three - two);
  return [five, four, three, two, one].map((p) => Math.round(p * total));
}
