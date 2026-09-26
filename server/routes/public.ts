import { Hono, type Context } from 'hono';
import { all, get } from '../db.js';
import { getEnv } from '../env.js';
import { notFound } from '../lib/errors.js';
import { param, RE } from '../lib/http.js';
import { ownOrigin } from '../middleware/security.js';
import type { AppEnv } from '../types.js';

/** Yuklangan rasmlar, sitemap.xml va robots.txt */
export const publicRoutes = new Hono<AppEnv>();

publicRoutes.get('/api/images/:id', (c) => {
  const id = param(c, 'id', RE.objectId);
  const img = get<{ content_type: string; data: Uint8Array }>('SELECT content_type, data FROM images WHERE id = ?', [id]);
  if (!img) throw notFound();
  return new Response(img.data, {
    headers: {
      'Content-Type': img.content_type,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      // Rasm ichida skript bajarilmasligi uchun qat'iy CSP
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Content-Disposition': 'inline',
    },
  });
});

function siteOrigin(c: Context<AppEnv>): string {
  return getEnv().origins.find((o) => o.startsWith('https://')) ?? ownOrigin(c);
}

publicRoutes.get('/sitemap.xml', (c) => {
  const origin = siteOrigin(c);
  const list = all<{ id: string; updated_at: number }>('SELECT id, updated_at FROM products');
  const pages = ['/', '/catalog', '/delivery', '/faq', '/about', '/contact'];
  const urls = [
    ...pages.map((p) => `<url><loc>${origin}${p}</loc><changefreq>daily</changefreq></url>`),
    ...list.map((p) => `<url><loc>${origin}/product/${p.id}</loc><lastmod>${new Date(p.updated_at).toISOString().slice(0, 10)}</lastmod></url>`),
  ];
  c.header('Content-Type', 'application/xml; charset=utf-8');
  c.header('Cache-Control', 'public, max-age=0, s-maxage=3600');
  return c.body(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`);
});

publicRoutes.get('/robots.txt', (c) => {
  c.header('Content-Type', 'text/plain; charset=utf-8');
  c.header('Cache-Control', 'public, max-age=3600');
  return c.body(
    ['User-agent: *', 'Disallow: /admin', 'Disallow: /checkout', 'Disallow: /profile', 'Disallow: /api/', 'Allow: /', `Sitemap: ${siteOrigin(c)}/sitemap.xml`, ''].join('\n'),
  );
});
