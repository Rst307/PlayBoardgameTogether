import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { zipSync } from 'fflate';
import { chromium } from '@playwright/test';

const base = new URL('../game-packages/gomoku/', import.meta.url);
const files = {};
const descriptor = JSON.parse(await readFile(new URL('game.json', base), 'utf8'));
descriptor.presentation = {};
const browser = await chromium.launch();
try {
  for (const [kind, width, height] of [['icon', 256, 256], ['cover', 1200, 675], ['background', 1200, 675]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const svg = await readFile(new URL(`art/${kind}.svg`, base), 'utf8');
    await page.setContent(`<style>body{margin:0}svg{display:block;width:100vw;height:100vh}</style>${svg}`);
    const png = await page.screenshot({ type: 'png' });
    if (png.length > 320 * 1024) throw new Error(`${kind} exceeds the package artwork limit`);
    descriptor.presentation[kind] = `data:image/png;base64,${png.toString('base64')}`;
    await page.close();
  }
} finally {
  await browser.close();
}
files['game.json'] = Buffer.from(JSON.stringify(descriptor));
files['server.js'] = await readFile(new URL('server.txt', base));
const client = await readFile(new URL('client.html', base), 'utf8');
if (!client.includes('__GOMOKU_BACKGROUND__')) throw new Error('Missing background placeholder');
files['client.html'] = Buffer.from(client.replace('__GOMOKU_BACKGROUND__', descriptor.presentation.background));
const output = new URL('../dist/game-packages/gomoku-1.0.3.zip', import.meta.url);
await mkdir(new URL('.', output), { recursive: true });
const bytes = zipSync(files, { mtime: new Date('2026-10-04T00:00:00Z'), level: 9 });
await writeFile(output, bytes);
console.log(`Gomoku ZIP: ${output.pathname} (${bytes.length} bytes)`);
