import DOMPurify from 'dompurify';

/* eslint-disable no-control-regex */
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
/* eslint-enable no-control-regex */

/**
 * Foydalanuvchi kiritgan matnni tozalaydi:
 * 1) DOMPurify orqali barcha HTML teg va atributlarni olib tashlaydi;
 * 2) boshqaruv belgilarini o'chiradi, bo'sh joylarni qisqartiradi;
 * 3) uzunlikni cheklaydi.
 * Natija har doim oddiy matn — React uni avtomatik escape qiladi,
 * `dangerouslySetInnerHTML` loyihada ishlatilmaydi.
 */
export function sanitizeText(input: string, maxLength = 500, { multiline = false } = {}): string {
  if (typeof input !== 'string' || input.length === 0) return '';
  const limited = input.slice(0, maxLength * 2);
  const fragment = DOMPurify.sanitize(limited, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    RETURN_DOM_FRAGMENT: true,
  });
  let text = (fragment.textContent ?? '').replace(CONTROL_CHARS, '');
  text = multiline
    ? text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n')
    : text.replace(/\s+/g, ' ');
  return text.trim().slice(0, maxLength);
}

/** Qidiruv so'rovi uchun qisqa tozalash */
export function sanitizeQuery(input: string): string {
  return sanitizeText(input, 80);
}
