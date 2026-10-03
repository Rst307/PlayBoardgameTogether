import { describe, expect, it } from 'vitest';
import { DeterministicRng } from '@boardgame/game-sdk';
import { splendorExtension } from '../../games/splendor/src/server/index.js';
import { selectGem } from '../../games/splendor/src/client/interaction.js';

const initial = () => {
  const state = splendorExtension.setup({ seats: ['a', 'b'], options: {}, rng: new DeterministicRng(42) }).state;
  return splendorExtension.getView(state, { kind: 'seat', seatId: 'a' });
};
describe('直接点击宝石', () => {
  it('builds both legal combinations with the same click interaction and can cancel', () => {
    const view = initial();
    const one = selectGem(view, [], 'white');
    expect(one.colors).toEqual(['white']);
    const two = selectGem(view, one.colors, 'white');
    expect(two.colors).toEqual(['white', 'white']);
    expect(two.error).toBe('');
    expect(selectGem(view, two.colors, 'white').colors).toEqual([]);
    expect(selectGem(view, ['white', 'blue'], 'green').colors).toEqual(['white', 'blue', 'green']);
    expect(selectGem(view, ['white', 'blue'], 'white').colors).toEqual(['blue']);
  });
  it('rejects illegal mixtures, fourth colors, gold and empty stock without changing the draft', () => {
    const view = initial();
    for (const [chosen, color] of [
      [['white', 'white'], 'blue'], [['white', 'blue', 'green'], 'red'], [[], 'gold'],
    ] as const) {
      const result = selectGem(view, [...chosen], color);
      expect(result.colors).toEqual(chosen);
      expect(result.error).not.toBe('');
    }
    view.bank.red = 0;
    expect(selectGem(view, [], 'red').error).toContain('库存已空');
    view.bank.white = 3;
    const result = selectGem(view, ['white'], 'white');
    expect(result.colors).toEqual(['white']);
    expect(result.error).toContain('至少需要 4');
  });
  it('uses the authoritative legal candidates when fewer than three colors remain', () => {
    const view = initial();
    view.bank.green = view.bank.red = view.bank.black = 0;
    view.legalActions = [{ type: 'take', colors: ['white', 'blue'] }];
    expect(selectGem(view, ['white'], 'blue')).toEqual({ colors: ['white', 'blue'], error: '' });
    expect(selectGem(view, ['white'], 'white').error).not.toBe('');
  });
});
