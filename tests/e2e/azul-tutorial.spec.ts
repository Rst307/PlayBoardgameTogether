import { test, expect } from './fixtures.js';

test('guest learns Azul on desktop and mobile without live match writes', async ({ page }, info) => {
  test.setTimeout(70_000);
  const writes: string[] = [];
  page.on('request', request => {
    if (request.method() !== 'GET' && /\/api\//.test(request.url())) writes.push(request.url());
  });
  await page.goto('/games/azul.base/1.0.0');
  await page.getByRole('link', { name: '进入教程', exact: true }).click();
  await expect(page.getByRole('heading', { name: '花砖物语上手教程' })).toBeVisible();
  expect(await page.getByRole('region', { name: '确认选砖', exact: true }).evaluate(element =>
    getComputedStyle(element).position)).toBe('static');
  const next = page.getByRole('button', { name: '下一步', exact: true });
  const guide = page.getByRole('region', { name: '教程指引' });
  async function draft(offer: string, row: number) {
    await page.getByRole('button', { name: offer, exact: true }).click();
    if (row < 0) await page.getByRole('button', { name: '全部放地板', exact: true }).click();
    else await page.getByRole('button', { name: new RegExp(`^你图案行 ${row} `) }).click();
    await page.getByRole('button', { name: '确认选砖', exact: true }).click();
  }
  async function advance() {
    await expect(next).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await next.click();
    await expect(page.getByRole('button', { name: /^(下一步|完成教程)$/ })).toBeDisabled();
  }
  await expect(next).toBeDisabled();
  await draft('工厂 1 钴蓝 2块', 1);
  await expect(guide.getByRole('status')).toContainText('这一步请按提示操作');
  await expect(next).toBeDisabled();
  await page.getByRole('button', { name: '重试本步', exact: true }).click();
  await expect(page.getByRole('button', { name: '确认选砖', exact: true })).toBeDisabled();
  await draft('工厂 1 钴蓝 2块', 2);
  await advance();
  await page.getByRole('button', { name: '工厂 1 钴蓝 2块', exact: true }).click();
  await expect(page.getByRole('button', { name: /^你图案行 2 / })).toBeDisabled();
  await page.getByRole('button', { name: /^你图案行 3 / }).click();
  await page.getByRole('button', { name: '确认选砖', exact: true }).click();
  await advance();
  await draft('工厂 1 钴蓝 2块', 1);
  await advance();
  await draft('中央 琥珀 2块', 2);
  await expect(page.getByText('下轮你先手', { exact: true })).toBeVisible();
  await advance();
  await draft('工厂 1 钴蓝 1块', 1);
  await expect(page.getByRole('button', { name: /^你图案行 5 2\/5/ })).toBeVisible();
  await advance();
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await draft('工厂 1 钴蓝 1块', 3);
  const myBoard = page.getByRole('region', { name: '你的花砖板', exact: true });
  await expect(myBoard.locator('.az-pattern').nth(2).locator('.az-tile:not(.az-ghost)')).toHaveCount(2);
  await expect(myBoard.locator('.az-flying-tile')).toHaveCount(1);
  await expect(myBoard.locator('.az-wall-cell').nth(12).locator('.az-ghost')).toHaveCount(1);
  await expect(myBoard.getByLabel('你得分', { exact: true })).toContainText('0');
  await myBoard.locator('.az-flying-tile').evaluate(element => {
    const animation = element.getAnimations()[0]!;
    animation.pause();
    animation.currentTime = 150;
  });
  await page.screenshot({ path: info.outputPath('azul-tutorial-flight.png'), fullPage: true });
  await page.clock.runFor(300);
  await expect(myBoard.locator('.az-flying-tile')).toHaveCount(0);
  await expect(myBoard.locator('.az-wall-cell').nth(12).locator('.az-ghost')).toHaveCount(0);
  await expect(myBoard.locator('.az-pattern').nth(2).locator('.az-slot > .az-tile:not(.az-ghost)')).toHaveCount(0);
  await page.clock.resume();
  await expect(myBoard.locator('.az-score-float')).toHaveText('+3');
  await expect(myBoard.getByLabel('你得分', { exact: true })).toContainText('3');
  await expect(myBoard.locator('.az-score-float')).toHaveText('+3 +3');
  await expect(myBoard.getByLabel('你得分', { exact: true })).toContainText('6');
  await expect(page.locator('.az-impact-dock, .az-reward-space')).toHaveCount(0);
  expect(await myBoard.locator('.az-score-float').evaluate(element => ({
    position: getComputedStyle(element).position,
    animation: getComputedStyle(element).animationName,
    pointerEvents: getComputedStyle(element).pointerEvents,
  }))).toEqual({ position: 'absolute', animation: 'az-score-float', pointerEvents: 'none' });
  await expect.poll(() => myBoard.locator('.az-score-float').evaluate(element =>
    Number(getComputedStyle(element).opacity))).toBeGreaterThan(0.9);
  await page.screenshot({ path: info.outputPath('azul-tutorial-cross.png'), fullPage: true });
  await expect(myBoard.locator('.az-score-float')).toHaveCount(0, { timeout: 4000 });
  await expect(myBoard.getByLabel('你得分', { exact: true })).toContainText('6');
  await page.getByRole('button', { name: '重试本步', exact: true }).click();
  await expect(page.locator('.az-score-float')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await draft('工厂 1 钴蓝 1块', 3);
  await expect(myBoard.getByLabel('你得分', { exact: true })).toContainText('6', { timeout: 1000 });
  await expect(page.locator('.az-score-float')).not.toBeVisible();
  await expect(page.locator('.az-score-float')).toHaveCount(0, { timeout: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await advance();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await draft('中央 朱红 1块', -1);
  await expect(guide.getByRole('status')).toContainText('实际只扣 1');
  await expect(myBoard.locator('.az-floor .az-tile')).toHaveCount(3);
  await expect(myBoard.locator('.az-floor .az-first')).toHaveCount(1);
  await expect(myBoard.getByLabel('你得分', { exact: true })).toContainText('1');
  await page.clock.runFor(300);
  await expect(myBoard.getByLabel('你得分', { exact: true })).toContainText('0');
  await expect(myBoard.locator('.az-floor .az-tile')).toHaveCount(3);
  await page.screenshot({ path: info.outputPath('azul-tutorial-floor.png'), fullPage: true });
  await page.clock.runFor(1400);
  await expect(myBoard.locator('.az-floor .az-tile, .az-floor .az-first')).toHaveCount(0);
  await page.clock.resume();
  await advance();
  await draft('工厂 1 钴蓝 1块', 1);
  await expect(page.getByRole('heading', { name: '你获胜', exact: true })).toBeVisible();
  await expect(myBoard.getByLabel('你得分', { exact: true })).toContainText('53', { timeout: 20_000 });
  await page.screenshot({ path: info.outputPath('azul-tutorial-finish.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: '完成教程', exact: true }).click();
  await expect(page.getByRole('heading', { name: '教程完成', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '再练一次', exact: true }).click();
  await expect(page.getByRole('heading', { name: '从工厂选一整组', exact: true })).toBeVisible();
  await draft('工厂 1 钴蓝 2块', 2);
  await advance();
  await page.getByRole('button', { name: '上一步', exact: true }).click();
  await expect(next).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('heading', { name: '从工厂选一整组', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '← 返回游戏详情', exact: true }).click();
  await expect(page.getByRole('link', { name: '进入教程', exact: true })).toBeVisible();
  await page.goto('/games/azul.base/9.9.9/tutorial');
  await expect(page.getByRole('heading', { name: '游戏暂不可用' })).toBeVisible();
  expect(writes).toEqual([]);
});
