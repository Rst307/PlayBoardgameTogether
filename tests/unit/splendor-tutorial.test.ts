import { describe, expect, it } from 'vitest';
import { DeterministicRng } from '@boardgame/game-sdk';
import { applyTutorialAction, startTutorialStep } from '@boardgame/game-sdk/tutorial';
import { splendorTutorial } from '../../games/splendor/src/client/tutorial.js';
import { splendorExtension as game } from '../../games/splendor/src/server/index.js';
import { viewSchema } from '../../games/splendor/src/shared/index.js';
import { splendorTutorialReferences } from './splendor-tutorial-reference.js';

const viewer = { kind: 'seat' as const, seatId: 'tutorial.you' };
describe('璀璨宝石交互教程', () => {
  it('matches authoritative rules, full Views and projected events through every move', () => {
    const references = splendorTutorialReferences();
    expect(references).toHaveLength(11);
    expect(splendorTutorial.steps.map(step => step.id)).toEqual(references.map(scene => scene.id));
    for (const [index, reference] of references.entries()) {
      let state = game.deserialize(game.serialize(reference.state));
      let progress = startTutorialStep(splendorTutorial, index);
      const events: unknown[] = [];
      expect(progress.frame.view).toEqual(game.getView(state, viewer));
      for (const [moveIndex, action] of reference.actions.entries()) {

        // A real, legal action that misses the teaching goal must leave the scene unchanged.
        const alternative = viewSchema.parse(progress.frame.view).legalActions.find(candidate =>
          JSON.stringify(candidate) !== JSON.stringify(action));
        if (alternative) {
          const rejected = applyTutorialAction(splendorTutorial, progress, alternative);
          expect(rejected.frame).toEqual(progress.frame);
          expect(rejected.complete).toBe(false);
          expect(rejected.feedback).not.toBe('');
        }
        const result = game.applyAction(state, { ...viewer, controllerEpoch: 0 }, action, new DeterministicRng(42));
        state = game.deserialize(game.serialize(result.state));
        events.push(...game.projectEvents(result.events, viewer));
        // Picking three gems in a different order is the same action.
        const input = action.type === 'take' ? { ...action, colors: [...action.colors].reverse() } : action;
        progress = applyTutorialAction(splendorTutorial, progress, input);
        expect(progress.frame.view).toEqual(game.getView(state, viewer));
        expect(progress.frame.events.map(raw => {
          return Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter(([key]) => key !== 'eventId'));
        })).toEqual(events);
        expect(progress.complete).toBe(moveIndex === reference.actions.length - 1);
        expect(progress.feedback.length).toBeGreaterThan(10);

      }
      expect(applyTutorialAction(splendorTutorial, progress, null)).toBe(progress);
      expect(startTutorialStep(splendorTutorial, index).frame).toEqual(splendorTutorial.steps[index]!.initial);
    }
  });

  it('rejects malformed inputs, extra authority and off-lesson choices without mutation', () => {
    const progress = startTutorialStep(splendorTutorial);
    for (const action of [null, {}, { type: 'take', colors: ['gold'] },
      { type: 'take', colors: ['white', 'blue', 'green'], seatId: 'other' },
      { type: 'take', colors: ['white', 'white', 'blue'] }]) {
      const rejected = applyTutorialAction(splendorTutorial, progress, action);
      expect(rejected.frame).toEqual(progress.frame);
      expect(rejected.complete).toBe(false);
      expect(rejected.feedback).not.toBe('');
    }
    const fresh = startTutorialStep(splendorTutorial);
    const view = viewSchema.parse(fresh.frame.view);
    fresh.frame.view = { ...view, bank: { ...view.bank, white: 0 } };
    expect(startTutorialStep(splendorTutorial)).toEqual(progress);
  });

  it('keeps reservations private and distinguishes final round from finished', () => {
    const references = splendorTutorialReferences();
    for (const index of [4, 5]) {
      const reference = references[index]!;
      const result = game.applyAction(reference.state, { ...viewer, controllerEpoch: 0 }, reference.actions[0]!, new DeterministicRng(42));
      const other = game.getView(result.state, { kind: 'seat', seatId: 'tutorial.opponent' });
      const mine = game.getView(result.state, viewer);
      expect(other.myReserved).toEqual([]);
      expect(other.players['tutorial.you']!.reservedCount).toBe(1);
      expect(JSON.stringify(game.projectEvents(result.events, viewer))).not.toContain(mine.myReserved[0]!.id);
    }
    for (const index of [9, 10]) {
      const progress = applyTutorialAction(splendorTutorial, startTutorialStep(splendorTutorial, index), references[index]!.actions[0]);
      const view = viewSchema.parse(progress.frame.view);
      expect(view.finalRound).toBe(true);
      expect(view.outcome.status).toBe(index === 9 ? 'ongoing' : 'finished');
    }
  });
});
