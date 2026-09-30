import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import initSqlJs, { type Database } from 'sql.js';
import { getEnv } from './env.js';

/**
 * O'rnatilgan SQLite ma'lumotlar bazasi (sql.js — SQLite'ning WebAssembly versiyasi).
 * - Tashqi server, native modul yoki env kerak emas; Windows, Linux va Vercel'da bir xil ishlaydi.
 * - Baza xotirada ishlaydi va har bir o'zgartiruvchi so'rovdan keyin faylga atomik yoziladi
 *   (vaqtinchalik fayl + rename — yozish paytida uzilish bo'lsa ham fayl buzilmaydi).
 * - JavaScript bir oqimli bo'lgani uchun `tx()` ichidagi sinxron amallar boshqa so'rovlar
 *   bilan aralashmaydi (atomik).
 *
 * DIQQAT (Vercel): serverless funksiyalarda faqat /tmp yoziladi va u vaqtinchalik —
 * funksiya qayta ishga tushganda ma'lumotlar yo'qoladi. Doimiy saqlash uchun diski bor
 * serverda (VPS, Railway, Render) ishga tushiring — README.md ga qarang.
 */

export type Param = string | number | null | Uint8Array | boolean | undefined;
type Row = Record<string, unknown>;

const g = globalThis as typeof globalThis & { __erizonDb?: Promise<Database>; __erizonDbPath?: string };
let dirty = false;
let lastCleanup = 0;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  bonus INTEGER NOT NULL DEFAULT 0 CHECK (bonus >= 0),
  addresses TEXT NOT NULL DEFAULT '[]',
  referral_code TEXT NOT NULL UNIQUE,
  referred_by TEXT,
  referral_rewarded INTEGER NOT NULL DEFAULT 0,
  failed_logins INTEGER NOT NULL DEFAULT 0,
  lock_until INTEGER,
  totp_secret_enc TEXT,
  totp_pending_enc TEXT,
  totp_enabled INTEGER NOT NULL DEFAULT 0,
  totp_last_step INTEGER,
  token_version INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  family TEXT NOT NULL,
  family_created_at INTEGER NOT NULL,
  mfa INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  replaced_by TEXT,
  created_at INTEGER NOT NULL,
  ip_hash TEXT NOT NULL,
  ua TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_family ON sessions(family);

CREATE TABLE IF NOT EXISTS otps (id TEXT PRIMARY KEY, code_hash TEXT NOT NULL, attempts INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS rate_limits (id TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  in_stock INTEGER NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS products_cat ON products(category_id);

CREATE TABLE IF NOT EXISTS promos (
  code TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('percent','fixed')),
  value INTEGER NOT NULL,
  min_order INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  active INTEGER NOT NULL,
  first_order_only INTEGER NOT NULL,
  max_discount INTEGER,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  phone TEXT NOT NULL,
  status TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  total INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id, created_at);
CREATE INDEX IF NOT EXISTS orders_phone ON orders(phone, created_at);
CREATE INDEX IF NOT EXISTS orders_created ON orders(created_at);

CREATE TABLE IF NOT EXISTS idempotency (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, track_token_enc TEXT NOT NULL, payment_url TEXT, expires_at INTEGER NOT NULL);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  user_id TEXT,
  author TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT NOT NULL,
  helpful INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  UNIQUE (product_id, user_id)
);
CREATE INDEX IF NOT EXISTS reviews_product ON reviews(product_id, created_at);

