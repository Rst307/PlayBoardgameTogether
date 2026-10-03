import { readFile } from 'node:fs/promises';
import { zipSync } from 'fflate';
export const packagePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/l8AAAAASUVORK5CYII=';
export async function unoPackageZip() {
    const base = new URL('../../game-packages/uno/', import.meta.url);
    const descriptor = JSON.parse(await readFile(new URL('game.json', base), 'utf8'));
    descriptor.presentation = { icon: packagePng, cover: packagePng, background: packagePng };
    return Buffer.from(zipSync({
        'game.json': Buffer.from(JSON.stringify(descriptor)),
        'server.js': await readFile(new URL('server.txt', base)),
        'client.html': await readFile(new URL('client.html', base)),
    }));
}
