import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { DeterministicRng, type Json } from '../../packages/game-sdk/src/index.js';
import { PackageRuntime } from '../../apps/api/src/registry/package-runtime.js';
import { readGamePackage } from '../../apps/api/src/catalog/game-package.js';

test('sandbox desktop completes a QuickJS game and restores the authoritative board', async ({ page }, info) => {
  const parsed = readGamePackage(await readFile('dist/game-packages/gomoku-1.0.0.zip'));
  const game = (await PackageRuntime.create()).extension(parsed.server);
  const rng = new DeterministicRng(7);
  let state = game.setup({ seats: ['a', 'b'], options: {}, rng }).state;
  let seatId = 'a';
  let received: Json[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const view = () => game.getView(state, { kind: 'seat', seatId });
  async function publish(busy = false) {
    await page.evaluate(({ next, busy }) => {
      document.querySelector('iframe')!.contentWindow!.postMessage({ type: 'boardgame:view', view: next, busy, events: [] }, '*');
    }, { next: view(), busy });
  }
  await page.exposeFunction('acceptAction', async (raw: unknown) => {
    const action = game.parseAction(raw);
    received.push(action);
    state = game.applyAction(state, { kind: 'seat', seatId, controllerEpoch: 0 }, action, rng).state;
    await publish();
  });
  await page.route('http://gomoku.test/**', async route => {
    if (route.request().url().endsWith('/desktop')) {
      await route.fulfill({
        contentType: 'text/html', body: parsed.client,
        headers: { 'content-security-policy': "sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-src 'none'; object-src 'none'" },
      });
    } else {
      await route.fulfill({ contentType: 'text/html', body: `<!doctype html>
        <html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;background:#23262c"><iframe title="五子棋" sandbox="allow-scripts" src="/desktop" style="border:0;width:100%;height:920px"></iframe>
        <script>const initialView=${JSON.stringify(view())};
        addEventListener('message',event=>{
          const child=document.querySelector('iframe').contentWindow;
          if(event.source!==child)return;
          if(event.data.type==='boardgame:ready')child.postMessage({type:'boardgame:view',view:initialView,busy:false,events:[]},'*');
          if(event.data.type==='boardgame:action')window.acceptAction(event.data.action);
        });</script></body></html>` });
    }
  });
  await page.goto('http://gomoku.test/');
  const frame = page.frameLocator('iframe');
  await expect(frame.getByRole('status')).toHaveText('轮到你落子');
  await frame.getByRole('button', { name: 'H8 空位', exact: true }).click();
  await expect(frame.getByText('已选择 H8')).toBeVisible();
  expect(received).toHaveLength(0);
  await frame.getByRole('button', { name: '确认落子' }).click();
  await expect(frame.getByRole('status')).toHaveText('等待白棋落子');
  expect(received).toEqual([{ type: 'place', x: 7, y: 7 }]);
  await expect(frame.getByRole('button', { name: 'H8 黑棋' })).toHaveAttribute('aria-disabled', 'true');
  await expect(frame.getByRole('button', { name: '确认落子' })).toBeDisabled();
  const child = page.frames().find(item => item.url().endsWith('/desktop'))!;
  expect(await child.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await child.evaluate(() => { try { return parent.document.cookie; } catch { return 'blocked'; } })).toBe('blocked');
  state = game.deserialize(game.serialize(state));
  await page.reload();
  await expect(frame.getByRole('button', { name: 'H8 黑棋' })).toBeVisible();
  await expect(frame.getByText('第 1 手 · 最后落子 H8')).toBeVisible();

  // Recover an ongoing public position, then use each player's real View to finish through the bridge.
  state = game.setup({ seats: ['a', 'b'], options: {}, rng }).state;
  received = [];
  for (let i = 0; i < 5; i++) {
    seatId = 'a';
    await publish();
    await frame.getByRole('button', { name: String.fromCharCode(65 + i) + '1 空位', exact: true }).click();
    await publish(true);
    await expect(frame.getByRole('button', { name: '确认落子' })).toBeDisabled();
    await publish(false);
    await frame.getByRole('button', { name: String.fromCharCode(65 + i) + '1 空位', exact: true }).click();
    await frame.getByRole('button', { name: '确认落子' }).click();
    if (i < 4) {
      await expect(frame.getByRole('status')).toHaveText('等待白棋落子');
      seatId = 'b';
      await publish();
      await frame.getByRole('button', { name: 'O' + (i * 2 + 1) + ' 空位', exact: true }).click();
      await frame.getByRole('button', { name: '确认落子' }).click();
      await expect(frame.getByRole('status')).toHaveText('等待黑棋落子');
    }
  }
  await expect(frame.getByRole('status')).toHaveText('你获胜了');
  expect(game.getOutcome(state)).toEqual({ status: 'finished', winners: ['a'] });
  expect(received).toHaveLength(9);
  await expect(frame.locator('.stone.win')).toHaveCount(5);
  await expect(frame.getByRole('button', { name: '确认落子' })).toBeDisabled();
  await page.screenshot({ path: info.outputPath('gomoku-finished.png'), fullPage: true });
  expect(await page.frames().find(item => item.url().endsWith('/desktop'))!.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  state = game.setup({ seats: ['a', 'b'], options: {}, rng }).state;
  await publish();
  await frame.getByRole('button', { name: 'H8 空位' }).focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(frame.getByText('已选择 I8')).toBeVisible();
  await page.screenshot({ path: info.outputPath('gomoku-selection.png'), fullPage: true });
  expect(errors).toEqual([]);
});
