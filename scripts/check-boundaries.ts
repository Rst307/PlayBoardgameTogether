import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { forbiddenImport, sourceImports, type Layer } from './dependency-boundaries.js';

async function files(directory: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(path));
    else if (/\.[tj]sx?$/.test(entry.name)) result.push(path);
  }
  return result;
}

const gameNames = (await readdir('games', { withFileTypes: true }))
  .filter(entry => entry.isDirectory()).map(entry => entry.name);
const roots: { directory: string; layer: Layer }[] = [
  { directory: 'apps/web/src', layer: 'browser' },
  { directory: 'packages/ui/src', layer: 'browser' },
  { directory: 'packages/client-sdk/src', layer: 'client-sdk' },
  { directory: 'packages/protocol/src', layer: 'protocol' },
  { directory: 'packages/game-sdk/src', layer: 'sdk' },
  ...gameNames.flatMap(name => (['client', 'server', 'shared'] as const).map(layer =>
    ({ directory: join('games', name, 'src', layer), layer }))),
];

let failed = false;
for (const { directory, layer } of roots) {
  for (const path of await files(directory)) {
    const source = await readFile(path, 'utf8');
    for (const specifier of sourceImports(source, path)) {
      if (forbiddenImport(layer, path, specifier)) {
        console.error(`${relative('.', path)}: forbidden ${layer} import ${specifier}`);
        failed = true;
      }
    }
  }
}
if (failed) process.exitCode = 1;
else console.log(`dependency boundaries ok (${roots.length} source roots, AST imports)`);
