import { expect, test } from '@playwright/test';

test('registry bridge publishes names on ready, metadata changes and replay without replacing the rules view', async ({ page }) => {
  await page.route('**/api/**', route => {
    if (route.request().url().includes('/game-packages/online.name-test/')) {
      return route.fulfill({ contentType: 'text/html', body: `
        <pre id="payload"></pre><script>
        addEventListener('message', e => {
          if (e.source === parent && e.data?.type === 'boardgame:view')
            document.getElementById('payload').textContent = JSON.stringify(e.data);
        });
        parent.postMessage({type:'boardgame:ready'}, '*');
        </script>` });
    }
    return route.abort();
  });
  await page.goto('/');
  await page.evaluate(async () => {
    const load = (url: string) => import(/* @vite-ignore */ url);
    const [{ default: React }, { default: ReactDOM }, { clientGame }] = await Promise.all([
      load('/node_modules/.vite/deps/react.js'), load('/node_modules/.vite/deps/react-dom_client.js'), load('/src/game-registry.tsx'),
    ]);
    document.body.innerHTML = '<main id="named-package"></main>';
    const root = ReactDOM.createRoot(document.getElementById('named-package'));
    const render = await clientGame('online.name-test', '1.0.0').load();
    const view = { you: 'seat-b', privateHand: ['only-my-card'] };
    Reflect.set(window, 'renderNameBridge', (names: unknown, replay = false) => root.render(
      React.createElement(React.Fragment, null, render(view, false, [], () => {}, undefined, undefined, names,
        replay ? { id: 7, animate: false, hold: () => {} } : undefined)),
    ));
    Reflect.get(window, 'renderNameBridge')({ 'seat-a': '电脑阿福', 'seat-b': '小明' });
  });
  const payload = page.frameLocator('iframe').locator('#payload');
  await expect(payload).toContainText('电脑阿福');
  await expect(payload).toContainText('小明');
  const first = JSON.parse(await payload.textContent() ?? '{}');
  expect(first.view).toEqual({ you: 'seat-b', privateHand: ['only-my-card'] });
  expect(first.view).not.toHaveProperty('playerNames');
  await page.evaluate(() => Reflect.get(window, 'renderNameBridge')({ 'seat-a': '改名好友', 'seat-b': '小明' }));
  await expect(payload).toContainText('改名好友');
  await expect(payload).not.toContainText('电脑阿福');
  await page.evaluate(() => Reflect.get(window, 'renderNameBridge')({ 'seat-a': '历史好友', 'seat-b': '历史本人' }, true));
  await expect(payload).toContainText('历史好友');
  const replay = JSON.parse(await payload.textContent() ?? '{}');
  expect(replay.replay).toEqual({ id: 7, animate: false });
  expect(replay.busy).toBe(true);
  await page.evaluate(() => Reflect.get(window, 'renderNameBridge')(undefined));
  await expect(payload).toContainText('"playerNames":{}');
});
