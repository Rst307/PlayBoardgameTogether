import type { AssetContract } from '@boardgame/game-sdk/assets';
import { cards, nobles } from './catalog.js';
import { tokenColors } from './index.js';

// Optional slots preserve the original SVG presentation and legacy empty bindings.
export const splendorAssetContract: AssetContract = {
  id: 'splendor-assets', version: '1.0.0', gameId: 'splendor.base',
  slots: [
    ...cards.map(card => ({ key: card.id, kind: 'image' as const, required: false,
      label: `${card.id} · ${card.tier}级 · ${card.points}声望`, aspectRatio: 5 / 7 })),
    ...nobles.map(noble => ({ key: noble.id, kind: 'image' as const, required: false,
      label: noble.name, aspectRatio: 1 })),
    ...[1, 2, 3].map(tier => ({ key: `card.back.${tier}`, kind: 'image' as const,
      required: false, label: `${tier}级牌背`, aspectRatio: 5 / 7 })),
    ...tokenColors.map(color => ({ key: `token.${color}`, kind: 'image' as const,
      required: false, label: `${color}筹码`, aspectRatio: 1 })),
  ],
  cues: [],
};

// Visually checked against all 90 extracted faces, not the shuffled DeckIDs order.
// Each entry is the exact color/points/cost identity in the unchanged catalog.
const faceIds = [
  ['red.6','red.1','white.4','white.0','white.3','green.0','green.4','blue.4','black.6','black.1',
   'white.1','white.5','blue.7','blue.5','blue.0','black.2','black.7','black.4','red.7','green.2',
   'green.3','green.6','white.7','red.0','blue.1','blue.3','green.1','green.5','green.7','blue.2',
   'blue.6','white.6','white.2','red.3','red.4','red.2','black.5','black.0','black.3','red.5'],
  ['red.12','blue.13','green.13','white.13','black.9','green.12','black.10','red.8','black.11','green.8',
   'white.12','red.13','white.10','red.11','white.8','green.10','blue.10','black.13','green.11','blue.9',
   'black.12','blue.11','blue.8','white.11','white.9','red.10','black.8','red.9','blue.12','green.9'],
  ['black.15','red.17','green.15','white.16','black.14','black.16','white.15','green.16','blue.17','red.16',
   'red.15','black.17','green.17','green.14','blue.16','white.17','blue.15','red.14','white.14','blue.14'],
];
export const splendorTtsCards = faceIds.flatMap((ids, tier) => ids.map((id, cell) => ({
  key: `card.${id}`, tier: tier + 1, ttsCardId: [100, 300, 400][tier]! + cell,
})));
export const splendorTtsNobles = [
  '416cf0', '1c42e3', '51fa7b', 'f981dd', 'd80140',
  'bb8d41', 'fe03aa', 'f7ecb8', 'ecc245', 'fc5bb6',
].map((guid, index) => ({ key: `noble.${index}`, ttsGuid: guid }));
