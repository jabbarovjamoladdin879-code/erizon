import { expect, test, type Page } from '@playwright/test';
import { E2E_ADMIN_PASSWORD } from '../playwright.config';

/** Har bir test davomida brauzer konsolidagi xatolar yig'iladi — bo'lsa test yiqiladi */
function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

test.describe.serial("xaridor → admin: to'liq oqim", () => {
  let orderPath = '';
  let orderId = '';

  test("ro'yxatdan o'tish (email kod)", async ({ page }) => {
    const errors = watchConsole(page);
    await page.goto('/register');
    await page.getByLabel('Ismingiz').fill('Sinov Xaridor');
    await page.getByLabel('Telefon raqami').pressSequentially('901234567');
    await page.getByLabel('Email (Gmail)').fill('e2e.xaridor@gmail.com');
    await page.getByRole('button', { name: 'Emailga kod yuborish' }).click();
    // Gmail ulanmagan (namoyish rejimi) — kod maydonga avtomatik qo'yiladi
    await expect(page.getByLabel('Emaildagi kod')).toHaveValue(/^\d{6}$/);
    await page.getByLabel('Parol', { exact: true }).fill('parol1234');
    await page.getByLabel('Parolni takrorlang').fill('parol1234');
    await page.locator('main form').getByRole('button', { name: "Ro'yxatdan o'tish" }).click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole('heading', { name: 'Sinov Xaridor' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('savat va buyurtma (mehmon, olib ketish)', async ({ page }) => {
    const errors = watchConsole(page);
    await page.goto('/catalog');
    const add = page.locator('main button[aria-label^="Savatga qo\'shish"]:enabled').first();
    await add.click();
    await page.goto('/cart');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Savat');
    await page.getByRole('button', { name: 'Rasmiylashtirish' }).first().click();
    await expect(page).toHaveURL(/\/checkout$/);
    await page.getByLabel('Ismingiz').fill('Mehmon Xaridor');
    await page.getByLabel('Telefon raqami').pressSequentially('935556677');
    await page.getByText("O'zi olib ketish", { exact: true }).click();
    await page.locator('#checkout-form button[type=submit]:visible').click();
    await expect(page.getByRole('heading', { name: 'Buyurtma qabul qilindi!' })).toBeVisible();
    const url = new URL(page.url());
    orderPath = url.pathname + url.search;
    orderId = url.pathname.split('/').pop() ?? '';
    expect(orderId).toMatch(/^EM-[A-Z0-9]+$/);
    expect(errors).toEqual([]);
  });

  test("admin buyurtma holatini o'zgartiradi, mijoz yangi holatni ko'radi", async ({ page, browser }) => {
    const errors = watchConsole(page);
    await page.goto('/login?redirect=/admin');
    await page.getByLabel('Telefon raqami').pressSequentially('900000001');
    await page.getByLabel('Parol', { exact: true }).fill(E2E_ADMIN_PASSWORD);
    await page.locator('main form').getByRole('button', { name: 'Kirish' }).click();
    // Login sahifasi manzili ham "...redirect=/admin" bilan tugaydi — shuning uchun sarlavhani kutamiz
    await expect(page.getByRole('heading', { name: 'Boshqaruv paneli' })).toBeVisible();
    await expect(page).toHaveURL(/localhost:\d+\/admin$/);
    await page.goto('/admin/orders');
    const status = page.locator(`#st-${orderId}`);
    await status.selectOption('preparing');
    await expect(status).toHaveValue('preparing');
    expect(errors).toEqual([]);

    // Mijoz (alohida brauzer sessiyasi) maxfiy havola orqali holatni ko'radi
    const customer = await browser.newPage();
    await customer.goto(orderPath);
    await expect(customer.locator('[aria-current=step]')).toContainText('Tayyorlanmoqda');
    await customer.close();
  });
});

test('kun aksiyasi taymeri har soniyada yangilanadi (umumiy useNow taymeri)', async ({ page }) => {
  await page.goto('/');
  const timer = page.getByText(/Tugashiga \d{2}:\d{2}:\d{2} qoldi/);
  await expect(timer).toBeVisible();
  const first = await timer.textContent();
  await expect(timer).not.toHaveText(first ?? '', { timeout: 3_000 });
});

test("mobil (390px): sahifalarda gorizontal siljish va konsol xatosi yo'q", async ({ page }) => {
  const errors = watchConsole(page);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/', '/catalog', '/product/ff-01', '/cart', '/checkout', '/login', '/register', '/reset', '/faq', '/track/abc']) {
    await page.goto(path);
    await expect(page.locator('h1').first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${path}: gorizontal siljish`).toBeLessThanOrEqual(0);
  }
  expect(errors).toEqual([]);
});
