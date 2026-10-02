import { describe, expect, it } from 'vitest';
import { assetContractSchema } from '@boardgame/game-sdk/assets';
import { splendorAssetContract, splendorTtsCards, splendorTtsNobles } from '../../games/splendor/src/shared/assets.js';
import { cards, nobles } from '../../games/splendor/src/shared/catalog.js';

describe('Splendor replaceable art', () => {
  it('covers exactly the base-game faces, nobles, tier backs and six tokens', () => {
    expect(assetContractSchema.parse(splendorAssetContract).gameId).toBe('splendor.base');
    const keys = splendorAssetContract.slots.map(slot => slot.key);
    expect(new Set(keys).size).toBe(109);
    expect(keys).toEqual(expect.arrayContaining([...cards, ...nobles].map(item => item.id)));
    expect(splendorAssetContract.slots.every(slot => !slot.required)).toBe(true);
  });
  it('maps each used TTS grid cell and noble exactly once, with the correct tier', () => {
    expect(splendorTtsCards.map(item => item.key).sort()).toEqual(cards.map(card => card.id).sort());
    expect(new Set(splendorTtsCards.map(item => item.ttsCardId)).size).toBe(90);
    for (const mapping of splendorTtsCards) {
      expect(cards.find(card => card.id === mapping.key)?.tier).toBe(mapping.tier);
    }
    expect(splendorTtsNobles.map(item => item.key).sort()).toEqual(nobles.map(noble => noble.id).sort());
    expect(new Set(splendorTtsNobles.map(item => item.ttsGuid)).size).toBe(10);
    // Distinctive visually reviewed faces guard against shuffled deck order/off-by-one.
    expect(splendorTtsCards.find(item => item.ttsCardId === 100)?.key).toBe('card.red.6');
    expect(splendorTtsCards.find(item => item.ttsCardId === 328)?.key).toBe('card.blue.12');
    expect(splendorTtsCards.find(item => item.ttsCardId === 419)?.key).toBe('card.blue.14');
    expect(splendorTtsNobles.find(item => item.ttsGuid === '51fa7b')?.key).toBe('noble.2');
  });
});
