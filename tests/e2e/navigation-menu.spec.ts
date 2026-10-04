import { test, expect } from '@playwright/test';

test('more tools remain unobscured on narrow screens', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'Mobile menu regression');
  await page.route('**/api/**', route => route.abort());
  for (const width of [320, 390, 700]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/developers');
    await page.locator('.nav-tools summary').click();
    const menu = page.locator('.nav-tools > div');
    await expect(menu).toBeVisible();
    expect(await menu.evaluate(element => {
      const rect = element.getBoundingClientRect();
      return [0.1, 0.5, 0.9].every(x => [0.05, 0.5, 0.95].every(y =>
        element.contains(document.elementFromPoint(rect.x + rect.width * x, rect.y + rect.height * y))));
    })).toBe(true);
    for (const control of await menu.locator('a, select').all()) {
      await expect(control).toBeInViewport();
      expect(await control.evaluate(element => {
        const rect = element.getBoundingClientRect();
        const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return top === element || element.contains(top);
      })).toBe(true);
    }
    await page.screenshot({ path: info.outputPath(`more-menu-${width}.png`), fullPage: true });
  }
});

test('more tools dismiss on outside click, Escape and navigation', async ({ page }) => {
  await page.route('**/api/**', route => route.abort());
  await page.goto('/developers');
  await page.evaluate(() => { document.body.dataset.navigationMarker = 'same-document'; });
  const more = page.locator('.nav-tools');
  const toggle = more.locator('summary');
  await toggle.click();
  await expect(more).toHaveAttribute('open');
  await page.keyboard.press('Escape');
  await expect(more).not.toHaveAttribute('open');
  await expect(toggle).toBeFocused();
  await toggle.click();
  await page.getByRole('heading', { name: '开发者中心', exact: true }).click();
  await expect(more).not.toHaveAttribute('open');
  await toggle.click();
  await page.getByRole('link', { name: '模型设置', exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/models$/);
  await expect(more).not.toHaveAttribute('open');
  await page.goBack();
  await expect(more).not.toHaveAttribute('open');
  expect(await page.evaluate(() => document.body.dataset.navigationMarker)).toBe('same-document');
});
