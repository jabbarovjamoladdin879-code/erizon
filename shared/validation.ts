import { z } from 'zod';
import { DELIVERY_SLOTS, ZONE_MAP } from './zones.js';
import { REVIEW_MAX_LENGTH } from './options.js';
import { PAYMENT_METHODS } from './types.js';
import { isValidPhone } from './phone.js';

/**
 * Formalar uchun qat'iy Zod sxemalari. Xato xabarlari — i18n kalitlari
 * (UI ularni joriy tilga tarjima qiladi).
 */

const NAME_RE = /^[\p{L}\s'ʻʼ‘’`.-]+$/u;
const ADDRESS_RE = /^[\p{L}\p{N}\s.,'ʻʼ‘’`\-/№#()]+$/u;
const LABEL_RE = /^[\p{L}\p{N}\s'ʻʼ‘’`-]+$/u;
const TEXT_RE = /^[^<>{}]*$/;

const nameSchema = z
  .string()
  .trim()
  .min(2, 'v.nameMin')
  .max(50, 'v.nameMax')
  .regex(NAME_RE, 'v.nameChars');

const phoneSchema = z.string().trim().max(20, 'v.phone').refine(isValidPhone, 'v.phone');

const addressSchema = z
  .string()
  .trim()
  .min(5, 'v.addressMin')
  .max(200, 'v.addressMax')
  .regex(ADDRESS_RE, 'v.addressChars');

const passwordSchema = z
  .string()
  .min(8, 'v.passMin')
  .max(64, 'v.passMax')
  .regex(/[A-Za-z]/, 'v.passLetter')
  .regex(/\d/, 'v.passDigit');

export const checkoutSchema = z
  .object({
    name: nameSchema,
    phone: phoneSchema,
    deliveryMethod: z.enum(['delivery', 'pickup']),
    zoneId: z.string().max(40),
    address: z.string().max(200, 'v.addressMax'),
    deliveryTime: z.enum(DELIVERY_SLOTS),
    paymentMethod: z.enum(PAYMENT_METHODS),
    comment: z.string().trim().max(300, 'v.commentMax').regex(TEXT_RE, 'v.textChars'),
  })
  .superRefine((v, ctx) => {
    if (v.deliveryMethod !== 'delivery') return;
    if (!ZONE_MAP[v.zoneId]) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['zoneId'], message: 'v.zone' });
    const addr = addressSchema.safeParse(v.address);
    if (!addr.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['address'], message: addr.error.issues[0]?.message ?? 'v.addressMin' });
    }
  });
export type CheckoutForm = z.infer<typeof checkoutSchema>;

export const quickBuySchema = z.object({ name: nameSchema, phone: phoneSchema });
export type QuickBuyForm = z.infer<typeof quickBuySchema>;

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, 'v.required').max(64, 'v.passMax'),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const addressFormSchema = z.object({
  label: z.string().trim().min(2, 'v.labelMin').max(30, 'v.labelMax').regex(LABEL_RE, 'v.labelChars'),
  zoneId: z.string().refine((id) => !!ZONE_MAP[id], 'v.zone'),
  address: addressSchema,
});
export type AddressForm = z.infer<typeof addressFormSchema>;

export const trackSchema = z.object({
  orderId: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^EM-[A-Z0-9]{5,12}$/, 'v.orderId'),
});
export type TrackForm = z.infer<typeof trackSchema>;

export const otpCodeSchema = z.string().trim().regex(/^\d{6}$/, 'otp.format');

export const otpLoginFormSchema = z.object({ phone: phoneSchema, otp: otpCodeSchema });
export type OtpLoginForm = z.infer<typeof otpLoginFormSchema>;

export const registerStepSchema = z
  .object({
    name: nameSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirm: z.string().max(64),
    otp: otpCodeSchema,
    referralCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^([A-Z0-9]{6,10})?$/, 'v.referral'),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'v.passMatch' });
export type RegisterStepForm = z.infer<typeof registerStepSchema>;

