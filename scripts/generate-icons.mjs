// PWA ikonkalarini (PNG) tashqi paketlarsiz yaratuvchi skript.
// Ishga tushirish: npm run icons
// Natija: public/icons/icon-192.png, icon-512.png, maskable-512.png, apple-touch-icon.png
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function encodePng(size, pixel) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const FROM = [124, 58, 237]; // brand-600
const TO = [249, 115, 22]; // accent-500

function mix(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

/** "E" harfi — normallashtirilgan koordinatalarda (0..1) */
function isGlyph(u, v) {
  const left = 0.3;
  const right = 0.72;
  const top = 0.24;
  const bottom = 0.76;
  const stroke = 0.1;
  if (u < left || u > right || v < top || v > bottom) return false;
  if (u < left + stroke) return true;
  if (v < top + stroke) return true;
  if (v > bottom - stroke) return true;
  if (Math.abs(v - 0.5) < stroke / 2 && u < right - 0.06) return true;
  return false;
}

function makeIcon(size, { radius, glyphScale }) {
  const r = radius * size;
  return encodePng(size, (x, y) => {
    // Yumaloq burchaklar
    const cx = Math.min(Math.max(x, r), size - 1 - r);
    const cy = Math.min(Math.max(y, r), size - 1 - r);
    const dist = Math.hypot(x - cx, y - cy);
    if (r > 0 && dist > r) return [0, 0, 0, 0];
    const t = (x + y) / (2 * size);
    const [cr, cg, cb] = mix(FROM, TO, t * 0.85);
    const u = (x / size - 0.5) / glyphScale + 0.5;
    const v = (y / size - 0.5) / glyphScale + 0.5;
    if (isGlyph(u, v)) return [255, 255, 255, 255];
    return [cr, cg, cb, 255];
  });
}

writeFileSync(join(outDir, 'icon-192.png'), makeIcon(192, { radius: 0.22, glyphScale: 1 }));
writeFileSync(join(outDir, 'icon-512.png'), makeIcon(512, { radius: 0.22, glyphScale: 1 }));
writeFileSync(join(outDir, 'maskable-512.png'), makeIcon(512, { radius: 0, glyphScale: 0.75 }));
writeFileSync(join(outDir, 'apple-touch-icon.png'), makeIcon(180, { radius: 0, glyphScale: 0.9 }));
console.log('Ikonkalar yaratildi:', outDir);
