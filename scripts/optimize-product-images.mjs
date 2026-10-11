// public/products/*.jpg rasmlarini veb uchun siqadi: eng uzun tomoni 640px, progressiv JPEG (mozjpeg).
// Yangi rasm qo'shilgandan keyin ishga tushiring:  npm run images:optimize
// Allaqachon kichik (≤640px va ≤70 KB) rasmlar qayta siqilmaydi — sifat yo'qolmasligi uchun.
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const DIR = 'public/products';
const MAX_SIDE = 640;
const SKIP_BELOW = 70 * 1024;

let before = 0;
let after = 0;
let changed = 0;
for (const file of (await readdir(DIR)).filter((f) => f.endsWith('.jpg')).sort()) {
  const path = join(DIR, file);
  const size = (await stat(path)).size;
  before += size;
  const input = await readFile(path);
  const meta = await sharp(input).metadata();
  if (size <= SKIP_BELOW && Math.max(meta.width ?? 0, meta.height ?? 0) <= MAX_SIDE) {
    after += size;
    continue;
  }
  const output = await sharp(input)
    .rotate() // EXIF yo'nalishini qo'llash
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 78, progressive: true, mozjpeg: true })
    .toBuffer();
  if (output.length < size) {
    await writeFile(path, output);
    after += output.length;
    changed += 1;
  } else {
    after += size;
  }
}
const mb = (n) => (n / 1048576).toFixed(1);
console.log(`${changed} ta rasm siqildi: ${mb(before)} MB -> ${mb(after)} MB`);
