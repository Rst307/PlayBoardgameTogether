import { test, expect } from './fixtures.js';

test('lobby owns creation and profile changes persist across reloads', async ({ page }, info) => {
  await page.goto('/login');
  await page.getByLabel('用户名').fill('stage3_a');
  await page.getByLabel('密码', { exact: true }).fill('stage two password');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByRole('heading', { name: '游戏大厅', exact: true })).toBeVisible();
  await expect(page.locator('nav').getByRole('link', { name: '创建房间' })).toHaveCount(0);
  await expect(page.getByLabel('游戏与版本')).toHaveCount(0);
  await page.getByRole('link', { name: '创建房间', exact: true }).click();
  await expect(page).toHaveURL('/rooms/new');
  await expect(page.getByLabel('游戏与版本')).toBeVisible();
  await page.getByRole('link', { name: '返回游戏大厅' }).click();
  await expect(page.getByRole('heading', { name: '游戏大厅', exact: true })).toBeVisible();
  await page.screenshot({ path: `docs/screenshots/lobby-profile/lobby-${info.project.name}.png`, fullPage: true, animations: 'disabled' });
  await page.getByRole('link', { name: '我的资料', exact: true }).click();
  await expect(page.getByRole('heading', { name: '我的资料', exact: true })).toBeVisible();
  await expect(page.locator('.account-id')).toHaveText(/^[0-9a-f-]{36}$/);
  await page.getByLabel('昵称', { exact: true }).fill('周末桌友');
  await page.getByRole('radio', { name: '猫咪', exact: true }).check();
  await page.getByLabel('个人简介').fill('喜欢合作游戏，周末约一局。');
  await page.getByRole('button', { name: '保存资料' }).click();
  await expect(page.getByRole('status')).toHaveText('资料已保存');
  await page.reload();
  await expect(page.getByLabel('昵称', { exact: true })).toHaveValue('周末桌友');
  await expect(page.getByRole('radio', { name: '猫咪', exact: true })).toBeChecked();
  await expect(page.getByLabel('个人简介')).toHaveValue('喜欢合作游戏，周末约一局。');
  await expect(page.getByText('还没有对局记录。')).toBeVisible();
  const alignment = await page.getByRole('button', { name: '保存资料' }).evaluate(element => {
    const button = element.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(element);
    const text = range.getBoundingClientRect();
    return {
      x: Math.abs((button.left + button.right - text.left - text.right) / 2),
      y: Math.abs((button.top + button.bottom - text.top - text.bottom) / 2),
    };
  });
  expect(alignment.x).toBeLessThanOrEqual(2);
  expect(alignment.y).toBeLessThanOrEqual(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: `docs/screenshots/lobby-profile/profile-${info.project.name}.png`, fullPage: true, animations: 'disabled' });
  await page.getByRole('link', { name: '游戏大厅', exact: true }).click();
  await expect(page.getByText('你好，周末桌友')).toBeVisible();
});
