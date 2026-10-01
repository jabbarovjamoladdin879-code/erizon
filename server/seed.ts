import { DEFAULT_ICON, isIconName } from '../shared/icons.js';
import { SEED_PRODUCTS } from '../shared/products.js';
import { SEED_PROMOS } from '../shared/promos.js';
import { getSeedReviews } from '../shared/reviews.js';
import { all, flush, get, getSetting, newId, ready, run, setSetting, tx } from './db.js';
import { getEnv } from './env.js';
import { ADMIN_PASSWORD_HASH, ADMIN_PHONE } from './admin.config.js';
import { hmac, randomCode, sha256 } from './lib/crypto.js';
import { hashPassword } from './lib/password.js';
import { products, users } from './models.js';
import { loadSecrets } from './secrets.js';
import { endOfTashkentDay, type DealSetting } from './services/checkout.js';

/**
 * Bo'sh bazani boshlang'ich ma'lumotlar bilan to'ldirish (idempotent — qayta ishga
 * tushirilsa mavjud ma'lumotlar o'zgarmaydi).
 */
function seedCatalog(): string[] {
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
  // Migratsiya: emoji o'rniga ikonka (lucide nomi). Eski yozuvlarda "emoji" maydoni bor, "icon" yo'q —
  // seed'dagi mahsulot ikonkasi (yoki standart ikonka) qo'yiladi, eski maydon olib tashlanadi.
  if (!getSetting<boolean>('iconMigration1')) {
    const seedIcons = new Map(SEED_PRODUCTS.map((p) => [p.id, p.icon]));
    tx(() => {
      for (const cur of all<{ id: string }>('SELECT id FROM products')) {
        const p = products.byId(cur.id);
        if (!p || isIconName(p.icon)) continue;
        const { emoji: _legacy, ...rest } = p as typeof p & { emoji?: string };
        products.save({ ...rest, icon: seedIcons.get(p.id) ?? DEFAULT_ICON });
      }
      setSetting('iconMigration1', true);
    });
  }
  return log;
}

/**
 * Yagona admin akkaunti (server/admin.config.ts):
 * - parol manbai: ADMIN_PASSWORD env (bo'lsa) → aks holda repodagi Argon2id xesh;
 * - manba o'zgarsa (parol almashtirilsa) — mavjud admin paroli yangilanadi, eski sessiyalar bekor bo'ladi;
 * - hamma joyda (lokal, Vercel'ning har bir nusxasi) bir xil raqam va parol.
 */
async function ensureAdmin(): Promise<string | null> {
  const env = getEnv();
  const phone = env.ADMIN_PHONE ?? ADMIN_PHONE;
  // Manba belgisi: parolning o'zi saqlanmaydi, faqat uning xeshi (o'zgarishni aniqlash uchun)
  const source = env.ADMIN_PASSWORD ? `env:${hmac(env.ADMIN_PASSWORD, 'admin-password-source')}` : `config:${sha256(ADMIN_PASSWORD_HASH)}`;
  const makeHash = async (): Promise<string> => (env.ADMIN_PASSWORD ? hashPassword(env.ADMIN_PASSWORD) : ADMIN_PASSWORD_HASH);

  const existing = users.byPhone(phone);
  if (existing) {
    if (existing.role !== 'admin') run("UPDATE users SET role = 'admin', updated_at = ? WHERE id = ?", [Date.now(), existing.id]);
    if (getSetting<string>('adminPasswordSource') !== source) {
      const hash = await makeHash();
      run('UPDATE users SET password_hash = ?, failed_logins = 0, lock_until = NULL, token_version = token_version + 1, updated_at = ? WHERE id = ?', [hash, Date.now(), existing.id]);
      setSetting('adminPasswordSource', source);
      return `admin: ${phone.slice(0, 6)}*** (parol yangilandi)`;
    }
    return null;
  }
  const hash = await makeHash();
  const now = Date.now();
  users.insert({
    id: newId(),
    name: 'Administrator',
    phone,
    passwordHash: hash,
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
  setSetting('adminPasswordSource', source);
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
