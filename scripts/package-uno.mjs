import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { zipSync } from 'fflate';
import { chromium } from '@playwright/test';
const base = new URL('../game-packages/uno/', import.meta.url);
const descriptor = JSON.parse(await readFile(new URL('game.json', base), 'utf8'));
const files = {};
const browser = await chromium.launch();
try {
  descriptor.presentation = {};
  for (const [kind, source, width, height] of [
    ['icon', 'icon.svg', 256, 256], ['cover', 'cover.svg', 1200, 800], ['background', 'cover.svg', 1600, 1067],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const svg = await readFile(new URL(`art/${source}`, base), 'utf8');
    await page.setContent(`<style>body{margin:0}svg{display:block;width:100vw;height:100vh}</style>${svg}`);
    const png = await page.screenshot({ type: 'png' });
    descriptor.presentation[kind] = `data:image/png;base64,${png.toString('base64')}`;
    await page.close();
  }
} finally { await browser.close(); }
files['game.json'] = Buffer.from(JSON.stringify(descriptor));
for (const [archiveName, sourceName] of [['server.js','server.txt'],['client.html','client.html']]) {
  files[archiveName] = await readFile(new URL(sourceName, base));
}
const output = new URL('../dist/game-packages/uno-1.1.0.zip', import.meta.url);
await mkdir(new URL('.', output), { recursive: true });
const bytes = zipSync(files, { mtime: new Date('2026-10-03T00:00:00Z'), level: 9 });
await writeFile(output, bytes);
console.log(`UNO ZIP: ${output.pathname} (${bytes.length} bytes; embedded icon, cover and background)`);
