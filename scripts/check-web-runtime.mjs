import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { setTimeout } from 'node:timers';
import { chromium } from '@playwright/test';

const origin = 'http://127.0.0.1:5373';
const server = spawn(process.execPath, [
  resolve('apps/web/node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', '5373', '--strictPort',
], { cwd: resolve('apps/web'), windowsHide: true, stdio: 'ignore' });
let browser;
try {
  const deadline = Date.now() + 15_000;
  let ready = false;
  while (Date.now() < deadline) {
    try { ready = (await globalThis.fetch(`${origin}/login`)).ok; } catch { ready = false; }
    if (ready) break;
    if (server.exitCode !== null) throw new Error('Production preview exited before readiness');
    await new Promise(done => setTimeout(done, 100));
  }
  assert(ready, 'Production preview did not become ready');
  browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/login`);
  await page.getByRole('heading', { name: '回到游戏桌' }).waitFor();
  await page.getByLabel('用户名').fill('anonymous_runtime_check');
  await page.getByLabel('密码').fill('runtime check only');
  assert(await page.getByRole('button', { name: '登录', exact: true }).isEnabled());
  // Do not submit credentials: this smoke test checks the built UI only.
  for (const path of ['/dev/ui', '/dev/lab']) {
    await page.goto(`${origin}${path}`);
    await page.getByRole('heading', { name: '页面不存在' }).waitFor();
    assert.equal(await page.getByText('UI_FIXTURES_STAGE_9').count(), 0);
  }
  assert.deepEqual(errors, []);
  console.log('production web renders with React runtime; development routes are unavailable');
} finally {
  await browser?.close();
  if (server.exitCode === null) {
    const exited = new Promise(done => server.once('exit', done));
    server.kill();
    await exited;
  }
}
