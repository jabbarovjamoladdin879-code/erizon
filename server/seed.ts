import { SEED_PRODUCTS } from '../shared/products.js';
import { SEED_PROMOS } from '../shared/promos.js';
import { getSeedReviews } from '../shared/reviews.js';
import { flush, get, getSetting, newId, ready, run, setSetting, tx } from './db.js';
import { getEnv } from './env.js';
import { randomCode } from './lib/crypto.js';
import { hashPassword } from './lib/password.js';
import { products, users } from './models.js';
import { loadSecrets } from './secrets.js';
import { endOfTashkentDay, type DealSetting } from './services/checkout.js';

/**
 * Bo'sh bazani boshlang'ich ma'lumotlar bilan to'ldirish (idempotent — qayta ishga
 * tushirilsa mavjud ma'lumotlar o'zgarmaydi).
 */
export function seedCatalog(): string[] {
  const log: string[] = [];
  if (products.count() === 0) {
    tx(() => {
      for (const p of SEED_PRODUCTS) products.save(p);
      let n = 0;
      for (const p of SEED_PRODUCTS) {
        for (const r of getSeedReviews(p.id, p.rating)) {
          run('INSERT INTO reviews (id, product_id, user_id, author, rating, text, helpful, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?, ?)', [
            newId(),
            r.productId,
            r.author,
            r.rating,
            r.text,
            r.helpful,
            Date.parse(r.createdAt),
          ]);
          n += 1;
        }
      }
      log.push(`products: ${SEED_PRODUCTS.length}`, `reviews: ${n}`);
    });
  }
  if ((get<{ n: number }>('SELECT COUNT(*) AS n FROM promos')?.n ?? 0) === 0) {
    tx(() => {
      for (const p of SEED_PROMOS) {
        run(
          'INSERT INTO promos (code, type, value, min_order, expires_at, active, first_order_only, max_discount, max_uses, used_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)',
          [p.code, p.type, p.value, p.minOrder, Date.parse(p.expiresAt), p.active, p.firstOrderOnly, p.maxDiscount ?? null, p.maxUses ?? null, Date.now()],
        );
      }
    });
    log.push(`promos: ${SEED_PROMOS.length}`);
  }
  if (!getSetting<DealSetting>('deal') && !getSetting<boolean>('dealInitialised')) {
    setSetting('deal', { productId: 'ff-03', dealPrice: 38_000, endsAt: endOfTashkentDay(), auto: true } satisfies DealSetting);
    setSetting('dealInitialised', true);
    log.push('deal: ff-03');
  }
  // Migratsiya: Unicode 13+ emojilar (Windows 10'da bo'sh quti) — mavjud bazada ham almashtiriladi.
  // Faqat admin o'zgartirmagan (hali eski emoji turgan) mahsulotlar yangilanadi.
  if (!getSetting<boolean>('emojiFix13')) {
    const legacy = new Set(['🫗', '🫧', '🧋', '🫙', '🫓', '🪥', '🪟', '🫖']);
    tx(() => {
      for (const seed of SEED_PRODUCTS) {
        const cur = products.byId(seed.id);
        if (cur && legacy.has(cur.emoji) && cur.emoji !== seed.emoji) products.save({ ...cur, emoji: seed.emoji });
      }
      setSetting('emojiFix13', true);
    });
  }
  return log;
}

const DEFAULT_ADMIN_PHONE = '+998900000001';
const DEV_ADMIN_PASSWORD = 'Admin12345';

/**
 * Admin akkaunti:
 * - ADMIN_PHONE + ADMIN_PASSWORD berilgan bo'lsa — o'sha (tavsiya etiladi);
 * - lokal ishlab chiqishda — DEV admin (+998900000001 / Admin12345);
 * - production'da env'siz — tasodifiy parol yaratiladi va FAQAT server logiga yoziladi
 *   (Vercel: Project → Logs). Kodda yoki repozitoriyda hech qanday parol yo'q.
 */
export async function ensureAdmin(): Promise<string | null> {
  const env = getEnv();
  const phone = env.ADMIN_PHONE ?? DEFAULT_ADMIN_PHONE;
  const existing = users.byPhone(phone);
  if (existing) {
    if (existing.role !== 'admin') run("UPDATE users SET role = 'admin', updated_at = ? WHERE id = ?", [Date.now(), existing.id]);
    return null;
  }
  if (!env.ADMIN_PASSWORD && get<{ id: string }>("SELECT id FROM users WHERE role = 'admin' LIMIT 1")) return null;

  const password = env.ADMIN_PASSWORD ?? (env.isProd ? `${randomCode(14)}a7` : DEV_ADMIN_PASSWORD);
  const passwordHash = await hashPassword(password);
  const now = Date.now();
  users.insert({
    id: newId(),
    name: 'Administrator',
    phone,
    passwordHash,
    role: 'admin',
    bonus: 0,
    addresses: [],
    referralCode: randomCode(8),
    referralRewarded: false,
    failedLogins: 0,
    totpEnabled: false,
    tokenVersion: 0,
    createdAt: now,
    updatedAt: now,
  });
  if (env.ADMIN_PASSWORD) return `admin: ${phone.slice(0, 6)}*** (env)`;
  // Parol faqat bir marta, faqat server logida ko'rsatiladi
  console.warn(`[setup] Admin yaratildi: ${phone} / ${password} — kirgandan so'ng 2FA ni yoqing.`);
  return `admin: ${phone.slice(0, 6)}***`;
}

const g = globalThis as typeof globalThis & { __erizonBoot?: Promise<void> };

/** Server ishga tushishi: baza → kalitlar → boshlang'ich ma'lumotlar → admin (bir marta) */
export function bootstrap(): Promise<void> {
  g.__erizonBoot ??= (async () => {
    await ready();
    loadSecrets();
    const log = seedCatalog();
    const admin = await ensureAdmin();
    if (admin) log.push(admin);
    flush();
    if (log.length && getEnv().NODE_ENV !== 'test') console.info(`[db] ${getEnv().databasePath}: ${log.join(', ')}`);
  })().catch((err: unknown) => {
    g.__erizonBoot = undefined;
    throw err;
  });
  return g.__erizonBoot;
}

/** Testlar uchun: keyingi bootstrap qaytadan bajarilsin */
export function resetBootstrap(): void {
  g.__erizonBoot = undefined;
}
