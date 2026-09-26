import type {
  AppNotification,
  AuditEntry,
  BonusEntry,
  CartItem,
  DealOfDay,
  GiftCard,
  Order,
  OrderStatus,
  Product,
  PromoCode,
  PublicUser,
  Quote,
  Review,
} from '@/types';
import { http } from './http';

/**
 * Backend endpoint'lari (server/routes/*). Komponentlar faqat shu funksiyalar
 * orqali server bilan ishlaydi.
 */

export interface CatalogResponse {
  products: Product[];
  deal: DealOfDay | null;
  serverTime: string;
}

export interface AppConfig {
  payments: { cash: boolean; click: boolean; payme: boolean };
  demoOtp: boolean;
}

export interface QuoteParams {
  items: CartItem[];
  promoCode?: string;
  useBonus?: boolean;
  deliveryMethod: 'delivery' | 'pickup' | 'quick';
  zoneId?: string;
  phone?: string;
}

export interface PlaceOrderParams extends Omit<QuoteParams, 'phone'> {
  customerName: string;
  phone: string;
  address?: string;
  deliveryTime: string;
  paymentMethod: 'cash' | 'click' | 'payme';
  comment?: string;
}

export interface PlaceOrderResult {
  order: Order;
  trackToken: string;
  paymentUrl?: string;
}

export type LoginResult = { user: PublicUser } | { mfaRequired: true; mfaToken: string };

export interface AdminStats {
  todayCount: number;
  todayRevenue: number;
  avgCheck: number;
  totalOrders: number;
  users: number;
  outOfStock: number;
  last7: Array<{ day: string; sum: number }>;
  topProducts: Array<{ name: string; value: number }>;
  topViewed: Array<{ name: string; value: number }>;
  byStatus: Partial<Record<OrderStatus, number>>;
}

export interface AdminProductInput {
  name: string;
  categoryId: Product['categoryId'];
  price: number;
  oldPrice?: number | null;
  unit: Product['unit'];
  inStock: boolean;
  description: string;
  emoji: string;
  manufacturer?: string;
  expiry?: string;
  halal?: boolean;
  prepTime?: number | null;
  images?: string[];
}

const enc = encodeURIComponent;

