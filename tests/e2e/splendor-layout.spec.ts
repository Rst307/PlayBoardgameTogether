import { expect, test } from './fixtures.js';

test('四人璀璨宝石：五位贵族、完整市场和玩家侧栏适配小尺寸桌面与手机', async ({ page }, testInfo) => {
  await page.goto('/login');
  await page.getByLabel('用户名').fill('stage3_a');
  await page.getByLabel('密码').fill('stage two password');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.getByRole('link', { name: '创建房间' }).click();
  await page.getByLabel('游戏与版本').selectOption('splendor.base@1.0.0');
  await page.getByLabel('人数', { exact: true }).fill('4');
  await page.getByLabel('房间名').fill('四人棋盘布局');
  await page.getByRole('button', { name: '创建并生成邀请码' }).click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: '添加脚本 AI' }).first().click();
    await expect(page.getByRole('button', { name: '移除 AI', exact: true })).toHaveCount(i + 1);
  }
  await page.getByLabel('资源包').selectOption({ label: 'TTS 经典卡面 · 1.0.0' });
  await page.getByRole('button', { name: '准备', exact: true }).click();
  await page.getByRole('button', { name: '开始游戏' }).click();
  const table = page.getByRole('region', { name: '璀璨宝石游戏桌' });
  await expect(table).toBeVisible();
  await expect(table.locator('.sp-noble')).toHaveCount(5);
  await expect(table.locator('.sp-player')).toHaveCount(4);
  const market = page.getByRole('region', { name: '发展卡市场' });
  await expect(market.locator('.sp-card')).toHaveCount(12);
  const sizes = testInfo.project.name === 'desktop' ? [
    { width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 1920, height: 1080 },
  ] : [{ width: 390, height: 844 }, { width: 320, height: 568 }];
  for (const size of sizes) {
    await page.setViewportSize(size);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    if (testInfo.project.name === 'desktop') {
      expect(await market.evaluate(element => element.getBoundingClientRect().bottom)).toBeLessThanOrEqual(size.height);
    }
    await page.screenshot({ path: '.data/e2e-splendor-ui/four-' + size.width + '.png' });
  }
  await table.locator('.sp-card').first().click();
  await expect(page.getByRole('region', { name: '确认本回合操作' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', { name: '确认本回合操作' })).toHaveCount(0);
});
