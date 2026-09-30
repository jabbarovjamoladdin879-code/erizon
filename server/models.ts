import type {
  CartItemOptions,
  DeliveryMethod,
  OrderLine,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Product,
  Role,
  SavedAddress,
} from '../shared/types.js';
import { all, get, run } from './db.js';

/* ============================== Foydalanuvchilar ============================== */

export interface UserRecord {
  id: string;
  name: string;
  phone: string;
  /** Tasdiqlangan email (kichik harflarda); eski hisoblarda bo'lmasligi mumkin */
  email?: string;
  passwordHash: string;
  role: Role;
  bonus: number;
  addresses: SavedAddress[];
  referralCode: string;
  referredBy?: string;
  referralRewarded: boolean;
  failedLogins: number;
  lockUntil?: number;
  /** AES-GCM bilan shifrlangan TOTP siri */
  totpSecretEnc?: string;
  totpPendingEnc?: string;
  totpEnabled: boolean;
  totpLastStep?: number;
  /** Oshirilganda barcha access tokenlar bekor bo'ladi */
  tokenVersion: number;
  createdAt: number;
  updatedAt: number;
}

interface UserRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  password_hash: string;
  role: string;
  bonus: number;
  addresses: string;
  referral_code: string;
  referred_by: string | null;
  referral_rewarded: number;
  failed_logins: number;
  lock_until: number | null;
  totp_secret_enc: string | null;
  totp_pending_enc: string | null;
  totp_enabled: number;
  totp_last_step: number | null;
  token_version: number;
  created_at: number;
  updated_at: number;
}

function safeJson<T>(text: string | null | undefined, fallback: T): T {
  try {
    return text ? (JSON.parse(text) as T) : fallback;
  } catch {
    return fallback;
  }
}

