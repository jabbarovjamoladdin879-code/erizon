/** Faqat ichki yo'llarga qaytishga ruxsat beriladi (open redirect'dan himoya) */
export function safeRedirect(value: string | null, fallback = '/profile'): string {
  if (!value || value.length > 200) return fallback;
  // "//evil.com", "/\evil.com", "/\t/evil.com" kabi brauzer tashqi manzil deb tushunadigan
  // shakllar: backslash yoki boshqaruv belgisi yo'lning istalgan joyida bo'lsa — rad etiladi
  // eslint-disable-next-line no-control-regex
  if (!value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}
