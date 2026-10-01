# Erizon Mall — onlayn do'kon (frontend + backend)

Beruniy shahridagi **Erizon Mall** savdo markazi uchun internet-magazin.

| Qism | Texnologiyalar |
| --- | --- |
| Frontend | Vite 8 · React 18 · TypeScript (strict) · Tailwind · React Router 7 · Zustand · Framer Motion · React Hook Form + Zod · DOMPurify · PWA |
| Backend | Hono · **o'rnatilgan SQLite** (sql.js / WebAssembly) · Zod · Argon2id · JWT (jose) · TOTP 2FA |
| Testlar | Vitest (38 ta integratsion test, jumladan doimiy saqlash va env'siz ishlash) |

**Hech qanday tashqi ma'lumotlar bazasi, server yoki `.env` talab qilinmaydi.** Baza — bitta fayl (`data/erizon.sqlite`), birinchi ishga tushishda avtomatik yaratiladi va to'ldiriladi. Maxfiy kalitlar ham avtomatik yaratilib, bazada saqlanadi.

---

## 1. Lokal ishga tushirish

Talab: **Node.js 24.x** (Vercel ham shu versiyada ishlaydi).

```bash
npm install
npm run dev
```

- Sayt: http://localhost:5173 · API: http://127.0.0.1:3001/api/health
- Baza: `data/erizon.sqlite` (127 mahsulot, sharhlar, promokodlar bilan). Ma'lumotlar server qayta ishga tushganda **saqlanadi**. Tozalash uchun `data/` papkasini o'chiring.
- Admin: `server/admin.config.ts` dagi raqam va parol — lokal va Vercel'da bir xil. Repoda faqat parolning Argon2id xeshi turadi. Parolni almashtirish: `npm run admin:hash -- "YangiParol123"` → chiqqan xeshni shu faylga qo'ying.
- Gmail ulanmagan bo'lsa, tasdiqlash kodi sahifada "Namoyish rejimi: kod …" ko'rinishida chiqadi va maydonga avtomatik qo'yiladi.

| Buyruq | Vazifasi |
| --- | --- |
| `npm run dev` | Vite + API birga |
| `npm run build` | TypeScript tekshiruvi (frontend, backend, testlar) + production build |
| `npm run preview` | Production build + API lokal |
| `npm test` | Backend integratsion testlari (Vitest) |
| `npm run e2e` | Brauzer testlari (Playwright): ro'yxatdan o'tish, buyurtma, admin, mobil 390px. Toza xotiradagi baza bilan o'zi ishga tushadi |
| `npm run lint` | ESLint |
| `npm run secrets` | Ixtiyoriy: doimiy JWT_SECRET / DATA_SECRET / PASSWORD_PEPPER yaratish |

Zaxira nusxa: `data/erizon.sqlite` faylini nusxalash kifoya (server to'xtatilgan holatda).

**CI:** GitHub Actions (`.github/workflows/ci.yml`) har push va PR'da typecheck, lint, testlar, build va Playwright brauzer testlarini ishga tushiradi. Natija: GitHub → **Actions** bo'limi.

---

## 2. Joylash (deploy)

### 2.1. Tavsiya: diski bor server — ma'lumotlar doimiy saqlanadi
VPS, Railway, Render, Fly.io va h.k.:

```bash
npm ci
npm run build
NODE_ENV=production npx tsx server/dev.ts   # API: 3001-port, baza: data/erizon.sqlite
```

`dist/` papkasini istalgan statik server (nginx) orqali bering va `/api`, `/sitemap.xml`, `/robots.txt` ni 3001-portga proxy qiling. Birinchi ishga tushishda admin paroli **server logiga** yoziladi (yoki `ADMIN_PHONE` / `ADMIN_PASSWORD` bering).

### 2.2. Vercel — env'siz ishlaydi, LEKIN ma'lumotlar vaqtinchalik
1. Loyihani GitHub'ga yuklang → https://vercel.com/new → repozitoriyani tanlang. `vercel.json` hammasini sozlaydi. **Environment Variables kiritish shart emas.**
2. Deploy. Tekshirish: `https://<sayt>/api/health` → `{"ok":true,"db":"sqlite","products":127,"persistent":false}`.
3. Admin: `server/admin.config.ts` dagi raqam va parol — Vercel'ning har bir nusxasida bir xil (env shart emas).

> **Diqqat — Vercel cheklovi:** serverless funksiyalarda faqat `/tmp` papkasiga yozish mumkin va u vaqtinchalik. Funksiya bir necha daqiqa ishlatilmasa yoki yangi nusxa ishga tushsa — **yangi foydalanuvchilar, buyurtmalar, bonuslar o'chadi** (katalog har safar qayta to'ldiriladi), parallel nusxalar esa bir-birining ma'lumotini ko'rmaydi. Shuning uchun Vercel — **namoyish** uchun; haqiqiy do'kon uchun 2.1-bo'limdagi usulni ishlating.
>
> Doimiy saqlash uchun bir necha env berish foydali: `JWT_SECRET`, `DATA_SECRET` (sessiyalar nusxalar orasida ishlashi uchun).

**Email kod (Gmail):** ro'yxatdan o'tish, email kod bilan kirish va parolni tiklash kodlari Gmail orqali yuboriladi. Ulash (5 daqiqa):
1. Gmail hisobida **2 bosqichli tekshiruvni** yoqing: https://myaccount.google.com/security
2. **App password** yarating: https://myaccount.google.com/apppasswords (nomi, masalan, "Erizon") → 16 belgili parol chiqadi.
3. Vercel → Project → Settings → **Environment Variables**: `GMAIL_USER` = Gmail manzilingiz, `GMAIL_APP_PASSWORD` = o'sha 16 belgi → **Redeploy**.

Ulanmaguncha kod sahifada ko'rsatiladi (namoyish rejimi) — bu emailni haqiqatan tasdiqlamaydi. Oddiy Gmail paroli ishlamaydi, faqat App password. Gmail kuniga ~500 ta xat yuborishga ruxsat beradi.

---

## 3. Imkoniyatlar

**Xaridor:** katalog (filtr: kategoriya, bo'lim, brend, narx, chegirma, halol), imlo xatolariga chidamli qidiruv, stories, kun aksiyasi, kombo-to'plamlar, fast-food sozlash, go'sht kesimi/og'irligi, sharhlar (faqat ro'yxatdan o'tganlar), "kelganda xabar berish", solishtirish, sevimlilar, 1 klikda xarid, promokod, bonus/keshbek, sovg'a sertifikati, do'stni taklif qilish (10 000 + 10 000 bonus), buyurtma kuzatuvi (real holat + ETA taymer), qayta buyurtma, bildirishnomalar, email kod bilan kirish, parolni email orqali tiklash, 3 til, qorong'i rejim, PWA.

**Admin:** statistika (tushum, 7 kun, ko'p sotilgan/ko'rilgan), mahsulotlar CRUD + **rasm yuklash**, buyurtma holatlari (yetkazilganda keshbek, bekor qilinganda bonus qaytishi, mijozga bildirishnoma), promokodlar (limit, "faqat 1-xarid"), kun aksiyasi, sovg'a sertifikatlari, audit jurnali, 2FA.

**Integratsiyalar (kalitlar berilganda ishlaydi):** Telegram (yangi buyurtma xabari), Gmail (tasdiqlash kodlari), Payme Merchant API, Click SHOP API.

### Promokodlar (seed)
`ERIZON10` (10%), `BERUNIY20` (20 000, ≥150 000), `YANGI15` (15%, faqat 1-xarid), `FASTFOOD5`; test uchun: `YOZ2025` (muddati o'tgan), `TEST50` (faol emas).

---

## 4. Xavfsizlik

| Tahdid | Himoya |
| --- | --- |
| Parol o'g'irlanishi | Argon2id (m=19 MiB, t=2) + ixtiyoriy pepper; parol hech qayerda ochiq saqlanmaydi |
| Brute-force | IP va raqam bo'yicha rate limit (SQLite'da saqlanadi — server qayta ishga tushsa ham amal qiladi); 5 xatodan so'ng 15 daqiqa blok |
| Sessiya o'g'irlanishi (XSS) | Tokenlar `HttpOnly; Secure; SameSite=Strict` cookie'da (`__Host-` prefiks); access 15 daq; refresh rotatsiyasi + **qayta ishlatilsa butun sessiya oilasi bekor** |
| CSRF | Origin = saytning o'z domeni (env'siz ham) + double-submit token + SameSite=Strict + faqat `application/json` |
| SQL injection / mass assignment | Barcha so'rovlar parametrlangan (`?`), Zod `.strict()` sxemalari, `$`/`.` kalitlar rad etiladi |
| Maxfiy kalitlar | Kodda yo'q: env'dan yoki birinchi ishga tushishda kriptografik tasodifiy yaratilib bazada saqlanadi |
| Ma'lumotlar yaxlitligi | Buyurtma (narx → bonus → promokod → saqlash) bitta SQLite tranzaksiyasida; faylga yozish atomik (vaqtinchalik fayl + rename) |
| XSS | React escape, `dangerouslySetInnerHTML` yo'q, DOMPurify + serverda HTML tozalash, qat'iy CSP (`script-src 'self'`) |
| Narx/bonus soxtalashtirish | Summa, chegirma, bonus, yetkazish **faqat serverda** bazadagi narxlardan hisoblanadi; bonus atomik (parallel so'rovda ikki marta sarflanmaydi) |
| Takroriy buyurtma | `Idempotency-Key` |
| Admin | Rol serverda tekshiriladi, **TOTP 2FA** (sir AES-256-GCM bilan shifrlangan, replay himoyasi), audit jurnali |
| Email kod | 6 xona, HMAC xesh, 10 daq, 5 urinish, qayta so'rash 60 s; admin'ga kod berilmaydi (faqat parol) |
| Buyurtma kuzatuvi | Egasi yoki maxfiy track-token; aks holda "topilmadi" |
| Fayl yuklash | Faqat PNG/JPEG/WEBP (mazmunidan aniqlanadi), 1.5 MB, `CSP: sandbox`, `nosniff` |
| To'lovlar | Payme Basic-auth, Click MD5 imzo, summa tekshiruvi, idempotent tranzaksiyalar; holat faqat webhook orqali |
| Sarlavhalar | HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP/CORP |
| Maxfiy ma'lumotlar | Faqat env'da, ishga tushishda Zod bilan tekshiriladi; loglarda telefon maskalanadi |

Testlar bularni tekshiradi: `npm test` (Origin/CSRF, injection, bloklash, refresh token o'g'irligi, 2FA replay, bonus poygasi, promokod, Payme/Click imzolari va h.k.).

**Eslatma:** Payme va Click integratsiyasi ularning hujjatlari asosida yozilgan — jonli ishga tushirishdan oldin **sandbox**'da to'liq sinab ko'ring. Qoraqalpoqcha tarjimani ona tilida so'zlashuvchi tekshirib chiqsin.

---

## 5. Papka tuzilmasi

```
api/index.ts        Vercel funksiyasi (Hono)
server/             backend: db.ts (SQLite sxema), models.ts, routes/, middleware/, services/, lib/ (xavfsizlik), seed, dev server
data/               SQLite baza fayli (avtomatik yaratiladi, git'ga tushmaydi)
shared/             umumiy kod: tiplar, narx hisobi, Zod sxemalar, mock ma'lumotlar
src/                frontend: pages/, components/, store/, services/ (API mijoz), i18n/
tests/              backend integratsion testlari
vercel.json         build, rewrite va xavfsizlik sarlavhalari
```
