import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';

export async function rummikubFiles() {
  const base = new URL('../game-packages/rummikub/', import.meta.url);
  const shared = await readFile(new URL('shared.txt', base), 'utf8');
  return {
    'game.json': Buffer.from(await readFile(new URL('game.json', base), 'utf8')),
    'server.js': Buffer.from(shared + '\n' + await readFile(new URL('server.txt', base), 'utf8')),
    'client.html': Buffer.from((await readFile(new URL('client.html', base), 'utf8')).replace('/* RUMMIKUB_SHARED */', shared)),
  };
}
