import type { CartItemOptions, Combo, Product } from './types.js';

/**
 * Server tomonida buyurtma qatorlarining tavsifi (o'zbek tilida saqlanadi —
 * buyurtma tarixi va Telegram xabarlari uchun).
 */
const SAUCE: Record<string, string> = { ketchup: 'Ketchup', garlic: 'Sarimsoqli', cheese: 'Pishloqli', bbq: 'Barbekyu' };
const EXTRA: Record<string, string> = { jalapeno: 'Xalapenyo', egg: 'Tuxum', mushroom: "Qo'ziqorin", patty: "Qo'shimcha kotlet" };
const CUT: Record<string, string> = { mince: 'Qiyma', pieces: "Bo'laklangan", whole: 'Butun', boneless: 'Suyaksiz' };
export const COMBO_NAMES_UZ: Record<Combo['nameKey'], string> = {
  'combo.plov': "Palov uchun to'plam",
  'combo.family': 'Oilaviy fast-food seti',
  'combo.breakfast': "Nonushta to'plami",
  'combo.clean': "Tozalik to'plami",
};

export function describeOptionsUz(product: Product | undefined, options?: CartItemOptions): string {
  if (!options || !product) return '';
  const parts: string[] = [];
  if (options.size) parts.push(`O'lcham: ${options.size}`);
  if (options.color) parts.push(`Rang: ${options.color}`);
  if (options.cut && product.cuttable) parts.push(CUT[options.cut] ?? '');
  if (options.fastfood && product.categoryId === 'fastfood') {
    const ff = options.fastfood;
    if (SAUCE[ff.sauce]) parts.push(`Sous: ${SAUCE[ff.sauce]}`);
    if (ff.extraCheese) parts.push("Qo'shimcha pishloq");
    parts.push(ff.spicy ? 'Achchiq' : 'Achchiqmas');
    for (const e of ff.extras) if (EXTRA[e]) parts.push(`+ ${EXTRA[e]}`);
  }
  return parts.filter(Boolean).join(', ').slice(0, 300);
}

export function formatSum(n: number): string {
  return `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so'm`;
}