export const resetFormSchema = z
  .object({ phone: phoneSchema, otp: otpCodeSchema, password: passwordSchema, confirm: z.string().max(64) })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'v.passMatch' });
export type ResetForm = z.infer<typeof resetFormSchema>;

export const giftFormSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{8,24}$/, 'gift.format'),
});
export type GiftForm = z.infer<typeof giftFormSchema>;

/* ------------------------------------------------------------------
 * API so'rovlari uchun sxemalar (server tomonda qat'iy tekshiriladi).
 * `.strict()` — noma'lum maydonlar rad etiladi (mass-assignment himoyasi).
 * ------------------------------------------------------------------ */

/** Normallashtirilgan telefon: +998XXXXXXXXX */
const apiPhoneSchema = z.string().regex(/^\+998\d{9}$/, 'v.phone');
const idSchema = z.string().regex(/^[a-z0-9-]{2,40}$/, 'err.validation');
const plainText = (max: number) => z.string().trim().max(max).regex(TEXT_RE, 'v.textChars');

const fastFoodOptionsInput = z
  .object({
    sauce: z.string().regex(/^[a-z]{2,20}$/),
    extraCheese: z.boolean(),
    spicy: z.boolean(),
    extras: z.array(z.string().regex(/^[a-z]{2,20}$/)).max(10),
  })
  .strict();

const cartItemOptionsInput = z
  .object({
    size: z.string().max(10).regex(/^[A-Za-z0-9-]*$/).optional(),
    color: z.string().max(30).regex(/^[\p{L} '-]*$/u).optional(),
    cut: z.enum(['mince', 'pieces', 'whole', 'boneless']).optional(),
    fastfood: fastFoodOptionsInput.optional(),
  })
  .strict();

const cartItemInput = z
  .object({
    key: z.string().max(300),
    kind: z.enum(['product', 'combo']),
    refId: idSchema,
    qty: z.number().positive().max(99),
    options: cartItemOptionsInput.optional(),
  })
  .strict();

export const quoteRequestSchema = z
  .object({
    items: z.array(cartItemInput).min(1).max(60),
    promoCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{0,20}$/).optional(),
    useBonus: z.boolean().optional(),
    deliveryMethod: z.enum(['delivery', 'pickup', 'quick']).default('pickup'),
    zoneId: z.string().max(40).optional(),
    phone: apiPhoneSchema.optional(),
  })
  .strict();
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

export const orderRequestSchema = z
  .object({
    items: z.array(cartItemInput).min(1).max(60),
    customerName: nameSchema,
    phone: apiPhoneSchema,
    deliveryMethod: z.enum(['delivery', 'pickup', 'quick']),
    zoneId: z.string().max(40).optional(),
    address: addressSchema.optional(),
    deliveryTime: z.enum(DELIVERY_SLOTS),
    paymentMethod: z.enum(PAYMENT_METHODS),
    comment: plainText(300).optional(),
    promoCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{0,20}$/).optional(),
    useBonus: z.boolean().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.deliveryMethod === 'delivery') {
      if (!v.zoneId || !ZONE_MAP[v.zoneId]) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['zoneId'], message: 'v.zone' });
      if (!v.address) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['address'], message: 'v.addressMin' });
    }
  });
export type OrderRequest = z.infer<typeof orderRequestSchema>;

export const otpRequestSchema = z
  .object({ phone: apiPhoneSchema, purpose: z.enum(['register', 'login', 'reset']) })
  .strict();

export const registerRequestSchema = z
  .object({
    name: nameSchema,
    phone: apiPhoneSchema,
    password: passwordSchema,
    otp: otpCodeSchema,
    referralCode: z.string().trim().toUpperCase().regex(/^([A-Z0-9]{6,10})?$/).optional(),
  })
  .strict();

export const loginRequestSchema = z
  .object({ phone: apiPhoneSchema, password: z.string().min(1).max(64) })
  .strict();

export const otpLoginRequestSchema = z.object({ phone: apiPhoneSchema, otp: otpCodeSchema }).strict();

