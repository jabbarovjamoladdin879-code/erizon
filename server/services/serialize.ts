import type { Order, Product, PromoCode, PublicUser, Review } from '../../shared/types.js';
import type { OrderRecord, ProductRecord, UserRecord } from '../models.js';

/**
 * Yozuvlarni brauzerga yuboriladigan shaklga o'tkazish ("allowlist" — faqat ruxsat
 * etilgan maydonlar). Parol xeshi, 2FA siri, track token xeshi va h.k. hech qachon chiqmaydi.
 */
export function toPublicUser(u: UserRecord): PublicUser {
  return {
    id: u.id,
    name: u.name,
    phone: u.phone,
    email: u.email,
    role: u.role,
    bonus: u.bonus,
    addresses: u.addresses,
    referralCode: u.referralCode,
    totpEnabled: u.totpEnabled,
    createdAt: new Date(u.createdAt).toISOString(),
  };
}

export function toProduct(p: ProductRecord, includeAdmin = false): Product {
  const out: Product = {
    id: p.id,
    name: p.name,
    categoryId: p.categoryId,
    price: p.price,
    oldPrice: p.oldPrice,
    rating: Math.round(p.rating * 10) / 10,
    reviewsCount: p.reviewsCount,
    description: p.description,
    unit: p.unit,
    inStock: p.inStock,
    icon: p.icon,
    hue: p.hue,
    createdAt: p.createdAt,
    popularity: p.popularity,
    images: p.images,
    expiry: p.expiry,
    manufacturer: p.manufacturer,
    halal: p.halal,
    gender: p.gender,
    sizes: p.sizes,
    colors: p.colors,
    prepTime: p.prepTime,
    cuttable: p.cuttable,
    specs: p.specs,
    relatedIds: p.relatedIds,
  };
  if (includeAdmin) out.views = p.views;
  return out;
}

export function toOrder(o: OrderRecord): Order {
  return {
    id: o.id,
    createdAt: new Date(o.createdAt).toISOString(),
    userId: o.userId,
    customerName: o.customerName,
    phone: o.phone,
    lines: o.lines,
    subtotal: o.subtotal,
    discount: o.discount,
    promoCode: o.promoCode,
    bonusUsed: o.bonusUsed,
    bonusEarned: o.bonusEarned,
    deliveryFee: o.deliveryFee,
    total: o.total,
    deliveryMethod: o.deliveryMethod,
    zoneId: o.zoneId,
    address: o.address,
    deliveryTime: o.deliveryTime,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    comment: o.comment,
    status: o.status,
    statusHistory: o.statusHistory.map((s) => ({ status: s.status, at: new Date(s.at).toISOString() })),
    etaAt: new Date(o.etaAt).toISOString(),
    hasFastFood: o.hasFastFood,
  };
}

export interface PromoRow {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  min_order: number;
  expires_at: number;
  active: number;
  first_order_only: number;
  max_discount: number | null;
  max_uses: number | null;
  used_count: number;
}

export function toPromo(p: PromoRow): PromoCode {
  return {
    code: p.code,
    type: p.type,
    value: p.value,
    minOrder: p.min_order,
    expiresAt: new Date(p.expires_at).toISOString(),
    active: !!p.active,
    firstOrderOnly: !!p.first_order_only,
    maxDiscount: p.max_discount ?? undefined,
    maxUses: p.max_uses ?? undefined,
    usedCount: p.used_count,
  };
}

export interface ReviewRow {
  id: string;
  product_id: string;
  user_id: string | null;
  author: string;
  rating: number;
  text: string;
  helpful: number;
  created_at: number;
}

export function toReview(r: ReviewRow, viewerId?: string, voted?: boolean): Review {
  return {
    id: r.id,
    productId: r.product_id,
    author: r.author,
    rating: r.rating,
    text: r.text,
    createdAt: new Date(r.created_at).toISOString(),
    helpful: r.helpful,
    votedByMe: voted,
    mine: !!viewerId && r.user_id === viewerId,
  };
}
