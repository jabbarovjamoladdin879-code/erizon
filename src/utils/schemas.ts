import { z } from 'zod';
import { CATEGORY_IDS, MEAT_CUTS, UNITS } from '@/types';

/**
 * localStorage'dan o'qilgan ma'lumotlarni tekshirish uchun Zod sxemalari.
 * Buzilgan yoki qo'lda o'zgartirilgan ma'lumot saytni ishdan chiqarmaydi.
 * (Foydalanuvchi, buyurtma, bonus kabi muhim ma'lumotlar endi faqat serverda saqlanadi.)
 */

const money = z.number().finite().min(0).max(1_000_000_000);
const shortStr = (max: number) => z.string().max(max);

export const productSchema = z.object({
  id: z.string().min(1).max(40),
  name: shortStr(120).min(1),
  categoryId: z.enum(CATEGORY_IDS),
  price: money,
  oldPrice: money.optional(),
  rating: z.number().min(0).max(5),
  reviewsCount: z.number().int().min(0),
  description: shortStr(1000),
  unit: z.enum(UNITS),
  inStock: z.boolean(),
  emoji: shortStr(16),
  hue: z.number().min(0).max(360),
  createdAt: shortStr(40),
  popularity: z.number().min(0),
  // Faqat o'z serverimizdagi rasmlar (tashqi havola kiritib bo'lmaydi)
  images: z.array(z.string().regex(/^\/api\/images\/[a-f0-9]{24}$/)).max(6).optional(),
  expiry: shortStr(60).optional(),
  manufacturer: shortStr(80).optional(),
  halal: z.boolean().optional(),
  gender: z.enum(['men', 'women', 'kids']).optional(),
  sizes: z.array(shortStr(10)).max(12).optional(),
  colors: z.array(z.object({ name: shortStr(30), hex: z.string().regex(/^#[0-9a-fA-F]{6}$/) })).max(12).optional(),
  prepTime: z.number().int().min(1).max(180).optional(),
  cuttable: z.boolean().optional(),
  specs: z.record(shortStr(40), shortStr(120)).optional(),
  relatedIds: z.array(shortStr(40)).max(12).optional(),
});

export const fastFoodOptionsSchema = z.object({
  sauce: shortStr(20),
  extraCheese: z.boolean(),
  spicy: z.boolean(),
  extras: z.array(shortStr(20)).max(10),
});

export const cartItemSchema = z.object({
  key: shortStr(300),
  kind: z.enum(['product', 'combo']),
  refId: shortStr(40),
  qty: z.number().positive().max(99),
  options: z
    .object({
      size: shortStr(10).optional(),
      color: shortStr(30).optional(),
      cut: z.enum(MEAT_CUTS).optional(),
      fastfood: fastFoodOptionsSchema.optional(),
    })
    .optional(),
});

export const dealSchema = z.object({
  productId: shortStr(40),
  dealPrice: money,
  endsAt: shortStr(40),
});

/** Mehmon buyurtmalarini kuzatish uchun: buyurtma ID va maxfiy track token */
export const guestOrderRefSchema = z.object({
  id: z.string().regex(/^EM-[A-Z0-9]{5,12}$/),
  token: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
  createdAt: shortStr(40),
});
