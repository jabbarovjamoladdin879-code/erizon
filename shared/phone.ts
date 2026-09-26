/** O'zbekiston mobil va shahar operator kodlari */
const OPERATOR_CODES = ['20', '33', '50', '55', '61', '62', '71', '77', '87', '88', '90', '91', '93', '94', '95', '97', '98', '99'];

export const PHONE_MASK_REGEX = /^\+998 \(\d{2}\) \d{3}-\d{2}-\d{2}$/;

/** Kiritilgan matndan faqat 9 ta mahalliy raqamni ajratadi */
function localDigits(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('998')) digits = digits.slice(3);
  return digits.slice(0, 9);
}

/** "+998 (90) 123-45-67" ko'rinishidagi niqob */
export function formatPhoneMask(input: string): string {
  const d = localDigits(input);
  let out = '+998';
  // Ajratuvchi belgilar faqat keyingi raqam kiritilganda qo'shiladi — o'chirish (Backspace) bemalol ishlaydi
  if (d.length > 0) out += ` (${d.slice(0, 2)}`;
  if (d.length > 2) out += `) ${d.slice(2, 5)}`;
  if (d.length > 5) out += `-${d.slice(5, 7)}`;
  if (d.length > 7) out += `-${d.slice(7, 9)}`;
  return out;
}

export function isValidPhone(masked: string): boolean {
  if (!PHONE_MASK_REGEX.test(masked)) return false;
  return OPERATOR_CODES.includes(localDigits(masked).slice(0, 2));
}

/** Saqlash uchun: "+998901234567" */
export function normalizePhone(masked: string): string {
  return `+998${localDigits(masked)}`;
}

/** "+998901234567" -> "+998 (90) 123-45-67" */
export function displayPhone(normalized: string): string {
  return formatPhoneMask(normalized);
}
