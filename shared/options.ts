import type { MeatCut } from './types.js';

/** Fast-food sozlamalari va ularning qo'shimcha narxlari (so'm) */
export const SAUCES = [
  { id: 'ketchup', price: 0 },
  { id: 'garlic', price: 2_000 },
  { id: 'cheese', price: 3_000 },
  { id: 'bbq', price: 3_000 },
] as const;
export type SauceId = (typeof SAUCES)[number]['id'];

export const EXTRA_CHEESE_PRICE = 5_000;

export const EXTRAS = [
  { id: 'jalapeno', price: 3_000 },
  { id: 'egg', price: 3_000 },
  { id: 'mushroom', price: 4_000 },
  { id: 'patty', price: 12_000 },
] as const;
export type ExtraId = (typeof EXTRAS)[number]['id'];

/** Go'sht kesim turlari: 1 kg uchun qo'shimcha narx */
export const CUT_SURCHARGE: Record<MeatCut, number> = {
  mince: 0,
  pieces: 0,
  whole: 0,
  boneless: 10_000,
};

export const WEIGHT_STEP = 0.5;
export const WEIGHT_MIN = 0.5;
export const WEIGHT_MAX = 20;
export const QTY_MAX = 99;

export const SIZE_CHART_ADULT = [
  { size: 'S', chest: '88–92', waist: '74–78', height: '164–170' },
  { size: 'M', chest: '96–100', waist: '82–86', height: '170–176' },
  { size: 'L', chest: '104–108', waist: '90–94', height: '176–182' },
  { size: 'XL', chest: '112–116', waist: '98–102', height: '182–188' },
  { size: 'XXL', chest: '120–124', waist: '106–110', height: '188–194' },
];

export const SIZE_CHART_KIDS = [
  { size: '3-4', chest: '54–56', waist: '51–53', height: '98–104' },
  { size: '5-6', chest: '58–60', waist: '54–56', height: '110–116' },
  { size: '7-8', chest: '62–64', waist: '57–59', height: '122–128' },
  { size: '9-10', chest: '66–70', waist: '60–62', height: '134–140' },
  { size: '11-12', chest: '72–76', waist: '63–66', height: '146–152' },
];

export const CASHBACK_PERCENT = 3;
/** Buyurtma summasining maksimal necha foizini bonus bilan to'lash mumkin */
export const BONUS_MAX_SHARE = 0.3;
export const REVIEW_MAX_LENGTH = 500;
export const COMPARE_MAX = 4;
export const RECENT_MAX = 10;
