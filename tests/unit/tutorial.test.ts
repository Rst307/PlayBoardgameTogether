import { describe, expect, it } from 'vitest';
import { DeterministicRng } from '@boardgame/game-sdk';
import { applyTutorialAction, startTutorialStep, type GameTutorial } from '@boardgame/game-sdk/tutorial';
import { colorMatchTutorial } from '../../games/color-match/src/client/tutorial.js';
import { colorMatchExtension, type ColorState } from '@boardgame/color-match/server';
import { colors, publicEventSchema, viewSchema, type Card, type ColorAction } from '@boardgame/color-match/shared';

function referenceScene(index: number): ColorState {
  const view = viewSchema.parse(colorMatchTutorial.steps[index]!.initial.view);
  const me = view.viewingSeatId;
  const opponent = view.seats[1]!;
  const cards: Card[] = colors.flatMap(color => Array.from({ length: 5 }, (_, i) => ({
    id: `card.${color}.${i + 1}.0`, contentId: `card.${color}.${i + 1}`, color, number: i + 1,
  })));
  const remaining = cards.filter(card => card.id !== view.topCard.id && !view.myHand.some(item => item.id === card.id));
  const drawn = remaining.find(card => card.id === 'card.yellow.2.0') ?? remaining.at(-1)!;
  const opponents = remaining.filter(card => card.id !== drawn.id).slice(0, 3);
  const deck = remaining.filter(card => card.id !== drawn.id && !opponents.includes(card)).slice(0, 11);
  deck.push(drawn);
  return {
    schemaVersion: 1, seats: view.seats, deck, hands: { [me]: view.myHand, [opponent]: opponents },
    discardPile: [view.topCard], currentPlayerId: me, phase: 'play',
    winner: null, winners: [], emptyDrawStreak: 0,
  };
}

describe('optional interactive tutorials', () => {
  it('matches real Color Match rules and projected events through all five lessons', () => {
    for (let index = 0; index < colorMatchTutorial.steps.length; index++) {
      let progress = startTutorialStep(colorMatchTutorial, index);
      let state = referenceScene(index);
      const viewer = { kind: 'seat' as const, seatId: state.seats[0]! };
      const actor = { ...viewer, controllerEpoch: 0 };
      const rng = new DeterministicRng(42);
      const events: unknown[] = [];
      expect(progress.frame.view).toEqual(colorMatchExtension.getView(state, viewer));
      for (let turn = 0; turn < 2 && !progress.complete; turn++) {
        const view = viewSchema.parse(progress.frame.view);
        const action: ColorAction = view.phase === 'choose_target'
          ? { type: 'choose_target', targetSeatId: view.targetSeatIds[0]! }
          : view.legalCardIds.length ? { type: 'play_card', cardId: view.legalCardIds[0]! } : { type: 'draw_card' };
        colorMatchExtension.validateAction(state, actor, action);
        const result = colorMatchExtension.applyAction(state, actor, action, rng);
        state = result.state;
        events.push(...colorMatchExtension.projectEvents(result.events, viewer));
        progress = applyTutorialAction(colorMatchTutorial, progress, action);
        expect(progress.frame.view).toEqual(colorMatchExtension.getView(state, viewer));
        expect(progress.frame.events.map(raw => {
          return Object.fromEntries(Object.entries(publicEventSchema.parse(raw)).filter(([key]) => key !== 'eventId'));
        })).toEqual(events);
      }
      expect(progress.complete).toBe(true);
      expect(progress.feedback.length).toBeGreaterThan(10);
    }
  });

  it('rejects malformed, unexpected and wrong-target actions without advancing practice', () => {
    const initial = startTutorialStep(colorMatchTutorial);
    for (const action of [null, { type: 'draw_card' }, { type: 'play_card', cardId: 'missing' }]) {
      const rejected = applyTutorialAction(colorMatchTutorial, initial, action);
      expect(rejected.frame).toEqual(initial.frame);
      expect(rejected.complete).toBe(false);
      expect(rejected.feedback).not.toBe('');
    }
    let target = startTutorialStep(colorMatchTutorial, 3);
    target = applyTutorialAction(colorMatchTutorial, target, { type: 'play_card', cardId: 'card.blue.5.0' });
    expect(target.complete).toBe(false);
    const rejected = applyTutorialAction(colorMatchTutorial, target, { type: 'choose_target', targetSeatId: 'tutorial.you' });
    expect(rejected.frame).toEqual(target.frame);
    expect(rejected.complete).toBe(false);
  });

  it('retries from fresh data and ignores actions after successful completion', () => {
    const initial = startTutorialStep(colorMatchTutorial);
    const completed = applyTutorialAction(colorMatchTutorial, initial, { type: 'play_card', cardId: 'card.red.3.0' });
    expect(applyTutorialAction(colorMatchTutorial, completed, { type: 'draw_card' })).toBe(completed);
    expect(startTutorialStep(colorMatchTutorial)).toEqual(initial);
    expect(() => startTutorialStep(colorMatchTutorial, 99)).toThrow('unavailable');
  });

  it('isolates rejected mutations from author code', () => {
    const tutorial: GameTutorial = { title: 'test', description: 'test', steps: [{
      id: 'practice', title: 'practice', instruction: 'practice', initial: { view: { score: 0 }, events: [] },
      onAction({ frame }) {
        frame.events.push('should not escape');
        return { accepted: false, feedback: 'retry' };
      },
    }] };
    const initial = startTutorialStep(tutorial);
    expect(applyTutorialAction(tutorial, initial, {}).frame.events).toEqual([]);
    expect(tutorial.steps[0]!.initial.events).toEqual([]);
  });
});
