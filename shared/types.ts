/**
 * Frontend va backend uchun umumiy tiplar.
 * DIQQAT: shared/ ichidagi importlar `.js` kengaytmasi bilan yoziladi (Node ESM / Vercel talabi).
 */

export const CATEGORY_IDS = [
  'clothing',
  'grocery',
  'drinks',
  'meat',
  'fastfood',
  'dairy',
  'produce',
  'sweets',
  'chemicals',
  'cosmetics',
  'kids',
  'home',
] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export const UNITS = ['pcs', 'kg', 'l', 'pack', 'box', 'set'] as const;
export type Unit = (typeof UNITS)[number];

export const MEAT_CUTS = ['mince', 'pieces', 'whole', 'boneless'] as const;
export type MeatCut = (typeof MEAT_CUTS)[number];

export const GENDERS = ['men', 'women', 'kids'] as const;
export type Gender = (typeof GENDERS)[number];

export interface ProductColor {
  name: string;
  hex: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: CategoryId;
  price: number;
  oldPrice?: number;
  rating: number;
  reviewsCount: number;
  description: string;
  unit: Unit;
  inStock: boolean;
  /** Rasm bo'lmasa ishlatiladigan emoji (lokal SVG placeholder yaratiladi) */
  emoji: string;
  /** Gradient rang tusi (0–360) */
  hue: number;
  createdAt: string;
  popularity: number;
  /** Admin yuklagan rasmlar: /api/images/<id> */
  images?: string[];
  expiry?: string;
  manufacturer?: string;
  halal?: boolean;
  gender?: Gender;
  sizes?: string[];
  colors?: ProductColor[];
  /** Fast-food: tayyorlanish vaqti (daqiqa) */
  prepTime?: number;
  /** Go'sht: kesim turini tanlash mumkinmi */
  cuttable?: boolean;
  specs?: Record<string, string>;
  /** "Bu bilan birga olishadi" uchun qo'lda berilgan bog'liq mahsulotlar */
  relatedIds?: string[];
  /** Faqat admin uchun: ko'rishlar soni */
  views?: number;
}

export interface Category {
  id: CategoryId;
  emoji: string;
  hue: number;
}

export interface ComboItem {
  productId: string;
  qty: number;
}

export interface Combo {
  id: string;
  nameKey: 'combo.plov' | 'combo.family' | 'combo.breakfast' | 'combo.clean';
  items: ComboItem[];
  price: number;
  emoji: string;
  hue: number;
}

export interface FastFoodOptions {
  sauce: string;
  extraCheese: boolean;
  spicy: boolean;
  extras: string[];
}

export interface CartItemOptions {
  size?: string;
  color?: string;
  cut?: MeatCut;
  fastfood?: FastFoodOptions;
}

export interface CartItem {
  key: string;
  kind: 'product' | 'combo';
  refId: string;
  /** Dona soni yoki og'irlik (kg) */
  qty: number;
  options?: CartItemOptions;
}

export type PromoType = 'percent' | 'fixed';

export interface PromoCode {
  code: string;
  type: PromoType;
  value: number;
  minOrder: number;
  expiresAt: string;
  active: boolean;
  firstOrderOnly: boolean;
  maxDiscount?: number;
  /** Umumiy foydalanish chegarasi (ixtiyoriy) */
  maxUses?: number;
  usedCount?: number;
}

export interface DealOfDay {
  productId: string;
  dealPrice: number;
  endsAt: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  minutes: number;
  /** SVG xarita uchun ko'pburchak nuqtalari */
  points: string;
  labelX: number;
  labelY: number;
}

export const ORDER_STATUSES = ['accepted', 'preparing', 'on_the_way', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ['cash', 'click', 'payme'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['cash', 'pending', 'paid', 'cancelled'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const DELIVERY_METHODS = ['delivery', 'pickup', 'quick'] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export interface OrderLine {
  kind: 'product' | 'combo';
  refId: string;
  name: string;
  qty: number;
  unit: Unit;
  unitPrice: number;
  lineTotal: number;
  optionsLabel: string;
  /** "Qayta buyurtma berish" uchun asl sozlamalar */
  options?: CartItemOptions;
}

export interface StatusEvent {
  status: OrderStatus;
  at: string;
}

export interface Order {
  id: string;
  createdAt: string;
  userId?: string;
  customerName: string;
  phone: string;
  lines: OrderLine[];
  subtotal: number;
  discount: number;
  promoCode?: string;
  bonusUsed: number;
  bonusEarned: number;
  deliveryFee: number;
  total: number;
  deliveryMethod: DeliveryMethod;
  zoneId?: string;
  address?: string;
  deliveryTime: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  comment?: string;
  status: OrderStatus;
  statusHistory: StatusEvent[];
  /** Taxminiy yetkazib berish / tayyor bo'lish vaqti */
  etaAt: string;
  hasFastFood: boolean;
}

export interface SavedAddress {
  id: string;
  label: string;
  zoneId: string;
  address: string;
}

export type Role = 'customer' | 'admin';

/** Brauzerga yuboriladigan foydalanuvchi ma'lumotlari (parol xeshi, 2FA siri va h.k. YO'Q) */
export interface PublicUser {
  id: string;
  name: string;
  phone: string;
  role: Role;
  bonus: number;
  addresses: SavedAddress[];
  referralCode: string;
  totpEnabled: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  author: string;
  rating: number;
  text: string;
  createdAt: string;
  helpful: number;
  /** Joriy foydalanuvchi "Foydali" deb belgilaganmi */
  votedByMe?: boolean;
  mine?: boolean;
}

export interface AppNotification {
  id: string;
  type: 'back_in_stock' | 'order_status' | 'bonus';
  productId?: string;
  orderId?: string;
  text: string;
  read: boolean;
  createdAt: string;
}

export interface BonusEntry {
  id: string;
  delta: number;
  reason: 'order_spent' | 'order_earned' | 'order_refund' | 'welcome' | 'referral' | 'gift' | 'admin';
  orderId?: string;
  createdAt: string;
}

export interface GiftCard {
  code: string;
  value: number;
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  adminName: string;
  action: string;
  target?: string;
  createdAt: string;
}

export interface QuoteLine {
  key: string;
  unitPrice: number;
  lineTotal: number;
  available: boolean;
}

export interface Quote {
  lines: QuoteLine[];
  subtotal: number;
  discount: number;
  bonusUsed: number;
  maxBonus: number;
  deliveryFee: number;
  freeDelivery: boolean;
  total: number;
  bonusEarned: number;
  promo: { code: string; ok: boolean; error?: string; minOrder?: number } | null;
}

export type Theme = 'light' | 'dark';
export type Lang = 'uz' | 'ru' | 'kaa';
