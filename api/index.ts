/**
 * Vercel Serverless Function kirish nuqtasi.
 * vercel.json dagi rewrite qoidalari barcha /api/*, /sitemap.xml va /robots.txt
 * so'rovlarini shu funksiyaga yo'naltiradi; marshrutlash Hono ichida bajariladi.
 */
import { handle } from '@hono/node-server/vercel';
import { app } from '../server/app.js';

export const config = {
  api: { bodyParser: false },
};

export default handle(app);
