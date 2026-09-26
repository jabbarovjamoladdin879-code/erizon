import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Content-Security-Policy.
 * - Production: qat'iy siyosat — faqat o'z domenimizdan skriptlar, inline skript yo'q.
 * - Dev: Vite HMR va React Fast Refresh preamble (inline skript) + WebSocket uchun yumshatilgan.
 * `frame-ancestors` meta teg orqali ishlamaydi — uni backend/hosting HTTP sarlavhasida qo'shing.
 */
const CSP_COMMON = [
  "default-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
];

const CSP_PROD = [
  ...CSP_COMMON,
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
].join('; ');

const CSP_DEV = [
  ...CSP_COMMON,
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' ws: wss:",
].join('; ');

function cspPlugin(): Plugin {
  let isDev = false;
  return {
    name: 'erizon-csp',
    configResolved(config) {
      isDev = config.command === 'serve' && !config.isProduction;
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace('__CSP_POLICY__', isDev ? CSP_DEV : CSP_PROD);
      },
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    cspPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      // Tashqi registerSW.js fayli — inline skript yo'q (CSP bilan mos)
      injectRegister: 'script',
      // Service worker faqat `npm run build` natijasida ishlaydi, dev rejimida o'chiq
      devOptions: { enabled: false },
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Erizon Mall — Beruniy',
        short_name: 'Erizon Mall',
        description: "Beruniy shahridagi Erizon Mall savdo markazining onlayn do'koni",
        lang: 'uz',
        theme_color: '#6d28d9',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}', 'assets/inter-*-wght-normal-*.woff2'],
        navigateFallback: 'index.html',
        // API javoblari hech qachon service worker orqali keshlanmaydi
        navigateFallbackDenylist: [/^\/api\//, /^\/sitemap\.xml$/, /^\/robots\.txt$/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    // Dev: /api so'rovlari lokal backend'ga (server/dev.ts) yo'naltiriladi
    proxy: {
      '/api': { target: 'http://127.0.0.1:3001', changeOrigin: false },
      '/sitemap.xml': { target: 'http://127.0.0.1:3001' },
      '/robots.txt': { target: 'http://127.0.0.1:3001' },
    },
  },
  preview: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:3001', changeOrigin: false },
      '/sitemap.xml': { target: 'http://127.0.0.1:3001' },
      '/robots.txt': { target: 'http://127.0.0.1:3001' },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
      },
    },
  },
});
