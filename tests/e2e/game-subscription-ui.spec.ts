import { test, expect } from '@playwright/test';
import { sessionFixture } from '../fixtures/session.js';
import type { GameSubscription } from '@boardgame/protocol';

test('subscription retains an unknown save request and shows independent controls without mobile overflow', async ({
  page,
}, info) => {
  let value: GameSubscription = {
    source: 'playboard-official',
    autoAdd: false,
    autoUpdate: false,
    revision: 0,
    intervalMinutes: 60,
    status: 'idle',
    startedAt: null,
    finishedAt: null,
    nextCheckAt: null,
    message: '',
    items: [],
  };
  let firstId: string | undefined;
  let writes = 0;
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/v1/auth/me')
      return route.fulfill({
        json: { ok: true, data: sessionFixture({ role: 'administrator' }), traceId: 'ui' },
      });
    if (path === '/api/v1/admin/games')
      return route.fulfill({ json: { ok: true, data: [], traceId: 'ui' } });
    if (path !== '/api/v1/admin/game-subscription') return route.abort();
    if (route.request().method() === 'PUT') {
      const input = route.request().postDataJSON();
      writes++;
      if (writes === 1) {
        firstId = input.requestId;
        value = { ...value, autoAdd: true, revision: 1 };
        return route.abort();
      }
      expect(input.requestId).toBe(firstId);
      expect(input.expectedRevision).toBe(0);
      expect(input.autoUpdate).toBe(false);
    }
    return route.fulfill({ json: { ok: true, data: value, traceId: 'ui' } });
  });
  await page.goto('/admin/catalog');
  await page.getByText('官方游戏订阅', { exact: true }).click();
  await page.getByLabel('自动添加新游戏', { exact: true }).check();
  await page.getByRole('button', { name: '保存订阅', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('请求结果尚未确认');
  await expect(page.getByLabel('自动添加新游戏', { exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '确认原保存请求', exact: true }).click();
  await expect(
    page.getByText('订阅已保存，后台将自动同步官方游戏。', { exact: true }),
  ).toBeVisible();
  expect(writes).toBe(2);
  await expect(page.getByLabel('自动添加新游戏', { exact: true })).toBeChecked();
  expect(
    await page
      .getByLabel('自动添加新游戏', { exact: true })
      .evaluate((element) => getComputedStyle(element).appearance),
  ).toBe('auto');
  await expect(page.getByLabel('自动更新已安装游戏', { exact: true })).not.toBeChecked();
  await page.screenshot({ path: info.outputPath('subscription-settings.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  value = { ...value, revision: 2, autoAdd: false };
  await expect(
    page.getByText('订阅设置已被其他操作修改，请重新读取设置后再保存。', { exact: true }),
  ).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('button', { name: '保存订阅', exact: true })).toBeDisabled();
  expect(writes).toBe(2);
});
