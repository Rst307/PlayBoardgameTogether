import { test, expect } from './fixtures.js';

test('administrator subscribes, sees a real installed ZIP, and can stop automatic updates', async ({
  page,
}, info) => {
  await page.goto('/login');
  await page.getByLabel('用户名', { exact: true }).fill('stage7_admin');
  await page.getByLabel('密码', { exact: true }).fill('stage two password');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page).toHaveURL('/');
  await page.goto('/admin/catalog');
  await page.getByText('官方游戏订阅', { exact: true }).click();
  await expect(page.getByLabel('自动添加新游戏', { exact: true })).not.toBeChecked();
  await page.getByLabel('自动添加新游戏', { exact: true }).check();
  await page.getByLabel('自动更新已安装游戏', { exact: true }).check();
  await page.getByRole('button', { name: '保存订阅', exact: true }).click();
  await expect(page.getByText('官方游戏目录同步完成', { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await page.getByText('同步明细（1）', { exact: true }).click();
  await expect(
    page.getByText('online.subscription-example · 1.0.0', { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('list', { name: '选择游戏' })
      .getByRole('button', { name: /online.subscription-example/ }),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('subscription-completed.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByLabel('自动添加新游戏', { exact: true }).uncheck();
  await page.getByLabel('自动更新已安装游戏', { exact: true }).uncheck();
  await page.getByRole('button', { name: '保存订阅', exact: true }).click();
  await expect(page.getByText('自动订阅已关闭，已安装游戏保留。', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByText('官方游戏订阅', { exact: true }).click();
  await expect(page.getByLabel('自动添加新游戏', { exact: true })).not.toBeChecked();
  await expect(page.getByRole('button', { name: '立即同步', exact: true })).toBeDisabled();
  await expect(
    page
      .getByRole('list', { name: '选择游戏' })
      .getByRole('button', { name: /online.subscription-example/ }),
  ).toBeVisible();
});
