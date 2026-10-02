import { expect, test } from './fixtures.js';
import { decideBasicSplendor } from '../../games/splendor/src/server/index.js';
import { names, viewSchema } from '../../games/splendor/src/shared/index.js';

test('璀璨宝石：真人与脚本AI完成整局、私密预留刷新保留、手机无溢出', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.goto('/login');
  await page.getByLabel('用户名').fill('stage3_a');
  await page.getByLabel('密码').fill('stage two password');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByRole('heading', { name: '游戏大厅' })).toBeVisible();
  await page.getByRole('link', { name: '创建房间' }).click();
  await page.getByLabel('游戏与版本').selectOption('splendor.base@1.0.0');
  await page.getByLabel('房间名').fill('宝石商会 ' + testInfo.project.name);
  await page.getByRole('button', { name: '创建并生成邀请码' }).click();
  await expect(page.getByText(/splendor.base@1.0.0/)).toBeVisible();
  await page.getByRole('button', { name: '添加脚本 AI' }).click();
  await page.getByRole('button', { name: '准备', exact: true }).click();
  await page.getByRole('button', { name: '开始游戏' }).click();
  await expect(page.getByRole('heading', { name: '璀璨宝石', exact: true, level: 2 })).toBeVisible();
  const table = page.getByRole('region', { name: '璀璨宝石游戏桌' });
  expect(await table.locator('header').first().evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  const firstCard = page.getByRole('region', { name: '发展卡市场' }).getByRole('button', { name: /card\./ }).first();
  await firstCard.focus();
  await firstCard.press('Enter');
  await expect(firstCard).toHaveAttribute('aria-pressed', 'true');
  const confirmation = page.getByRole('region', { name: '确认本回合操作' });
  await expect(confirmation).toBeVisible();
  expect(await confirmation.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= window.innerHeight && rect.width <= window.innerWidth;
  })).toBe(true);
  await page.screenshot({ path: 'docs/screenshots/splendor/decision-' + testInfo.project.name + '.png' });
  await page.getByRole('button', { name: '取消选择', exact: true }).click();
  await expect(firstCard).toHaveAttribute('aria-pressed', 'false');
  const matchId = new URL(page.url()).pathname.split('/').at(-1)!;
  const snapshot = async () => page.evaluate(async id => {
    const response = await fetch('/api/v1/matches/' + id + '/view');
    return (await response.json()).data;
  }, matchId);
  await expect(page.getByRole('button', { name: /^盲抽3级牌堆/ })).toBeEnabled();
  await page.getByRole('button', { name: /^盲抽3级牌堆/ }).click();
  await page.getByRole('button', { name: '确认盲抽预留' }).click();
  await expect.poll(async () => (await snapshot()).view.myReserved.length).toBe(1);
  const reservedId = (await snapshot()).view.myReserved[0].id;
  await page.reload();
  await expect(page.getByRole('region', { name: '我的预留卡' }).getByRole('button', { name: new RegExp(reservedId.replaceAll('.', '\\.')) })).toBeVisible();
  expect((await snapshot()).view.myReserved[0].id).toBe(reservedId);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: 'docs/screenshots/splendor/table-' + testInfo.project.name + '.png', fullPage: true });

  for (let step = 0; step < 250; step++) {
    await expect.poll(async () => {
      const data = await snapshot();
      return data.view.phase === 'finished' || data.view.currentSeatId === data.view.viewingSeatId;
    }, { timeout: 20_000 }).toBe(true);
    const data = await snapshot(), view = viewSchema.parse(data.view);
    if (view.phase === 'finished') break;
    // Reload every new human decision to exercise authoritative recovery, rather than replaying a stale command.
    await page.reload();
    const action = decideBasicSplendor({ view, legalActions: view.legalActions });
    if (!action) throw new Error('Human turn has no legal decision');
    const response = page.waitForResponse(result => result.url().endsWith('/matches/' + matchId + '/actions') && result.request().method() === 'POST');
    if (action.type === 'take') {
      const same = new Set(action.colors).size === 1 && action.colors.length === 2;
      await page.getByRole('button', { name: same ? '两枚同色 · 库存至少 4' : '三种不同颜色', exact: true }).click();
      for (const color of new Set(action.colors))
        await page.getByRole('button', { name: new RegExp('^' + names[color] + '库存 ') }).click();
      await page.getByRole('button', { name: '确认拿取' }).click();
    } else if (action.type === 'buy' || action.type === 'reserve') {
      const cardId = action.cardId;
      const card = page.getByRole('button', { name: new RegExp(cardId.replaceAll('.', '\\.') + '$') });
      await card.click();
      await page.getByRole('button', { name: action.type === 'buy' ? '确认购买' : '确认预留', exact: true }).click();
    } else if (action.type === 'reserve_deck') {
      await page.getByRole('button', { name: new RegExp('^盲抽' + action.tier + '级牌堆') }).click();
      await page.getByRole('button', { name: '确认盲抽预留' }).click();
    } else if (action.type === 'return') {
      await page.getByRole('button', { name: new RegExp('^退回' + names[action.color] + ' ') }).click();
    } else if (action.type === 'noble') {
      const nobleId = action.nobleId;
      const noble = view.nobles.find(item => item.id === nobleId)!;
      await page.getByRole('button', { name: '选择贵族 ' + noble.name, exact: true }).click();
    } else {
      await page.getByRole('button', { name: '无可用行动，跳过回合' }).click();
    }
    expect((await response).status()).toBe(200);
  }
  await expect(page).toHaveURL(/\/rooms\//, { timeout: 30_000 });
  await expect(page.getByRole('button', { name: '准备', exact: true })).toBeEnabled();
  await page.getByRole('link', { name: '查看本局结果' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: '最终结算' })).toBeVisible();
  expect((await snapshot()).view.outcome.status).toBe('finished');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: 'docs/screenshots/splendor/finished-' + testInfo.project.name + '.png', fullPage: true });
});
