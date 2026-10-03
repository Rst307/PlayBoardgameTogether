import { test, expect, openRoomCreation } from './fixtures.js';

test('建房与候场聚焦核心任务，辅助设置可展开且操作保留', async ({ page }, info) => {
  await page.goto('/login');
  await page.getByLabel('用户名').fill('stage3_a');
  await page.getByLabel('密码', { exact: true }).fill('stage two password');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await openRoomCreation(page);
  await expect(page.getByLabel('游戏选项（JSON）')).toBeHidden();
  await page.getByLabel('房间名').fill('周末欢乐桌');
  await page.getByText('高级设置', { exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByLabel('游戏选项（JSON）').fill('{');
  await page.getByRole('button', { name: '创建并生成邀请码' }).click();
  await expect(page.getByRole('alert')).toContainText('游戏选项格式不正确');
  await expect(page.getByLabel('房间名')).toHaveValue('周末欢乐桌');
  await page.getByLabel('游戏选项（JSON）').fill('{}');
  await page.getByText('高级设置', { exact: true }).click();
  await page.screenshot({ path: info.outputPath('create-room.png'), fullPage: true });
  await page.getByRole('button', { name: '创建并生成邀请码' }).click();
  await expect(page.getByText('实时同步', { exact: true })).toBeVisible();
  await expect(page.locator('.room-heading')).toContainText('Color Match');
  await expect(page.locator('.room-heading')).not.toContainText('revision');
  await expect(page.getByRole('button', { name: '关闭房间', exact: true })).toBeHidden();
  await expect(page.getByLabel('资源包')).toBeHidden();
  await expect(page.locator('.invite-box strong')).toBeVisible();
  await page.getByText('邀请朋友', { exact: true }).click();
  await expect(page.locator('.invite-box strong')).toBeHidden();
  await page.getByRole('button', { name: '添加脚本 AI', exact: true }).click();
  await page.getByRole('button', { name: '准备', exact: true }).click();
  await expect(page.getByRole('button', { name: '开始游戏', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: '开始游戏', exact: true })).not.toHaveClass(/secondary/);
  await page.getByText('房间设置', { exact: true }).click();
  await page.getByLabel('资源包').selectOption({ label: '纸张几何 · 1.0.0' });
  await expect(page.getByRole('button', { name: '准备', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '开始游戏', exact: true })).toBeDisabled();
  await page.getByLabel('房间名', { exact: true }).fill('重命名的欢乐桌');
  await page.getByRole('button', { name: '保存配置（规则变更会清除准备）' }).click();
  await expect(page.getByRole('heading', { name: '重命名的欢乐桌', exact: true })).toBeVisible();
  await page.getByText('房间设置', { exact: true }).click();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`room-${width}.png`), fullPage: true, animations: 'disabled' });
  }
  await page.reload();
  await expect(page.getByRole('heading', { name: '重命名的欢乐桌', exact: true })).toBeVisible();
  await page.getByText('更多操作', { exact: true }).click();
  await page.getByRole('button', { name: '离座', exact: true }).click();
  await expect(page.getByRole('heading', { name: '候场成员', exact: true })).toBeVisible();
  await page.locator('.seat-card').first().getByRole('button', { name: '坐这里', exact: true }).click();
  await expect(page.getByRole('heading', { name: '候场成员', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '准备', exact: true }).click();
  await page.getByRole('button', { name: '开始游戏', exact: true }).click();
  await expect(page).toHaveURL(/\/matches\//);
});

test('四人房间在辅助入口配置资源包和移除 AI 后仍可开局', async ({ page }, info) => {
  await page.goto('/login');
  await page.getByLabel('用户名').fill('stage3_a');
  await page.getByLabel('密码', { exact: true }).fill('stage two password');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await openRoomCreation(page);
  await page.getByLabel('游戏与版本').selectOption('splendor.base@1.0.0');
  await page.getByLabel('人数', { exact: true }).fill('4');
  await page.getByRole('button', { name: '创建并生成邀请码' }).click();
  await expect(page.locator('.room-heading')).toContainText('璀璨宝石');
  for (let i = 1; i <= 3; i++) {
    await page.getByRole('button', { name: '添加脚本 AI', exact: true }).first().click();
    await expect(page.getByText('脚本 AI · 已就绪', { exact: true })).toHaveCount(i);
  }
  const secondSeat = page.locator('.seat-card').nth(1);
  await expect(secondSeat.getByRole('button', { name: '移除 AI', exact: true })).toBeHidden();
  await secondSeat.getByText('AI 设置', { exact: true }).click();
  await secondSeat.getByRole('button', { name: '移除 AI', exact: true }).click();
  await expect(page.getByText('脚本 AI · 已就绪', { exact: true })).toHaveCount(2);
  await secondSeat.getByRole('button', { name: '添加脚本 AI', exact: true }).click();
  await page.getByText('房间设置', { exact: true }).click();
  await page.getByLabel('资源包').selectOption({ label: 'TTS 经典卡面 · 1.0.0' });
  await expect(page.getByLabel('资源包').locator('option:checked')).toHaveText('TTS 经典卡面 · 1.0.0');
  await page.getByText('房间设置', { exact: true }).click();
  await page.getByText('邀请朋友', { exact: true }).click();
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`four-seats-${width}.png`), fullPage: true, animations: 'disabled' });
  }
  await page.getByRole('button', { name: '准备', exact: true }).click();
  await page.getByRole('button', { name: '开始游戏', exact: true }).click();
  await expect(page.getByRole('region', { name: '璀璨宝石游戏桌', exact: true })).toBeVisible();
});
