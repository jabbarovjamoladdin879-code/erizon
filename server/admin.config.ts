/**
 * Yagona admin akkaunti — hamma joyda (lokal, Vercel) bir xil raqam va parol, env shart emas.
 *
 * Repoda parolning o'zi EMAS, faqat Argon2id xeshi turadi: undan parolni tiklab bo'lmaydi,
 * shuning uchun ochiq repoda saqlash xavfsiz.
 *
 * Parolni almashtirish:  npm run admin:hash -- "YangiParol123"  → chiqqan xeshni pastga qo'ying,
 * commit + push. Server keyingi ishga tushishda yangi parolni avtomatik qo'llaydi.
 *
 * Env orqali ham berish mumkin (ustun turadi): ADMIN_PHONE, ADMIN_PASSWORD.
 * Eslatma: PASSWORD_PEPPER berilsa, bu xesh ishlamaydi — u holda ADMIN_PASSWORD env'ini ham bering.
 */
export const ADMIN_PHONE = '+998900000001';

export const ADMIN_PASSWORD_HASH = '$argon2id$v=19$m=19456,t=2,p=1$YjZNfJ7jliMvOoaO4KC+Yg$8TIvuZ1uDJ7BOuc/A5qHNtmtFnWHyV8OGq9ML+2jZHU';
