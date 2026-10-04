import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import { readFile } from 'node:fs/promises';

export async function catanFiles() {
  const base = new URL('../game-packages/catan/', import.meta.url);
  const shared = await readFile(new URL('shared.txt', base), 'utf8');
  return {
    'game.json': Buffer.from(await readFile(new URL('game.json', base), 'utf8')),
    'server.js': Buffer.from(shared + '\n' + await readFile(new URL('server.txt', base), 'utf8')),
    'client.html': Buffer.from((await readFile(new URL('client.html', base), 'utf8')).replace('/* CATAN_SHARED */', shared)),
  };
}
