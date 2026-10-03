import { URL } from 'node:url';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { zipSync } from 'fflate';
const base = new URL('../game-packages/uno/', import.meta.url);
const files = {};
for (const [archiveName, sourceName] of [['game.json','game.json'],['server.js','server.txt'],['client.html','client.html']]) {
  files[archiveName] = await readFile(new URL(sourceName, base));
}
const output = new URL('../dist/game-packages/uno-1.0.0.zip', import.meta.url);
await mkdir(new URL('.', output), { recursive: true });
const bytes = zipSync(files, { mtime: new Date('2026-10-03T00:00:00Z'), level: 9 });
await writeFile(output, bytes);
console.log(`UNO ZIP: ${output.pathname} (${bytes.length} bytes)`);
