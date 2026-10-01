import { readFileSync } from 'node:fs';
import { assetManifestSchema } from '@boardgame/game-sdk';

export const gridGardenAssetManifest = assetManifestSchema.parse(JSON.parse(readFileSync(new URL('../../assets/manifest.json', import.meta.url), 'utf8')));