export const totpLoginRequestSchema = z
  .object({ mfaToken: z.string().min(20).max(2000), code: otpCodeSchema })
  .strict();

export const resetRequestSchema = z
  .object({ phone: apiPhoneSchema, otp: otpCodeSchema, password: passwordSchema })
  .strict();

export const profileUpdateSchema = z.object({ name: nameSchema }).strict();

export const addressRequestSchema = z
  .object({
    label: z.string().trim().min(2, 'v.labelMin').max(30, 'v.labelMax').regex(LABEL_RE, 'v.labelChars'),
    zoneId: z.string().refine((id) => !!ZONE_MAP[id], 'v.zone'),
    address: addressSchema,
  })
  .strict();

export const reviewRequestSchema = z
  .object({
    rating: z.number().int().min(1, 'v.rating').max(5, 'v.rating'),
    text: z.string().trim().min(10, 'v.reviewMin').max(REVIEW_MAX_LENGTH, 'v.reviewMax'),
  })
  .strict();

export const giftRedeemSchema = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{8,24}$/, 'gift.format') }).strict();

export const eventSchema = z.object({ type: z.literal('view'), productId: idSchema }).strict();

/* ----------------------------- Admin ----------------------------- */

const SAFE_TEXT = /^[^<>{}$]*$/;
const imageUrl = z.string().regex(/^\/api\/images\/[a-f0-9]{24}$/);

export const adminProductSchema = z
  .object({
    name: z.string().trim().min(3).max(80).regex(SAFE_TEXT),
    categoryId: z.enum([
      'clothing', 'grocery', 'drinks', 'meat', 'fastfood', 'dairy',
      'produce', 'sweets', 'chemicals', 'cosmetics', 'kids', 'home',
    ]),
    price: z.number().int().min(100).max(999_999_999),
    oldPrice: z.number().int().min(100).max(999_999_999).nullable().optional(),
    unit: z.enum(['pcs', 'kg', 'l', 'pack', 'box', 'set']),
    inStock: z.boolean(),
    description: z.string().trim().min(10).max(600).regex(SAFE_TEXT),
    emoji: z.string().trim().min(1).max(8),
    manufacturer: z.string().trim().max(80).regex(SAFE_TEXT).optional(),
    expiry: z.string().trim().max(60).regex(SAFE_TEXT).optional(),
    halal: z.boolean().optional(),
    prepTime: z.number().int().min(1).max(180).nullable().optional(),
    images: z.array(imageUrl).max(6).optional(),
  })
  .strict()
  .refine((v) => !v.oldPrice || v.oldPrice > v.price, { path: ['oldPrice'], message: 'admin.oldPrice' });
export type AdminProductInput = z.infer<typeof adminProductSchema>;

export const adminPromoSchema = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,20}$/),
    type: z.enum(['percent', 'fixed']),
    value: z.number().int().positive().max(10_000_000),
    minOrder: z.number().int().min(0).max(999_999_999),
    maxDiscount: z.number().int().positive().max(999_999_999).optional(),
    maxUses: z.number().int().positive().max(1_000_000).optional(),
    expiresAt: z.string().datetime(),
    active: z.boolean(),
    firstOrderOnly: z.boolean(),
  })
  .strict()
  .refine((v) => v.type !== 'percent' || v.value <= 90, { path: ['value'], message: 'admin.percent' });

export const adminDealSchema = z
  .object({ productId: idSchema, dealPrice: z.number().int().min(100), hours: z.number().int().min(1).max(72) })
  .strict();

export const adminStatusSchema = z
  .object({ status: z.enum(['accepted', 'preparing', 'on_the_way', 'delivered', 'cancelled']) })
  .strict();

export const adminGiftSchema = z
  .object({ value: z.number().int().min(1000).max(5_000_000), count: z.number().int().min(1).max(50), days: z.number().int().min(1).max(365) })
  .strict();

export const totpCodeRequestSchema = z.object({ code: otpCodeSchema }).strict();
