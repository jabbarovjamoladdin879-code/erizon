import { defineConfig, devices } from '@playwright/test';

/**
 * Brauzer (e2e) testlari: production build + lokal API, xotiradagi toza baza bilan.
 * Lokal: o'rnatilgan Google Chrome ishlatiladi; CI'da Playwright Chromium o'rnatiladi.
 * Ishga tushirish: npm run e2e
 */
const WEB_PORT = 4180;
const API_PORT = 3101;
export const E2E_ADMIN_PASSWORD = 'E2eAdmin12345';

const serverEnv = {
  API_PORT: String(API_PORT),
  NODE_ENV: 'development',
  DATABASE_PATH: ':memory:',
  ADMIN_PASSWORD: E2E_ADMIN_PASSWORD,
  // Gmail ulangan bo'lsa ham testda kod sahifada ko'rinsin (xat yuborilmaydi)
  ALLOW_DEMO_OTP: 'true',
  GMAIL_USER: '',
  GMAIL_APP_PASSWORD: '',
};

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...(process.env.CI ? {} : { channel: 'chrome' }) },
    },
  ],
  webServer: [
    {
      command: 'npx tsx server/dev.ts',
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      env: serverEnv,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npx vite build --logLevel warn && npx vite preview --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      env: { API_PORT: String(API_PORT) },
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
