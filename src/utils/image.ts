/**
 * Tashqi rasm havolalari o'rniga lokal SVG placeholder (data URI) yaratadi.
 * Shu tufayli rasmlar hech qachon "buzilib" qolmaydi va CSP bilan mos.
 */
const cache = new Map<string, string>();

export function productImage(emoji: string, hue: number, variant = 0): string {
  const key = `${emoji}|${hue}|${variant}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const h1 = ((hue % 360) + 360) % 360;
  const h2 = (h1 + 35 + variant * 20) % 360;
  const cx = [300, 90, 320][variant % 3];
  const cy = [80, 320, 330][variant % 3];
  const rotate = [0, -10, 12][variant % 3];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h1},85%,93%)"/><stop offset="1" stop-color="hsl(${h2},80%,82%)"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/><circle cx="${cx}" cy="${cy}" r="120" fill="hsl(${h2},90%,97%)" opacity="0.55"/><circle cx="${400 - cx}" cy="${400 - cy}" r="70" fill="hsl(${h1},70%,70%)" opacity="0.25"/><text x="200" y="215" font-size="170" text-anchor="middle" dominant-baseline="middle" transform="rotate(${rotate} 200 200)">${emoji}</text></svg>`;
  const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  cache.set(key, uri);
  return uri;
}
