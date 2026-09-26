/* eslint-disable no-control-regex */
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;
/* eslint-enable no-control-regex */

/**
 * Server tomonidagi matn tozalash: HTML teglari, boshqaruv va yo'nalish (bidi) belgilari
 * olib tashlanadi, uzunlik cheklanadi. Ma'lumotlar bazasida faqat oddiy matn saqlanadi;
 * frontend esa uni React orqali (avtomatik escape bilan) ko'rsatadi.
 */
export function cleanText(input: string, max: number, multiline = false): string {
  let s = input.normalize('NFC').replace(CONTROL, '');
  s = s.replace(/<[^>]*>/g, '').replace(/[<>]/g, '');
  s = multiline ? s.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n') : s.replace(/\s+/g, ' ');
  return s.trim().slice(0, max);
}
