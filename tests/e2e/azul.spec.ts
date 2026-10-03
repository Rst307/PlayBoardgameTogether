import { expect, test, openRoomCreation } from './fixtures.js';
import { decideBasicAzul } from '../../games/azul/src/server/index.js';
import { names, viewSchema } from '../../games/azul/src/shared/index.js';

test('花砖物语：真人与AI整局、实时计分动画、刷新不重播、桌面手机操作', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  await page.goto('/login');
  await page.getByLabel('用户名').fill('stage3_a');
  await page.getByLabel('密码').fill('stage two password');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByRole('heading', { name: '游戏大厅' })).toBeVisible();
  await openRoomCreation(page);
  await page.getByLabel('游戏与版本').selectOption('azul.base@1.0.0');
  await page.getByLabel('房间名').fill('花砖工坊 ' + testInfo.project.name);
  await page.getByRole('button', { name: '创建并生成邀请码' }).click();
  await page.getByRole('button', { name: '添加脚本 AI' }).click();
  await page.getByRole('button', { name: '准备', exact: true }).click();
  await page.getByRole('button', { name: '开始游戏' }).click();
  const table = page.getByRole('region', { name: '花砖物语游戏桌' });
  await expect(table).toBeVisible();
  expect(await table.locator('.az-heading').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  expect(await table.locator('.az-offer').first().evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  expect(await table.locator('.az-pattern').first().evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  const matchId = new URL(page.url()).pathname.split('/').at(-1)!;
  const snapshot = () => page.evaluate(async id => (await (await fetch('/api/v1/matches/' + id + '/view')).json()).data, matchId);
  await page.screenshot({ path: `.data/azul-${testInfo.project.name}-table.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  let observedAnimation = false, recovered = false;
  async function verifyScoring() {
    await expect(table.locator('.az-reward').first()).toBeVisible();
    await page.screenshot({ path: `.data/azul-${testInfo.project.name}-scoring.png`, fullPage: true });
    observedAnimation = true;
    await page.reload();
    await expect(table).toBeVisible();
    await expect(table.locator('.az-reward')).toHaveCount(0);
    await expect(table.locator('.az-landing')).toHaveCount(0);
    await expect(page.getByText('最近一轮得分明细', { exact: true })).toBeVisible();
    recovered = true;
  }
  for (let move = 0; move < 350; move++) {
    await expect.poll(async () => {
      const data = await snapshot();
      return data.view.phase === 'finished' || data.view.currentSeatId === data.view.viewingSeatId;
    }).toBe(true);
    const data = await snapshot(), view = viewSchema.parse(data.view);
    if (!observedAnimation && view.round > 1) await verifyScoring();
    if (view.phase === 'finished') break;
    const action = decideBasicAzul({ view, legalActions: view.legalActions });
    if (!action) throw new Error('Missing legal human action');
    await page.getByRole('button', { name: `${action.source < 0 ? '中央' : `工厂 ${action.source + 1}`} ${names[action.color]} ${(action.source < 0 ? view.center : view.factories[action.source]!).filter(c => c === action.color).length}块`, exact: true }).click();
    if (action.row < 0) await page.getByRole('button', { name: '全部放地板', exact: true }).click();
    else await page.getByRole('button', { name: new RegExp(`^你图案行 ${action.row + 1} `) }).click();
    await expect(page.getByRole('button', { name: '确认选砖', exact: true })).toBeEnabled();
    if (move === 0) {
      await page.getByRole('button', { name: '取消选择', exact: true }).click();
      await expect(page.getByRole('button', { name: '确认选砖', exact: true })).toBeDisabled();
      continue;
    }
    const response = page.waitForResponse(r => r.url().endsWith(`/matches/${matchId}/actions`) && r.request().method() === 'POST');
    await page.getByRole('button', { name: '确认选砖', exact: true }).click();
    expect((await response).status()).toBe(200);
    await expect.poll(async () => (await snapshot()).revision).toBeGreaterThan(data.revision);
    if (!observedAnimation && (await snapshot()).view.round > view.round) {
      await verifyScoring();
    }
  }
  expect(observedAnimation).toBe(true); expect(recovered).toBe(true);
  await expect(page.getByRole('region', { name: '花砖物语结算' })).toBeVisible();
  expect((await snapshot()).status).toBe('finished');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await table.locator('.az-finale').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await page.screenshot({ path: `.data/azul-${testInfo.project.name}-finished.png`, fullPage: true });
});
