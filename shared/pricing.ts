import { COMBOS } from './combos.js';
import {
  BONUS_MAX_SHARE,
  CASHBACK_PERCENT,
  CUT_SURCHARGE,
  EXTRA_CHEESE_PRICE,
  EXTRAS,
  QTY_MAX,
  SAUCES,
  WEIGHT_MAX,
  WEIGHT_MIN,
  WEIGHT_STEP,
} from './options.js';
import { FREE_DELIVERY_THRESHOLD } from './zones.js';
import type {
  CartItem,
  CartItemOptions,
  Combo,
  DealOfDay,
  DeliveryMethod,
  DeliveryZone,
  Product,
  PromoCode,
  Unit,
} from './types.js';

/**
 * Narx hisob-kitoblari. Savatda faqat mahsulot ID, miqdor va sozlamalar saqlanadi —
 * narxlar har doim joriy katalogdan QAYTA hisoblanadi (saqlangan narxga ishonilmaydi).
 *
 * Bu modul frontend (tezkor ko'rsatish) va backend (YAKUNIY, ishonchli hisob) tomonidan
 * birgalikda ishlatiladi. Buyurtma summasi, chegirma, bonus va promokod faqat serverda
 * (server/routes/orders.ts) ma'lumotlar bazasidagi narxlar asosida hisoblanadi.
 */

export function isDealActive(deal: DealOfDay | null, now: number): deal is DealOfDay {
  return !!deal && Date.parse(deal.endsAt) > now;
}

export interface EffectivePrice {
  price: number;
  oldPrice?: number;
  isDeal: boolean;
}

export function getEffectivePrice(product: Product, deal: DealOfDay | null, now: number): EffectivePrice {
  if (isDealActive(deal, now) && deal.productId === product.id && deal.dealPrice < product.price) {
    return { price: deal.dealPrice, oldPrice: product.oldPrice ?? product.price, isDeal: true };
  }
  const oldPrice = product.oldPrice && product.oldPrice > product.price ? product.oldPrice : undefined;
  return { price: product.price, oldPrice, isDeal: false };
}

export function isWeighted(unit: Unit): boolean {
  return unit === 'kg';
}

export function clampQty(unit: Unit, qty: number): number {
  if (!Number.isFinite(qty)) return isWeighted(unit) ? WEIGHT_MIN : 1;
  if (isWeighted(unit)) {
    const stepped = Math.round(qty / WEIGHT_STEP) * WEIGHT_STEP;
    return Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, stepped));
  }
  return Math.min(QTY_MAX, Math.max(1, Math.round(qty)));
}

/** Tanlangan sozlamalar uchun qo'shimcha narx (1 dona / 1 kg uchun) */
export function getOptionsSurcharge(product: Product, options?: CartItemOptions): number {
  if (!options) return 0;
  let extra = 0;
  if (product.categoryId === 'meat' && product.cuttable && options.cut) {
    extra += CUT_SURCHARGE[options.cut] ?? 0;
  }
  if (product.categoryId === 'fastfood' && options.fastfood) {
    const ff = options.fastfood;
    extra += SAUCES.find((s) => s.id === ff.sauce)?.price ?? 0;
    if (ff.extraCheese) extra += EXTRA_CHEESE_PRICE;
    for (const id of new Set(ff.extras)) {
      extra += EXTRAS.find((e) => e.id === id)?.price ?? 0;
    }
  }
  return extra;
}

export function getUnitPrice(product: Product, options: CartItemOptions | undefined, deal: DealOfDay | null, now: number): number {
  return getEffectivePrice(product, deal, now).price + getOptionsSurcharge(product, options);
}

export function getComboRegularPrice(combo: Combo, products: Map<string, Product>, deal: DealOfDay | null, now: number): number {
  return combo.items.reduce((sum, item) => {
    const p = products.get(item.productId);
    return p ? sum + getEffectivePrice(p, deal, now).price * item.qty : sum;
  }, 0);
}

export function isComboAvailable(combo: Combo, products: Map<string, Product>): boolean {
  return combo.items.every((item) => products.get(item.productId)?.inStock);
}

/** Savat elementi uchun barqaror kalit: bir xil taom turli sozlamalar bilan alohida qator bo'ladi */
export function makeCartKey(kind: CartItem['kind'], refId: string, options?: CartItemOptions): string {
  if (!options) return `${kind}:${refId}`;
  const ff = options.fastfood
    ? `${options.fastfood.sauce}|${options.fastfood.extraCheese ? 1 : 0}|${options.fastfood.spicy ? 1 : 0}|${[...options.fastfood.extras].sort().join(',')}`
    : '';
  return `${kind}:${refId}:${options.size ?? ''}:${options.color ?? ''}:${options.cut ?? ''}:${ff}`;
}