function toUser(r: UserRow): UserRecord {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email ?? undefined,
    passwordHash: r.password_hash,
    role: r.role === 'admin' ? 'admin' : 'customer',
    bonus: r.bonus,
    addresses: safeJson<SavedAddress[]>(r.addresses, []),
    referralCode: r.referral_code,
    referredBy: r.referred_by ?? undefined,
    referralRewarded: !!r.referral_rewarded,
    failedLogins: r.failed_logins,
    lockUntil: r.lock_until ?? undefined,
    totpSecretEnc: r.totp_secret_enc ?? undefined,
    totpPendingEnc: r.totp_pending_enc ?? undefined,
    totpEnabled: !!r.totp_enabled,
    totpLastStep: r.totp_last_step ?? undefined,
    tokenVersion: r.token_version,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const users = {
  byId(id: string): UserRecord | undefined {
    const r = get<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
    return r && toUser(r);
  },
  byPhone(phone: string): UserRecord | undefined {
    const r = get<UserRow>('SELECT * FROM users WHERE phone = ?', [phone]);
    return r && toUser(r);
  },
  byEmail(email: string): UserRecord | undefined {
    const r = get<UserRow>('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    return r && toUser(r);
  },
  byReferral(code: string): UserRecord | undefined {
    const r = get<UserRow>('SELECT * FROM users WHERE referral_code = ?', [code]);
    return r && toUser(r);
  },
  insert(u: UserRecord): void {
    run(
      `INSERT INTO users (id, name, phone, email, password_hash, role, bonus, addresses, referral_code, referred_by, referral_rewarded,
        failed_logins, totp_enabled, token_version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)`,
      [u.id, u.name, u.phone, u.email?.toLowerCase() ?? null, u.passwordHash, u.role, u.bonus, JSON.stringify(u.addresses), u.referralCode, u.referredBy ?? null, u.referralRewarded, u.createdAt, u.updatedAt],
    );
  },
  count(): number {
    return get<{ n: number }>('SELECT COUNT(*) AS n FROM users')?.n ?? 0;
  },
};

/* ================================= Mahsulotlar ================================ */

interface ProductRow {
  id: string;
  category_id: string;
  in_stock: number;
  views: number;
  created_at: number;
  updated_at: number;
  data: string;
}

export interface ProductRecord extends Product {
  views: number;
  updatedAt: number;
}

function toProductRecord(r: ProductRow): ProductRecord {
  const data = safeJson<Omit<Product, 'id' | 'inStock' | 'createdAt'>>(r.data, {} as Omit<Product, 'id' | 'inStock' | 'createdAt'>);
  return {
    ...data,
    id: r.id,
    categoryId: data.categoryId,
    inStock: !!r.in_stock,
    createdAt: new Date(r.created_at).toISOString(),
    views: r.views,
    updatedAt: r.updated_at,
  };
}

export const products = {
  all(): ProductRecord[] {
    return all<ProductRow>('SELECT * FROM products ORDER BY created_at DESC').map(toProductRecord);
  },
  byIds(ids: string[]): ProductRecord[] {
    if (!ids.length) return [];
    const unique = [...new Set(ids)].slice(0, 500);
    return all<ProductRow>(`SELECT * FROM products WHERE id IN (${unique.map(() => '?').join(',')})`, unique).map(toProductRecord);
  },
  byId(id: string): ProductRecord | undefined {
    const r = get<ProductRow>('SELECT * FROM products WHERE id = ?', [id]);
    return r && toProductRecord(r);
  },
  /** Mahsulotni to'liq saqlash (INSERT yoki UPDATE) */
  save(p: Product & { views?: number; updatedAt?: number }): void {
    const { id, inStock, createdAt, views: _views, updatedAt: _updated, ...data } = p as ProductRecord;
    const now = Date.now();
    run(
      `INSERT INTO products (id, category_id, in_stock, views, created_at, updated_at, data) VALUES (?, ?, ?, 0, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET category_id = excluded.category_id, in_stock = excluded.in_stock,
         updated_at = excluded.updated_at, data = excluded.data`,
      [id, p.categoryId, inStock, Date.parse(createdAt) || now, now, JSON.stringify(data)],
    );
  },
  count(): number {
    return get<{ n: number }>('SELECT COUNT(*) AS n FROM products')?.n ?? 0;
  },
};

/* ================================ Buyurtmalar ================================= */

export interface OrderRecord {
  id: string;
  createdAt: number;
  userId?: string;
  customerName: string;
  phone: string;
  lines: Array<OrderLine & { options?: CartItemOptions }>;
  subtotal: number;
  discount: number;
  promoCode?: string;
  bonusUsed: number;
  bonusEarned: number;
  bonusCredited: boolean;
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
  statusHistory: Array<{ status: OrderStatus; at: number }>;
  etaAt: number;
  hasFastFood: boolean;
  trackTokenHash: string;
  paidAt?: number;
}

interface OrderRow {
  id: string;
  status: string;
  payment_status: string;
  data: string;
}

function toOrderRecord(r: OrderRow): OrderRecord {
  const o = JSON.parse(r.data) as OrderRecord;
  // Holat ustunlari — yagona haqiqat manbai
  o.status = r.status as OrderStatus;
  o.paymentStatus = r.payment_status as PaymentStatus;
  return o;
}

export const orders = {
  byId(id: string): OrderRecord | undefined {
    const r = get<OrderRow>('SELECT id, status, payment_status, data FROM orders WHERE id = ?', [id]);
    return r && toOrderRecord(r);
  },
  insert(o: OrderRecord): void {
    run(
      'INSERT INTO orders (id, user_id, phone, status, payment_method, payment_status, total, created_at, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [o.id, o.userId ?? null, o.phone, o.status, o.paymentMethod, o.paymentStatus, o.total, o.createdAt, JSON.stringify(o)],
    );
  },
  update(o: OrderRecord): void {
    run('UPDATE orders SET status = ?, payment_status = ?, data = ? WHERE id = ?', [o.status, o.paymentStatus, JSON.stringify(o), o.id]);
  },
  list(where: string, params: Array<string | number>, limit: number): OrderRecord[] {
    return all<OrderRow>(`SELECT id, status, payment_status, data FROM orders ${where} ORDER BY created_at DESC LIMIT ${Math.min(500, limit)}`, params).map(
      toOrderRecord,
    );
  },
  /** To'lov holatini atomik o'zgartirish (faqat kutilgan holatdan) */
  setPaymentStatus(id: string, from: PaymentStatus, to: PaymentStatus): boolean {
    const o = orders.byId(id);
    if (!o || o.paymentStatus !== from) return false;
    o.paymentStatus = to;
    if (to === 'paid') o.paidAt = Date.now();
    orders.update(o);
    return true;
  },
};
