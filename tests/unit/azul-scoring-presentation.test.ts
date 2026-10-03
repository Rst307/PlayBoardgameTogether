import { describe, expect, it } from 'vitest';
import { DeterministicRng } from '@boardgame/game-sdk';
import { azulExtension as game } from '../../games/azul/src/server/index.js';
import { impactScore, scoreImpacts, scoreTiming } from '../../games/azul/src/client/scoring.js';
import { azulTutorialReferences } from './azul-tutorial-reference.js';

const viewer = { kind: 'seat' as const, seatId: 'tutorial.you' };
function steps(index: number) {
  const scene = azulTutorialReferences()[index]!;
  return game.applyAction(scene.state, { ...viewer, controllerEpoch: 0 }, scene.action, new DeterministicRng(42)).state.lastRound;
}
describe('花砖分步计分表现', () => {
  it('shows horizontal and vertical impacts separately and counts the new tile in both', () => {
    const cross = steps(5)[0]!;
    const impacts = scoreImpacts(cross);
    expect(impacts.map(hit => hit.points)).toEqual([3, 3]);
    expect(impacts[0]!.cells.every(cell => cell.row === cross.row)).toBe(true);
    expect(impacts[1]!.cells.every(cell => cell.col === cross.col)).toBe(true);
    expect([0, 1, 2].map(count => impactScore(cross, impacts, count))).toEqual([0, 3, 6]);
    // Give each term enough reading time, without the previous long settlement pause.
    expect(scoreTiming.impact).toBeGreaterThanOrEqual(600);
    const duration = scoreTiming.landing + impacts.length * scoreTiming.impact + scoreTiming.hold;
    expect(duration).toBeGreaterThanOrEqual(2200);
    expect(duration).toBeLessThanOrEqual(2800);
  });
  it('splits each completed-column bonus and preserves authoritative totals and zero floor', () => {
    const final = steps(7);
    expect(final.map(step => scoreImpacts(step).map(hit => hit.points))).toEqual([[5, 5], [2], [7, 7, 7], [10]]);
    for (const step of [...final, ...steps(6), ...steps(4)]) {
      const impacts = scoreImpacts(step);
      expect(impacts.reduce((sum, hit) => sum + hit.points, 0)).toBe(step.points);
      expect(impactScore(step, impacts, 0)).toBe(step.from);
      expect(impactScore(step, impacts, impacts.length)).toBe(step.total);
    }
    const floor = steps(6)[0]!;
    expect(floor.points).toBe(-6);
    expect(impactScore(floor, scoreImpacts(floor), 1)).toBe(0);
  });
  it('falls back to the projected amount if geometry cannot explain an event', () => {
    const cross = { ...steps(5)[0]!, points: 7, total: 7 };
    expect(scoreImpacts(cross).map(hit => hit.points)).toEqual([7]);
  });
});
