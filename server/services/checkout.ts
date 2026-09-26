import { COMBOS } from '../../shared/combos.js';
import { computeCartLines, computeTotals, validatePromo, type CartLine } from '../../shared/pricing.js';
import type { CartItem, DealOfDay, DeliveryMethod, DeliveryZone, Product, PromoCode, Quote } from '../../shared/types.js';
import { ZONE_MAP } from '../../shared/zones.js';
import { get, getSetting, setSetting } from '../db.js';
import { products as productRepo, type UserRecord } from '../models.js';
import { toProduct, toPromo, type PromoRow } from './serialize.js';

export interface QuoteInput {
  items: CartItem[];
  promoCode?: string;
  useBonus?: boolean;
  deliveryMethod: DeliveryMethod;
  zoneId?: string;
  phone?: string;
}

export interface QuoteResult {
  quote: Quote;
  lines: CartLine[];
  promo: PromoCode | null;
  promoError?: string;
  zone: DeliveryZone | null;
  products: Map<string, Product>;
}

export interface DealSetting {
  productId: string;
  dealPrice: number;
  endsAt: number;
  auto: boolean;
}

export function endOfTashkentDay(now = Date.now()): number {
  const today = new Date(now + 5 * 3600_000).toISOString().slice(0, 10);
  return Date.parse(`${today}T23:59:59+05:00`);
}

export function getActiveDeal(): DealOfDay | null {
  let deal = getSetting<DealSetting>('deal');
  if (deal?.auto && deal.endsAt <= Date.now()) {
    // Avtomatik (standart) aksiya — har kuni yangilanadi; admin qo'lda qo'ygani esa muddati bilan tugaydi
    deal = { ...deal, endsAt: endOfTashkentDay() };
    setSetting('deal', deal);
  }
  if (!deal || deal.endsAt <= Date.now()) return null;
  return { productId: deal.productId, dealPrice: deal.dealPrice, endsAt: new Date(deal.endsAt).toISOString() };
}

export function isFirstOrder(phone: string | undefined, userId: string | undefined): boolean {
  if (!phone && !userId) return true;
  const row = get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM orders WHERE status != 'cancelled' AND (phone = ? OR (? IS NOT NULL AND user_id = ?))",
    [phone ?? '', userId ?? null, userId ?? null],
  );
  return (row?.n ?? 0) === 0;
}

/**
 * Savat summasini FAQAT ma'lumotlar bazasidagi joriy narxlar asosida hisoblaydi.
 * Brauzerdan faqat mahsulot ID, miqdor va sozlamalar qabul qilinadi.
 */
export function buildQuote(input: QuoteInput, user: UserRecord | null): QuoteResult {
  const ids = new Set<string>();
  for (const item of input.items) {
    if (item.kind === 'product') ids.add(item.refId);
    else COMBOS.find((c) => c.id === item.refId)?.items.forEach((i) => ids.add(i.productId));
  }
  const products = new Map(productRepo.byIds([...ids]).map((p) => [p.id, toProduct(p)]));
  const deal = getActiveDeal();
  const now = Date.now();
  const lines = computeCartLines(input.items, products, deal, now);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);

  let promo: PromoCode | null = null;
  let promoState: Quote['promo'] = null;
  if (input.promoCode) {
    const row = get<PromoRow>('SELECT * FROM promos WHERE code = ?', [input.promoCode]);
    const first = isFirstOrder(user?.phone ?? input.phone, user?.id);
    const res = validatePromo(input.promoCode, row ? [toPromo(row)] : [], { subtotal, now, isFirstOrder: first });
    if (res.ok) {
      promo = res.promo;
      promoState = { code: res.promo.code, ok: true };
    } else {
      promoState = { code: input.promoCode, ok: false, error: res.error, minOrder: res.minOrder };
    }
  }

  const zone = input.deliveryMethod === 'delivery' ? (ZONE_MAP[input.zoneId ?? ''] ?? null) : null;
  const totals = computeTotals({
    subtotal,
    promo,
    useBonus: !!input.useBonus && !!user,
    bonusBalance: user?.bonus ?? 0,
    deliveryMethod: input.deliveryMethod,
    zone,
  });

  return {
    quote: {
      ...totals,
      bonusEarned: user ? totals.bonusEarned : 0,
      lines: lines.map((l) => ({ key: l.item.key, unitPrice: l.unitPrice, lineTotal: l.lineTotal, available: l.available })),
      promo: promoState,
    },
    lines,
    promo,
    promoError: promoState && !promoState.ok ? promoState.error : undefined,
    zone,
    products,
  };
}
