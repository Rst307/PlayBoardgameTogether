import { describe, expect, it } from 'vitest';
import { DeterministicRng } from '@boardgame/game-sdk';
import { applyTutorialAction, startTutorialStep } from '@boardgame/game-sdk/tutorial';
import { azulTutorial } from '../../games/azul/src/client/tutorial.js';
import { azulExtension as game } from '../../games/azul/src/server/index.js';
import { viewSchema } from '../../games/azul/src/shared/index.js';
import { azulTutorialReferences } from './azul-tutorial-reference.js';

const viewer = { kind: 'seat' as const, seatId: 'tutorial.you' };
describe('花砖物语交互教程', () => {
  it('matches full authoritative Views and projected events for all eight lessons', () => {
    const references = azulTutorialReferences();
    expect(references).toHaveLength(8);
    expect(azulTutorial.steps.map(step => step.id)).toEqual(references.map(scene => scene.id));
    for (const [index, reference] of references.entries()) {
      const state = game.deserialize(game.serialize(reference.state));
      const progress = startTutorialStep(azulTutorial, index);
      expect(progress.frame.view).toEqual(game.getView(state, viewer));
      const alternative = viewSchema.parse(progress.frame.view).legalActions.find(candidate =>
        JSON.stringify(candidate) !== JSON.stringify(reference.action));
      expect(alternative).toBeDefined();
      const rejected = applyTutorialAction(azulTutorial, progress, alternative);
      expect(rejected.frame).toEqual(progress.frame);
      expect(rejected.complete).toBe(false);
      expect(rejected.feedback).not.toBe('');
      const result = game.applyAction(state, { ...viewer, controllerEpoch: 0 }, reference.action, new DeterministicRng(42));
      const next = game.deserialize(game.serialize(result.state));
      const complete = applyTutorialAction(azulTutorial, progress, reference.action);
      expect(complete.frame.view).toEqual(game.getView(next, viewer));
      expect(complete.frame.events.map(raw => Object.fromEntries(
        Object.entries(raw as Record<string, unknown>).filter(([key]) => key !== 'eventId'),
      ))).toEqual(game.projectEvents(result.events, viewer));
      expect(complete.complete).toBe(true);
      expect(complete.feedback.length).toBeGreaterThan(20);
      expect(applyTutorialAction(azulTutorial, complete, null)).toBe(complete);
      expect(startTutorialStep(azulTutorial, index).frame).toEqual(azulTutorial.steps[index]!.initial);
      for (const forbidden of ['bag', 'discard', 'schemaVersion']) {
        expect(complete.frame.view).not.toHaveProperty(forbidden);
        expect(progress.frame.view).not.toHaveProperty(forbidden);
      }
    }
  });

  it('rejects malformed and forged inputs and isolates restarted scenes', () => {
    const progress = startTutorialStep(azulTutorial);
    for (const action of [null, {}, { type: 'draft', source: 0, color: 'gold', row: 1 },
      { type: 'draft', source: 0, color: 'blue', row: 1, seatId: 'other' },
      { type: 'draft', source: 8, color: 'blue', row: 1 }]) {
      const rejected = applyTutorialAction(azulTutorial, progress, action);
      expect(rejected.frame).toEqual(progress.frame);
      expect(rejected.complete).toBe(false);
    }
    const fresh = startTutorialStep(azulTutorial);
    const view = viewSchema.parse(fresh.frame.view);
    view.players[viewer.seatId]!.score = 999;
    fresh.frame.view = view;
    expect(startTutorialStep(azulTutorial)).toEqual(progress);
  });

  it('teaches cross scoring, zero floor, carryover and all final bonuses accurately', () => {
    const results = azulTutorialReferences().map((scene, index) => viewSchema.parse(
      applyTutorialAction(azulTutorial, startTutorialStep(azulTutorial, index), scene.action).frame.view,
    ));
    expect(results[4]!.players[viewer.seatId]!.lines[4]).toEqual({ color: 'red', count: 2 });
    expect(results[5]!.lastRound[0]!.points).toBe(6);
    expect(results[6]!.players[viewer.seatId]!.score).toBe(0);
    expect(results[6]!.currentSeatId).toBe(viewer.seatId);
    expect(results[7]!.lastRound.map(step => step.points)).toEqual([10, 2, 21, 10]);
    expect(results[7]!.outcome).toEqual({ status: 'finished', scores: {
      'tutorial.you': 53, 'tutorial.opponent': 0,
    }, winners: [viewer.seatId] });
  });
});