export const api = {
  catalog: () => http.get<CatalogResponse>('/api/catalog'),
  config: () => http.get<AppConfig>('/api/config'),
  quote: (p: QuoteParams) => http.post<{ quote: Quote }>('/api/cart/quote', p),
  trackView: (productId: string) => http.post<{ ok: true }>('/api/events', { type: 'view', productId }),

  reviews: (productId: string, sort: 'new' | 'helpful') => http.get<{ reviews: Review[] }>(`/api/products/${enc(productId)}/reviews?sort=${sort}`),
  addReview: (productId: string, rating: number, text: string) => http.post<{ review: Review }>(`/api/products/${enc(productId)}/reviews`, { rating, text }),
  voteReview: (reviewId: string) => http.post<{ helpful: number; voted: boolean }>(`/api/reviews/${enc(reviewId)}/helpful`),

  placeOrder: (p: PlaceOrderParams, idempotencyKey: string) => http.post<PlaceOrderResult>('/api/orders', p, { 'Idempotency-Key': idempotencyKey }),
  myOrders: () => http.get<{ orders: Order[] }>('/api/orders/mine'),
  trackOrder: (id: string, token?: string) => http.get<{ order: Order | null }>(`/api/orders/${enc(id)}${token ? `?t=${enc(token)}` : ''}`),

  auth: {
    me: () => http.get<{ user: PublicUser | null; mfa: boolean }>('/api/auth/me'),
    requestOtp: (phone: string, purpose: 'register' | 'login' | 'reset') => http.post<{ ok: true; devCode?: string }>('/api/auth/otp', { phone, purpose }),
    register: (p: { name: string; phone: string; password: string; otp: string; referralCode?: string }) => http.post<{ user: PublicUser }>('/api/auth/register', p),
    login: (phone: string, password: string) => http.post<LoginResult>('/api/auth/login', { phone, password }),
    loginOtp: (phone: string, otp: string) => http.post<LoginResult>('/api/auth/login/otp', { phone, otp }),
    loginTotp: (mfaToken: string, code: string) => http.post<{ user: PublicUser }>('/api/auth/login/totp', { mfaToken, code }),
    reset: (phone: string, otp: string, password: string) => http.post<{ ok: true }>('/api/auth/reset', { phone, otp, password }),
    logout: () => http.post<{ ok: true }>('/api/auth/logout'),
    logoutAll: () => http.post<{ ok: true }>('/api/auth/logout-all'),
  },

  me: {
    update: (name: string) => http.patch<{ user: PublicUser }>('/api/me', { name }),
    addAddress: (a: { label: string; zoneId: string; address: string }) => http.post<{ user: PublicUser }>('/api/me/addresses', a),
    removeAddress: (id: string) => http.del<{ user: PublicUser }>(`/api/me/addresses/${enc(id)}`),
    bonus: () => http.get<{ balance: number; entries: BonusEntry[] }>('/api/me/bonus'),
    redeemGift: (code: string) => http.post<{ added: number; balance: number }>('/api/me/gift', { code }),
    notifications: () => http.get<{ unread: number; notifications: AppNotification[] }>('/api/me/notifications'),
    readNotifications: () => http.post<{ ok: true }>('/api/me/notifications/read'),
    alerts: () => http.get<{ productIds: string[] }>('/api/me/alerts'),
    addAlert: (productId: string) => http.post<{ ok: true }>(`/api/me/alerts/${enc(productId)}`),
    removeAlert: (productId: string) => http.del<{ ok: true }>(`/api/me/alerts/${enc(productId)}`),
  },

  admin: {
    stats: () => http.get<AdminStats>('/api/admin/stats'),
    products: () => http.get<{ products: Product[] }>('/api/admin/products'),
    createProduct: (p: AdminProductInput) => http.post<{ product: Product }>('/api/admin/products', p),
    updateProduct: (id: string, p: AdminProductInput) => http.patch<{ product: Product }>(`/api/admin/products/${enc(id)}`, p),
    toggleStock: (id: string) => http.post<{ product: Product }>(`/api/admin/products/${enc(id)}/toggle-stock`),
    deleteProduct: (id: string) => http.del<{ ok: true }>(`/api/admin/products/${enc(id)}`),
    uploadImage: (file: File) => http.upload<{ url: string }>('/api/admin/images', file),
    orders: (status?: string) => http.get<{ orders: Order[] }>(`/api/admin/orders${status ? `?status=${enc(status)}` : ''}`),
    setStatus: (id: string, status: OrderStatus) => http.patch<{ order: Order }>(`/api/admin/orders/${enc(id)}/status`, { status }),
    promos: () => http.get<{ promos: PromoCode[] }>('/api/admin/promos'),
    savePromo: (p: Omit<PromoCode, 'usedCount'>) => http.put<{ ok: true }>('/api/admin/promos', p),
    togglePromo: (code: string) => http.post<{ ok: true }>(`/api/admin/promos/${enc(code)}/toggle`),
    deletePromo: (code: string) => http.del<{ ok: true }>(`/api/admin/promos/${enc(code)}`),
    setDeal: (productId: string, dealPrice: number, hours: number) => http.put<{ ok: true }>('/api/admin/deal', { productId, dealPrice, hours }),
    endDeal: () => http.del<{ ok: true }>('/api/admin/deal'),
    gifts: () => http.get<{ gifts: GiftCard[] }>('/api/admin/gifts'),
    createGifts: (value: number, count: number, days: number) => http.post<{ codes: string[] }>('/api/admin/gifts', { value, count, days }),
    deleteGift: (code: string) => http.del<{ ok: true }>(`/api/admin/gifts/${enc(code)}`),
    audit: () => http.get<{ entries: AuditEntry[] }>('/api/admin/audit'),
    totpSetup: () => http.post<{ secret: string; otpauthUrl: string; qrDataUrl: string }>('/api/admin/2fa/setup'),
    totpEnable: (code: string) => http.post<{ user: PublicUser }>('/api/admin/2fa/enable', { code }),
    totpDisable: (code: string) => http.post<{ user: PublicUser }>('/api/admin/2fa/disable', { code }),
  },
};
