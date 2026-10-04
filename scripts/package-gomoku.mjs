import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { zipSync } from 'fflate';

const base = new URL('../game-packages/gomoku/', import.meta.url);
const files = {};
for (const [name, source] of [['game.json', 'game.json'], ['server.js', 'server.txt'], ['client.html', 'client.html']]) {
  files[name] = Buffer.from((await readFile(new URL(source, base), 'utf8')).replace(/^\uFEFF/, ''));
}
const output = new URL('../dist/game-packages/gomoku-1.0.2.zip', import.meta.url);
await mkdir(new URL('.', output), { recursive: true });
const bytes = zipSync(files, { mtime: new Date('2026-10-04T00:00:00Z'), level: 9 });
await writeFile(output, bytes);
console.log(`Gomoku ZIP: ${output.pathname} (${bytes.length} bytes)`);