CREATE TABLE IF NOT EXISTS review_votes (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS stock_alerts (id TEXT PRIMARY KEY, product_id TEXT NOT NULL, user_id TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS alerts_product ON stock_alerts(product_id);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL, product_id TEXT, order_id TEXT,
  text TEXT NOT NULL, read INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS notifications_user ON notifications(user_id, created_at);

CREATE TABLE IF NOT EXISTS bonus_ledger (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, delta INTEGER NOT NULL, reason TEXT NOT NULL, order_id TEXT, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS bonus_user ON bonus_ledger(user_id, created_at);

CREATE TABLE IF NOT EXISTS gift_cards (code TEXT PRIMARY KEY, value INTEGER NOT NULL, expires_at INTEGER NOT NULL, used_by TEXT, used_at INTEGER, created_at INTEGER NOT NULL, created_by TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, content_type TEXT NOT NULL, data BLOB NOT NULL, size INTEGER NOT NULL, sha256 TEXT NOT NULL, created_at INTEGER NOT NULL, created_by TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, admin_id TEXT NOT NULL, admin_name TEXT NOT NULL, action TEXT NOT NULL, target TEXT, ip_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS audit_created ON audit(created_at);
CREATE TABLE IF NOT EXISTS promo_uses (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, created_at INTEGER NOT NULL);

CREATE TABLE IF NOT EXISTS payme_tx (
  id TEXT PRIMARY KEY, order_id TEXT NOT NULL, amount INTEGER NOT NULL, state INTEGER NOT NULL, time INTEGER NOT NULL,
  create_time INTEGER NOT NULL, perform_time INTEGER NOT NULL, cancel_time INTEGER NOT NULL, reason INTEGER
);
CREATE INDEX IF NOT EXISTS payme_order ON payme_tx(order_id);
CREATE TABLE IF NOT EXISTS click_tx (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, amount INTEGER NOT NULL, prepare_id INTEGER NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS counters (id TEXT PRIMARY KEY, seq INTEGER NOT NULL);
`;

async function open(path: string): Promise<Database> {
  const require = createRequire(import.meta.url);
  const wasmBinary = readFileSync(require.resolve('sql.js/dist/sql-wasm.wasm'));
  const SQL = await initSqlJs({ wasmBinary });
  let database: Database;
  if (path !== ':memory:' && existsSync(path)) {
    database = new SQL.Database(readFileSync(path));
  } else {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    database = new SQL.Database();
  }
  database.exec('PRAGMA foreign_keys = OFF;');
  database.exec(SCHEMA);
  migrate(database);
  return database;
}

/** Eski bazalarni yangi sxemaga moslash (idempotent) */
function migrate(database: Database): void {
  const userCols = database.exec('PRAGMA table_info(users)')[0]?.values.map((row) => String(row[1])) ?? [];
  if (!userCols.includes('email')) database.exec('ALTER TABLE users ADD COLUMN email TEXT');
  // NULL qiymatlar takrorlanishi mumkin (emailsiz eski hisoblar), to'ldirilganlari — noyob
  database.exec('CREATE UNIQUE INDEX IF NOT EXISTS users_email ON users(email)');
}

/** Bazani ochadi (bir marta; serverless "warm" instansiyalarda qayta ishlatiladi) */
function initDb(): Promise<Database> {
  const path = getEnv().databasePath;
  if (!g.__erizonDb || g.__erizonDbPath !== path) {
    g.__erizonDbPath = path;
    g.__erizonDb = open(path).catch((err: unknown) => {
      g.__erizonDb = undefined;
      throw err;
    });
  }
  return g.__erizonDb;
}

let instance: Database | null = null;
export async function ready(): Promise<void> {
  instance = await initDb();
}

function db(): Database {
  if (!instance) throw new Error('Database not initialised (await ready() first)');
  return instance;
}

function norm(params: Param[]): Array<string | number | null | Uint8Array> {
  return params.map((p) => (p === undefined ? null : typeof p === 'boolean' ? (p ? 1 : 0) : p));
}

/** INSERT/UPDATE/DELETE — o'zgargan qatorlar soni */
export function run(sql: string, params: Param[] = []): number {
  const d = db();
  d.run(sql, norm(params));
  const changes = d.getRowsModified();
  if (changes > 0) dirty = true;
  return changes;
}

export function all<T = Row>(sql: string, params: Param[] = []): T[] {
  const stmt = db().prepare(sql);
  try {
    stmt.bind(norm(params));
    const rows: T[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as T);
    return rows;
  } finally {
    stmt.free();
  }
}

export function get<T = Row>(sql: string, params: Param[] = []): T | undefined {
  return all<T>(`${sql}`, params)[0];
}

let txDepth = 0;

/**
 * Bir nechta amalni bitta tranzaksiyada (xato bo'lsa hammasi bekor qilinadi).
 * Ichma-ich chaqirilsa — tashqi tranzaksiyaning bir qismi bo'ladi.
 * `fn` sinxron bo'lishi SHART (await yo'q) — shunda boshqa so'rovlar aralasha olmaydi.
 */
export function tx<T>(fn: () => T): T {
  if (txDepth > 0) return fn();
  const d = db();
  d.exec('BEGIN IMMEDIATE');
  txDepth += 1;
  try {
    const result = fn();
    d.exec('COMMIT');
    dirty = true;
    return result;
  } catch (err) {
    d.exec('ROLLBACK');
    throw err;
  } finally {
    txDepth -= 1;
  }
}

export function isUniqueError(err: unknown): boolean {
  return err instanceof Error && /UNIQUE constraint failed/i.test(err.message);
}

/** O'zgarishlarni diskka atomik yozish */
export function flush(): void {
  const path = g.__erizonDbPath;
  if (!dirty || !instance || !path || path === ':memory:') return;
  const data = instance.export();
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, data);
  renameSync(tmp, path);
  dirty = false;
}

/** Muddati o'tgan yozuvlarni tozalash (daqiqasiga ko'pi bilan bir marta) */
export function cleanupExpired(now = Date.now()): void {
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  run('DELETE FROM rate_limits WHERE expires_at <= ?', [now]);
  run('DELETE FROM otps WHERE expires_at <= ?', [now]);
  run('DELETE FROM idempotency WHERE expires_at <= ?', [now]);
  run('DELETE FROM sessions WHERE expires_at <= ?', [now]);
  run('DELETE FROM notifications WHERE created_at <= ?', [now - 90 * 86_400_000]);
  run('DELETE FROM audit WHERE created_at <= ?', [now - 365 * 86_400_000]);
}

export function getSetting<T>(key: string): T | undefined {
  const row = get<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? (JSON.parse(row.value) as T) : undefined;
}

export function setSetting(key: string, value: unknown): void {
  run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, JSON.stringify(value)]);
}

export function deleteSetting(key: string): void {
  run('DELETE FROM settings WHERE key = ?', [key]);
}

/** 24 belgili hex ID (URL validatsiyasi uchun barqaror format) */
export { newId } from './lib/ids.js';

/** Testlar va dev server to'xtaganda */
export function closeDb(): void {
  flush();
  instance?.close();
  instance = null;
  g.__erizonDb = undefined;
  g.__erizonDbPath = undefined;
}
