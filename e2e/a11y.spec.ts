import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Accessibility (WCAG 2.1 AA) tekshiruvi: rang kontrasti, yorliqlar, ARIA, sarlavhalar tartibi.
 * Jiddiy (serious/critical) xatolar bo'lsa test yiqiladi.
 */
const PAGES = ['/', '/catalog', '/product/ff-01', '/cart', '/login', '/register', '/reset', '/faq', '/delivery', '/about', '/contact', '/track', '/nope'];

for (const theme of ['light', 'dark'] as const) {
  test(`accessibility: jiddiy xatolar yo'q (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    const problems: string[] = [];
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible();
      // Sahifa almashinuvi (shaffoflik animatsiyasi) tugashini kutamiz — aks holda kontrast noto'g'ri o'lchanadi
      await page.waitForTimeout(700);
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      for (const v of result.violations.filter((x) => x.impact === 'serious' || x.impact === 'critical')) {
        problems.push(`${path} [${v.id}] ${v.help} — ${v.nodes.length} ta: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
      }
    }
    expect(problems, problems.join('\n')).toEqual([]);
  });
}
