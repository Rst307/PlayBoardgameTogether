import { test, expect } from './fixtures.js';

test('guest completes all Splendor lessons on the real board without API writes', async ({ page }, info) => {
  const writes: string[] = [];
  page.on('request', request => {
    if (request.method() !== 'GET' && /\/api\//.test(request.url())) writes.push(request.url());
  });
  await page.goto('/games/splendor.base/1.0.0');
  await page.getByRole('link', { name: '进入教程', exact: true }).click();
  await expect(page.getByRole('heading', { name: '璀璨宝石上手教程' })).toBeVisible();
  const next = page.getByRole('button', { name: '下一步', exact: true });
  const guide = page.getByRole('region', { name: '教程指引' });
  const bank = page.getByRole('region', { name: '公共宝石库存' });
  const market = page.getByRole('region', { name: '发展卡市场' });
  async function card(id: string) {
    await market.getByRole('button', { name: new RegExp(id.replaceAll('.', '\\.') + '$') }).click();
  }
  async function buy(id: string) {
    await card(id);
    await page.getByRole('button', { name: '确认购买', exact: true }).click();
  }
  async function take(names: string[]) {
    for (const name of names) await bank.getByRole('button', { name: new RegExp('^' + name + '库存') }).click();
    await page.getByRole('button', { name: '确认拿取', exact: true }).click();
  }
  async function advance() {
    await expect(next).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await next.click();
    await expect(page.getByRole('button', { name: /^(下一步|完成教程)$/ })).toBeDisabled();
  }
  await expect(next).toBeDisabled();
  // A legal action outside the lesson must offer feedback without progressing.
  await take(['红宝石', '红宝石']);
  await expect(guide.getByRole('status')).toContainText('这一步请按提示操作');
  await expect(next).toBeDisabled();
  await page.getByRole('button', { name: '重试本步', exact: true }).click();
  await expect(page.getByRole('button', { name: '确认拿取', exact: true })).toHaveCount(0);
  await take(['祖母绿', '钻石', '蓝宝石']);
  await advance();
  await take(['红宝石', '红宝石']);
  await advance();
  await buy('card.white.4');
  await advance();
  await buy('card.white.6');
  await advance();
  await card('card.white.6');
  await page.getByRole('button', { name: '确认预留', exact: true }).click();
  await expect(page.getByRole('region', { name: '我的预留卡' }).getByRole('button')).toHaveCount(1);
  await advance();
  await market.getByRole('button', { name: /^盲抽1级牌堆/ }).click();
  await page.getByRole('button', { name: '确认盲抽预留', exact: true }).click();
  await advance();
  await page.getByRole('region', { name: '我的预留卡' }).getByRole('button', { name: /card\.white\.6$/ }).click();
  await page.getByRole('button', { name: '确认购买', exact: true }).click();
  await expect(page.getByRole('region', { name: '我的预留卡' }).getByRole('button')).toHaveCount(0);
  await advance();
  await take(['钻石', '蓝宝石', '缟玛瑙']);
  await expect(next).toBeDisabled();
  await page.getByRole('button', { name: /^退回钻石/ }).click();
  await expect(next).toBeDisabled();
  await page.getByRole('button', { name: /^退回蓝宝石/ }).click();
  await advance();
  await buy('card.green.4');
  await expect(next).toBeDisabled();
  await expect(page.getByRole('button', { name: '选择贵族 海港公爵', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '选择贵族 海港公爵', exact: true }).click();
  await expect(guide.getByRole('status')).toContainText('白塔夫人');
  await expect(next).toBeDisabled();
  await page.getByRole('button', { name: '选择贵族 白塔夫人', exact: true }).click();
  await page.screenshot({ path: info.outputPath('splendor-tutorial-noble.png'), fullPage: true });
  await advance();
  await buy('card.white.13');
  await expect(page.getByText('最终轮', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '最终结算', exact: true })).toHaveCount(0);
  await advance();
  await buy('card.white.4');
  await expect(page.getByRole('heading', { name: '最终结算', exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('splendor-tutorial-finish.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: '完成教程', exact: true }).click();
  await expect(page.getByRole('heading', { name: '教程完成', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '再练一次', exact: true }).click();
  await expect(page.getByRole('heading', { name: '拿取三种宝石', exact: true })).toBeVisible();
  await take(['钻石', '蓝宝石', '祖母绿']);
  await advance();
  await page.getByRole('button', { name: '上一步', exact: true }).click();
  await expect(next).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('heading', { name: '拿取三种宝石', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '← 返回游戏详情', exact: true }).click();
  await expect(page.getByRole('link', { name: '进入教程', exact: true })).toBeVisible();
  await page.goto('/games/splendor.base/9.9.9/tutorial');
  await expect(page.getByRole('heading', { name: '游戏暂不可用' })).toBeVisible();
  expect(writes).toEqual([]);
});
