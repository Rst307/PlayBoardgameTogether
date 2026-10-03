import { describe, expect, it } from 'vitest';
import { DeterministicRng } from '@boardgame/game-sdk';
import { azulExtension as game } from '../../games/azul/src/server/index.js';
import { impactScore, scoreImpacts, scoreTiming, settlementFloors } from '../../games/azul/src/client/scoring.js';
import { azulTutorialReferences } from './azul-tutorial-reference.js';

const viewer = { kind: 'seat' as const, seatId: 'tutorial.you' };
function steps(index: number) {
  const scene = azulTutorialReferences()[index]!;
  return game.applyAction(scene.state, { ...viewer, controllerEpoch: 0 }, scene.action, new DeterministicRng(42)).state.lastRound;
}
describe('花砖分步计分表现', () => {
  it('keeps the last central draft and first marker on the floor until scoring completes', () => {
    const scene = azulTutorialReferences()[6]!;
    const before = game.getView(scene.state, viewer);
    const result = game.applyAction(scene.state, { ...viewer, controllerEpoch: 0 }, scene.action, new DeterministicRng(42));
    const events = game.projectEvents(result.events, viewer);
    const floor = settlementFloors(before, { ...events[0], eventId: 'last-draft' })[viewer.seatId];
    expect(floor).toEqual(['yellow', 'yellow', 'first', 'red']);
    expect(result.state.lastRound[0]).toMatchObject({ kind: 'floor', points: -6, from: 1, total: 0 });
    expect(game.getView(result.state, viewer).players[viewer.seatId]!.floor).toEqual([]);
    expect(before.players[viewer.seatId]!.floor).toEqual(['yellow', 'yellow']);
  });
  it('preserves overflow and avoids replaying a draft already present in a public snapshot', () => {
    const scene = azulTutorialReferences()[2]!;
    const before = game.getView(scene.state, viewer);
    const result = game.applyAction(scene.state, { ...viewer, controllerEpoch: 0 }, scene.action, new DeterministicRng(42));
    const draft = { ...game.projectEvents(result.events, viewer)[0], eventId: 'overflow' };
    const after = game.getView(result.state, viewer);
    expect(settlementFloors(before, draft)[viewer.seatId]).toEqual(after.players[viewer.seatId]!.floor);
    expect(settlementFloors(after, draft)[viewer.seatId]).toEqual(['blue']);
    expect(settlementFloors(before, { ...draft, color: 'unknown' })[viewer.seatId]).toEqual([]);
  });
  it('caps the visual floor at seven slots including the first marker', () => {
    const scene = azulTutorialReferences()[6]!;
    scene.state.players[viewer.seatId]!.floor = Array(6).fill('yellow');
    const before = game.getView(scene.state, viewer);
    const result = game.applyAction(scene.state, { ...viewer, controllerEpoch: 0 }, scene.action, new DeterministicRng(42));
    const draft = { ...game.projectEvents(result.events, viewer)[0], eventId: 'full-floor' };
    expect(settlementFloors(before, draft)[viewer.seatId]).toEqual([...Array(6).fill('yellow'), 'first']);
    expect(result.state.lastRound[0]).toMatchObject({ kind: 'floor', points: -14, total: 0 });
  });
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
