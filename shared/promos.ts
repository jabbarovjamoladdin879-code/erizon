import type { DealOfDay, PromoCode } from './types.js';

/**
 * Mock promokodlar. MUHIM: haqiqiy loyihada promokodlar ro'yxati brauzerga
 * yuborilmasligi va faqat serverda tekshirilishi kerak.
 */
export const SEED_PROMOS: PromoCode[] = [
  { code: 'ERIZON10', type: 'percent', value: 10, minOrder: 0, expiresAt: '2027-12-31T23:59:59.000Z', active: true, firstOrderOnly: false, maxDiscount: 100_000 },
  { code: 'BERUNIY20', type: 'fixed', value: 20_000, minOrder: 150_000, expiresAt: '2027-12-31T23:59:59.000Z', active: true, firstOrderOnly: false },
  { code: 'YANGI15', type: 'percent', value: 15, minOrder: 50_000, expiresAt: '2027-12-31T23:59:59.000Z', active: true, firstOrderOnly: true, maxDiscount: 75_000 },
  { code: 'FASTFOOD5', type: 'fixed', value: 5_000, minOrder: 40_000, expiresAt: '2027-06-30T23:59:59.000Z', active: true, firstOrderOnly: false },
  { code: 'YOZ2025', type: 'percent', value: 25, minOrder: 0, expiresAt: '2025-08-31T23:59:59.000Z', active: true, firstOrderOnly: false },
  { code: 'TEST50', type: 'percent', value: 50, minOrder: 0, expiresAt: '2027-12-31T23:59:59.000Z', active: false, firstOrderOnly: false },
];

/** Kun aksiyasi — bugun kun oxirigacha amal qiladi */
export function createDefaultDeal(now = new Date()): DealOfDay {
  const end = new Date(now);
  end.setHours(23, 59, 59, 0);
  return { productId: 'ff-03', dealPrice: 38_000, endsAt: end.toISOString() };
}
