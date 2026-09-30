// Admin paroli uchun Argon2id xesh yaratadi (server/admin.config.ts ga yoziladi).
// Foydalanish:  npm run admin:hash -- "YangiParol123"
// Xesh ochiq repoda turishi xavfsiz — undan parolni tiklab bo'lmaydi. Parolning o'zini hech qayerga yozmang.
import { randomBytes } from 'node:crypto';
import { argon2id } from 'hash-wasm';

const password = process.argv[2];
if (!password || password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
  console.error('Parol kamida 10 belgi, harf va raqamdan iborat bo\'lsin:  npm run admin:hash -- "YangiParol123"');
  process.exit(1);
}
// Parametrlar server/lib/password.ts dagi bilan bir xil
const hash = await argon2id({
  password,
  salt: randomBytes(16),
  parallelism: 1,
  iterations: 2,
  memorySize: 19_456,
  hashLength: 32,
  outputType: 'encoded',
});
console.log(hash);
