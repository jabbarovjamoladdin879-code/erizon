import type { DeliveryZone } from './types.js';

/** Ushbu summadan yuqori buyurtmalarga yetkazib berish bepul */
export const FREE_DELIVERY_THRESHOLD = 300_000;

/** Erizon Mall joylashuvi (SVG xaritadagi koordinata) */
export const MALL_POINT = { x: 200, y: 150 };

export const STORE_INFO = {
  address: "Beruniy shahri, Al-Beruniy ko'chasi, 1-uy (Erizon Mall)",
  phone: '+998 61 000 00 00',
  phoneHref: 'tel:+998610000000',
  email: 'info@erizonmall.uz',
  hours: '09:00 – 22:00',
  telegram: 'https://t.me/',
  instagram: 'https://instagram.com/',
};

/**
 * Beruniy tumani yetkazib berish hududlari (mock).
 * Koordinatalar sodda SVG xarita uchun (viewBox 0 0 400 300).
 */
export const DELIVERY_ZONES: DeliveryZone[] = [
  { id: 'markaz', name: 'Beruniy markazi', fee: 8_000, minutes: 25, points: '150,110 250,110 260,190 140,190', labelX: 200, labelY: 172 },
  { id: 'dostlik', name: "Do'stlik MFY", fee: 12_000, minutes: 35, points: '20,20 150,20 150,110 20,120', labelX: 85, labelY: 68 },
  { id: 'navbahor', name: 'Navbahor MFY', fee: 10_000, minutes: 30, points: '150,20 260,20 250,110 150,110', labelX: 202, labelY: 65 },
  { id: 'aburayhon', name: 'Abu Rayhon MFY', fee: 12_000, minutes: 35, points: '260,20 380,20 380,110 250,110', labelX: 318, labelY: 65 },
  { id: 'guliston', name: 'Guliston MFY', fee: 10_000, minutes: 30, points: '20,120 150,110 140,190 20,200', labelX: 82, labelY: 155 },
  { id: 'vokzal', name: "Vokzal atrofi", fee: 12_000, minutes: 35, points: '250,110 380,110 380,200 260,190', labelX: 318, labelY: 152 },
  { id: 'boston', name: "Bo'ston qishlog'i", fee: 18_000, minutes: 50, points: '20,200 140,190 150,280 20,280', labelX: 82, labelY: 238 },
  { id: 'janubiy', name: 'Janubiy massiv', fee: 15_000, minutes: 40, points: '140,190 260,190 250,280 150,280', labelX: 200, labelY: 236 },
  { id: 'tozabogyop', name: "Tozabog'yop", fee: 20_000, minutes: 60, points: '260,190 380,200 380,280 250,280', labelX: 318, labelY: 240 },
];

export const ZONE_MAP: Record<string, DeliveryZone> = Object.fromEntries(DELIVERY_ZONES.map((z) => [z.id, z]));

export const DELIVERY_SLOTS = ['asap', '10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00', '18:00-20:00', '20:00-22:00'] as const;
