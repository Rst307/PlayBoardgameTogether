import { test, expect } from '@playwright/test';

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
