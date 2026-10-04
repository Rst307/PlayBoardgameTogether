import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { zipSync } from 'fflate';
import { chromium } from '@playwright/test';
import { catanFiles } from './catan-package.mjs';

const files = await catanFiles();
const descriptor = JSON.parse(files['game.json'].toString('utf8'));
const browser = await chromium.launch();
try {
  descriptor.presentation = {};
  const cover = await readFile(new URL('../game-packages/catan/art/cover.png', import.meta.url));
  if (cover.length > 320 * 1024 || cover.readUInt32BE(16) !== 960 || cover.readUInt32BE(20) !== 540) {
    throw new Error('Catan cover must be a 960x540 PNG within 320 KiB');
  }
  descriptor.presentation.cover = `data:image/png;base64,${cover.toString('base64')}`;
  const svg = await readFile(new URL('../game-packages/catan/art/cover.svg', import.meta.url), 'utf8');
  for (const [kind, width, height] of [['icon', 256, 256], ['background', 960, 640]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.setContent(`<style>body{margin:0}svg{display:block;width:100vw;height:100vh}</style>${svg}`);
    const png = await page.screenshot({ type: 'png' });
    if (png.length > 320 * 1024) throw new Error(`${kind} exceeds package artwork limit`);
    descriptor.presentation[kind] = `data:image/png;base64,${png.toString('base64')}`;
    await page.close();
  }
} finally { await browser.close(); }
files['game.json'] = Buffer.from(JSON.stringify(descriptor));
const output = new URL('../dist/game-packages/catan-1.0.1.zip', import.meta.url);
await mkdir(new URL('.', output), { recursive: true });
const bytes = zipSync(files, { mtime: new Date('2026-10-04T00:00:00Z'), level: 9 });
await writeFile(output, bytes);
console.log(`Catan ZIP: ${output.pathname} (${bytes.length} bytes; embedded artwork)`);
