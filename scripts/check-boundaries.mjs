/* eslint-env node */
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(path));
    else if (/\.[tj]sx?$/.test(entry.name)) result.push(path);
  }
  return result;
}
const gameNames = (await readdir('games', { withFileTypes: true }))
  .filter(entry => entry.isDirectory()).map(entry => entry.name);
const roots = [
  { directory: 'apps/web/src', layer: 'browser' },
  { directory: 'packages/protocol/src', layer: 'protocol' },
  ...gameNames.flatMap(name => ['client', 'server', 'shared'].map(layer =>
    ({ directory: join('games', name, 'src', layer), layer }))),
];
let failed = false;
for (const { directory, layer } of roots) {
  for (const path of await files(directory)) {
    const source = await readFile(path, 'utf8');
    const imports = [...source.matchAll(/(?:import|export)\s+(?:[^'"]+?\s+from\s+)?['"]([^'"]+)['"]|import\(['"]([^'"]+)['"]\)/g)]
      .map(match => match[1] ?? match[2]);
    for (const specifier of imports) {
      const forbidden = layer === 'browser' || layer === 'client' || layer === 'shared'
        ? specifier.includes('/server') || specifier.includes('apps/api') || ['pg', 'node:fs', 'node:crypto'].includes(specifier)
        : layer === 'protocol'
          ? specifier.startsWith('@boardgame/') && specifier !== '@boardgame/game-sdk'
          : ['react', 'react-dom', 'fastify', 'pg'].includes(specifier) || specifier.includes('apps/api');
      if (forbidden) {
        console.error(`${relative('.', path)}: forbidden ${layer} import ${specifier}`);
        failed = true;
      }
    }
  }
}
if (failed) process.exitCode = 1;
else console.log('dependency boundaries ok');
