/** Faqat ichki yo'llarga qaytishga ruxsat beriladi (open redirect'dan himoya) */
export function safeRedirect(value: string | null, fallback = '/profile'): string {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value.slice(0, 200);
}
