import { expect, test } from '@playwright/test';
import { DeterministicRng } from '@boardgame/game-sdk';
import { azulExtension } from '../../games/azul/src/server/index.js';
import { splendorExtension } from '../../games/splendor/src/server/index.js';

const longName = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ123456';
const players = { a: '小明', b: longName };

for (const id of ['azul.base', 'splendor.base']) {
  test(`${id} names flow through the registry into players, turn, results and activity`, async ({ page }, info) => {
    const viewer = { kind: 'seat' as const, seatId: 'a' };
    const rng = new DeterministicRng(42);
    const view = id === 'azul.base'
      ? azulExtension.getView(azulExtension.setup({ seats: ['a', 'b'], options: {}, rng }).state, viewer)
      : splendorExtension.getView(splendorExtension.setup({ seats: ['a', 'b'], options: {}, rng }).state, viewer);
    const waiting = { ...view, currentSeatId: 'b' };
    await page.route('**/api/**', route => route.abort());
    await page.goto('/');
    await page.evaluate(async ({ id, view, players }) => {
      const load = (url: string) => import(/* @vite-ignore */ url);
      const [{ default: React }, { default: ReactDOM }, { clientGame }] = await Promise.all([
        load('/node_modules/.vite/deps/react.js'),
        load('/node_modules/.vite/deps/react-dom_client.js'),
        load('/src/game-registry.tsx'),
      ]);
      document.body.innerHTML = '<main style="max-width:1200px;margin:auto;padding:12px"><div id="board"></div></main>';
      const root = ReactDOM.createRoot(document.getElementById('board'));
      const render = await clientGame(id, '1.0.0').load();
      Reflect.set(window, 'renderNamedBoard', (view: unknown, names: unknown, events: unknown[] = []) => {
        root.render(React.createElement(React.Fragment, null, render(view, false, events, () => {}, undefined, undefined, names)));
      });
      Reflect.get(window, 'renderNamedBoard')(view, players, [
        { eventId: 'name-test', type: 'turn.played', seatId: 'b', action: 'take' },
      ]);
    }, { id, view: waiting, players });
    const board = page.getByRole('region', { name: id === 'azul.base' ? '花砖物语游戏桌' : '璀璨宝石游戏桌' });
    await expect(board).toContainText('小明（你）');
    await expect(board).toContainText(longName);
    await expect(board.getByRole('status').first()).toContainText('等待' + longName);
    if (id === 'splendor.base') await expect(page.getByRole('region', { name: '公开行动记录' })).toContainText(longName + '拿取了宝石');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(id + '-names.png'), fullPage: true });
    const outcome = id === 'azul.base'
      ? { status: 'finished', winners: ['b'], scores: { a: 0, b: 0 } }
      : { status: 'finished', winners: ['b'], scores: { a: 0, b: 0 }, reason: 'prestige' };
    await page.evaluate(({ view, outcome }) => Reflect.get(window, 'renderNamedBoard')({
      ...view, phase: 'finished', outcome,
    }, { a: '小明', b: '花砖好友' }), { view: waiting, outcome });
    await expect(board).toContainText('花砖好友获胜');
    await expect(board).not.toContainText(longName);
    // Anonymous tutorials and legacy API snapshots keep their existing labels.
    await page.evaluate(view => Reflect.get(window, 'renderNamedBoard')(view, undefined), waiting);
    await expect(board).toContainText(id === 'azul.base' ? '玩家 2' : '座位 2');
  });
}
