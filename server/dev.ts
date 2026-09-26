/**
 * Lokal server (npm run dev). Hech qanday sozlama talab qilinmaydi:
 * - ma'lumotlar bazasi — data/erizon.sqlite (avtomatik yaratiladi va to'ldiriladi);
 * - .env.local mavjud bo'lsa, undagi ixtiyoriy sozlamalar o'qiladi.
 */
import { existsSync } from 'node:fs';
import { serve } from '@hono/node-server';

for (const file of ['.env.local', '.env']) {
  if (existsSync(file)) process.loadEnvFile(file);
}
process.env.NODE_ENV ??= 'development';

const PORT = Number(process.env.API_PORT ?? 3001);
const { app } = await import('./app.js');
const { bootstrap } = await import('./seed.js');
const { closeDb } = await import('./db.js');
const { getEnv } = await import('./env.js');

await bootstrap();
if (!getEnv().isProd && !process.env.ADMIN_PASSWORD) {
  console.info('[dev] Admin (lokal): +998900000001 / Admin12345');
}

const server = serve({ fetch: app.fetch, port: PORT, hostname: '127.0.0.1' }, (info) => {
  console.info(`[dev] API: http://127.0.0.1:${info.port}/api/health  |  DB: ${getEnv().databasePath}`);
});

function shutdown() {
  server.close();
  closeDb();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
