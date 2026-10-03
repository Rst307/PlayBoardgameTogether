import { readFile } from 'node:fs/promises';
import { strToU8, zipSync } from 'fflate';

export async function gamePackageFiles() {
  const base = new URL('../../apps/api/game-package-example/', import.meta.url);
  return {
    'game.json': await readFile(new URL('game.json', base)),
    'server.js': await readFile(new URL('server.txt', base)),
    'client.html': await readFile(new URL('client.html', base)),
  };
}
export async function gamePackageZip(transform?: (source: string) => string) {
  const files = await gamePackageFiles();
  if (transform) files['server.js'] = Buffer.from(transform(files['server.js'].toString()));
  return Buffer.from(zipSync(files, { mtime: new Date(2026, 0, 1) }));
}
export { strToU8, zipSync };