export interface CartLine {
  item: CartItem;
  product?: Product;
  combo?: Combo;
  unit: Unit;
  unitPrice: number;
  lineTotal: number;
  available: boolean;
  isFastFood: boolean;
}

export function computeCartLines(
  items: CartItem[],
  products: Map<string, Product>,
  deal: DealOfDay | null,
  now: number,
): CartLine[] {
  const lines: CartLine[] = [];
  for (const item of items) {
    if (item.kind === 'combo') {
      const combo = COMBOS.find((c) => c.id === item.refId);
      if (!combo) continue;
      const qty = clampQty('set', item.qty);
      const available = isComboAvailable(combo, products);
      lines.push({
        item: { ...item, qty },
        combo,
        unit: 'set',
        unitPrice: combo.price,
        lineTotal: available ? combo.price * qty : 0,
        available,
        isFastFood: combo.items.some((i) => products.get(i.productId)?.categoryId === 'fastfood'),
      });
      continue;
    }
    const product = products.get(item.refId);
    if (!product) continue;
    const qty = clampQty(product.unit, item.qty);
    const unitPrice = getUnitPrice(product, item.options, deal, now);
    lines.push({
      item: { ...item, qty },
      product,
      unit: product.unit,
      unitPrice,
      lineTotal: product.inStock ? Math.round(unitPrice * qty) : 0,
      available: product.inStock,
      isFastFood: product.categoryId === 'fastfood',
    });
  }
  return lines;
}

export type PromoError =
  | 'promo.notFound'
  | 'promo.expired'
  | 'promo.inactive'
  | 'promo.minOrder'
  | 'promo.firstOnly'
  | 'promo.exhausted';

export type PromoResult = { ok: true; promo: PromoCode } | { ok: false; error: PromoError; minOrder?: number };

export function normalizePromoCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
}

export function validatePromo(
  rawCode: string,
  promos: PromoCode[],
  ctx: { subtotal: number; now: number; isFirstOrder: boolean },
): PromoResult {
  const code = normalizePromoCode(rawCode);
  const promo = promos.find((p) => p.code === code);
  if (!promo) return { ok: false, error: 'promo.notFound' };
  if (!promo.active) return { ok: false, error: 'promo.inactive' };
  if (Date.parse(promo.expiresAt) <= ctx.now) return { ok: false, error: 'promo.expired' };
  if (promo.maxUses && (promo.usedCount ?? 0) >= promo.maxUses) return { ok: false, error: 'promo.exhausted' };
  if (promo.firstOrderOnly && !ctx.isFirstOrder) return { ok: false, error: 'promo.firstOnly' };
  if (ctx.subtotal < promo.minOrder) return { ok: false, error: 'promo.minOrder', minOrder: promo.minOrder };
  return { ok: true, promo };
}

export function getPromoDiscount(promo: PromoCode, subtotal: number): number {
  let d = promo.type === 'percent' ? Math.round((subtotal * Math.min(promo.value, 100)) / 100) : promo.value;
  if (promo.maxDiscount) d = Math.min(d, promo.maxDiscount);
  return Math.max(0, Math.min(d, subtotal));
}

export interface Totals {
  subtotal: number;
  discount: number;
  bonusUsed: number;
  maxBonus: number;
  deliveryFee: number;
  freeDelivery: boolean;
  total: number;
  bonusEarned: number;
}

export function computeTotals(input: {
  subtotal: number;
  promo: PromoCode | null;
  useBonus: boolean;
  bonusBalance: number;
  deliveryMethod: DeliveryMethod;
  zone: DeliveryZone | null;
}): Totals {
  const subtotal = Math.max(0, Math.round(input.subtotal));
  const discount = input.promo ? getPromoDiscount(input.promo, subtotal) : 0;
  const afterDiscount = subtotal - discount;
  const maxBonus = Math.max(0, Math.min(Math.floor(input.bonusBalance), Math.floor(afterDiscount * BONUS_MAX_SHARE)));
  const bonusUsed = input.useBonus ? maxBonus : 0;
  const freeDelivery = afterDiscount >= FREE_DELIVERY_THRESHOLD;
  const deliveryFee =
    input.deliveryMethod === 'delivery' && input.zone && subtotal > 0 && !freeDelivery ? input.zone.fee : 0;
  const payable = afterDiscount - bonusUsed;
  return {
    subtotal,
    discount,
    bonusUsed,
    maxBonus,
    deliveryFee,
    freeDelivery,
    total: payable + deliveryFee,
    bonusEarned: Math.floor((payable * CASHBACK_PERCENT) / 100),
  };
}
