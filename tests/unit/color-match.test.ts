import { describe, expect, it } from 'vitest';
import { DeterministicRng } from '@boardgame/game-sdk';
import { colorMatchExtension, decideBasicColorMatch, type ColorState } from '../../games/color-match/src/server/index.js';

const seats = ['a', 'b', 'c', 'd'];
const actor = (seatId: string) => ({ kind: 'seat' as const, seatId, controllerEpoch: 0 });
const viewer = (seatId: string) => ({ kind: 'seat' as const, seatId });

describe('Color Match rules', () => {
  it('deals exactly forty distinct cards, keeps hands private, and replays a seed', () => {
    const first = colorMatchExtension.setup({ seats, options: {}, rng: new DeterministicRng(123) }).state;
    const second = colorMatchExtension.setup({ seats, options: {}, rng: new DeterministicRng(123) }).state;
    expect(first).toEqual(second);
    expect(first.deck.length).toBe(19);
    expect(first.discardPile).toHaveLength(1);
    const all = [...first.deck, ...first.discardPile, ...seats.flatMap(seat => first.hands[seat]!)];
    expect(all).toHaveLength(40);
    expect(new Set(all.map(card => card.id)).size).toBe(40);
    const a = colorMatchExtension.getView(first, viewer('a'));
    const b = colorMatchExtension.getView(first, viewer('b'));
    expect(a.myHand).toEqual(first.hands.a);
    expect(b.myHand).toEqual(first.hands.b);
    expect(JSON.stringify(a)).not.toContain(first.hands.b![0]!.id);
    expect(JSON.stringify(a)).not.toContain(first.deck[0]!.id);
    expect(colorMatchExtension.deserialize(colorMatchExtension.serialize(first))).toEqual(first);
  });

  it('rejects other turns, forged cards and mismatches without changing state', () => {
    const state = colorMatchExtension.setup({ seats: seats.slice(0, 2), options: {}, rng: new DeterministicRng(2) }).state;
    const before = structuredClone(state);
    expect(() => colorMatchExtension.applyAction(state, actor('b'), { type: 'draw_card' }, new DeterministicRng(9))).toThrow();
    expect(() => colorMatchExtension.applyAction(state, actor('a'), { type: 'play_card', cardId: 'forged' }, new DeterministicRng(9))).toThrow();
    const illegal = state.hands.a!.find(card => card.color !== state.discardPile[0]!.color && card.number !== state.discardPile[0]!.number);
    if (illegal) expect(() => colorMatchExtension.applyAction(state, actor('a'), { type: 'play_card', cardId: illegal.id }, new DeterministicRng(9))).toThrow();
    expect(state).toEqual(before);
  });

  it('plays a matching card, resolves a five target once, and advances the turn', () => {
    const state = colorMatchExtension.setup({ seats: seats.slice(0, 3), options: {}, rng: new DeterministicRng(4) }).state;
    state.discardPile.push({ id: 'test.top', contentId: 'card.red.5', color: 'red', number: 5 });
    state.hands.a = [{ id: 'test.five', contentId: 'card.red.5', color: 'red', number: 5 }, ...state.hands.a!];
    const played = colorMatchExtension.applyAction(state, actor('a'), { type: 'play_card', cardId: 'test.five' }, new DeterministicRng(5));
    expect(played.state.phase).toBe('choose_target');
    expect(played.state.currentPlayerId).toBe('a');
    expect(() => colorMatchExtension.applyAction(played.state, actor('a'), { type: 'choose_target', targetSeatId: 'a' }, new DeterministicRng(5))).toThrow();
    const prior = played.state.hands.c!.length;
    const chosen = colorMatchExtension.applyAction(played.state, actor('a'), { type: 'choose_target', targetSeatId: 'c' }, new DeterministicRng(5));
    expect(chosen.state.hands.c).toHaveLength(prior + 1);
    expect(chosen.state.phase).toBe('play');
    expect(chosen.state.currentPlayerId).toBe('b');
    expect(chosen.events.map(event => event.type)).toEqual(['target.chosen', 'card.draw']);
  });

  it('persists a winner on the last card and refuses later actions', () => {
    const state: ColorState = colorMatchExtension.setup({ seats: seats.slice(0, 2), options: {}, rng: new DeterministicRng(3) }).state;
    state.hands.a = [{ id: 'last', contentId: `card.${state.discardPile[0]!.color}.1`, color: state.discardPile[0]!.color, number: 1 }];
    const won = colorMatchExtension.applyAction(state, actor('a'), { type: 'play_card', cardId: 'last' }, new DeterministicRng(3));
    expect(won.state.winner).toBe('a');
    expect(won.state.phase).toBe('finished');
    expect(won.events.at(-1)?.type).toBe('game.win');
    expect(() => colorMatchExtension.applyAction(won.state, actor('b'), { type: 'draw_card' }, new DeterministicRng(3))).toThrow();
  });

  it('resolves a final five before winning and settles consecutive empty-deck skips with ties', () => {
    const initial = colorMatchExtension.setup({ seats: seats.slice(0, 2), options: {}, rng: new DeterministicRng(11) }).state;
    initial.hands.a = [{ id: 'last-five', contentId: `card.${initial.discardPile[0]!.color}.5`, color: initial.discardPile[0]!.color, number: 5 }];
    const played = colorMatchExtension.applyAction(initial, actor('a'),
      { type: 'play_card', cardId: 'last-five' }, new DeterministicRng(11));
    expect(played.state.phase).toBe('choose_target');
    expect(played.state.winner).toBeNull();
    const resolved = colorMatchExtension.applyAction(played.state, actor('a'),
      { type: 'choose_target', targetSeatId: 'b' }, new DeterministicRng(11));
    expect(resolved.state.phase).toBe('finished');
    expect(resolved.state.winners).toEqual(['a']);
    expect(resolved.events.at(-1)?.type).toBe('game.win');

    const empty = structuredClone(initial);
    empty.deck = [];
    empty.discardPile = [empty.discardPile.at(-1)!];
    empty.hands.a = [{ id: 'a-only', contentId: 'card.red.1', color: 'red', number: 1 }];
    empty.hands.b = [{ id: 'b-only', contentId: 'card.blue.2', color: 'blue', number: 2 }];
    const first = colorMatchExtension.applyAction(empty, actor('a'), { type: 'draw_card' }, new DeterministicRng(11));
    expect(first.state.phase).toBe('play');
    const final = colorMatchExtension.applyAction(first.state, actor('b'), { type: 'draw_card' }, new DeterministicRng(11));
    expect(final.state.phase).toBe('finished');
    expect(final.state.winners).toEqual(['a', 'b']);
  });

  it('lets four seats finish a complete deterministic game without losing cards', () => {
    const rng = new DeterministicRng(27);
    let state = colorMatchExtension.setup({ seats, options: {}, rng }).state;
    for (let turn = 0; turn < 1000 && state.phase !== 'finished'; turn++) {
      const active = state.currentPlayerId!;
      const view = colorMatchExtension.getView(state, viewer(active));
      const action = view.phase === 'choose_target'
        ? { type: 'choose_target' as const, targetSeatId: view.targetSeatIds[0]! }
        : view.legalCardIds.length
          ? { type: 'play_card' as const, cardId: view.legalCardIds[0]! }
          : { type: 'draw_card' as const };
      state = colorMatchExtension.applyAction(state, actor(active), action, rng).state;
      const ids = [...state.deck, ...state.discardPile, ...seats.flatMap(seat => state.hands[seat]!)].map(card => card.id);
      expect(ids).toHaveLength(40);
      expect(new Set(ids).size).toBe(40);
    }
    expect(state.phase).toBe('finished');
    expect(seats).toContain(state.winner);
  });

  it('enumerates every current legal action and the basic policy only uses the private view', () => {
    const first=colorMatchExtension.setup({seats:seats.slice(0,2),options:{},rng:new DeterministicRng(41)}).state;
    const second=structuredClone(first);second.deck.reverse();second.hands.b!.reverse();
    const firstView=colorMatchExtension.getView(first,viewer('a'));const secondView=colorMatchExtension.getView(second,viewer('a'));
    expect(secondView).toEqual(firstView);
    const firstDecision=colorMatchExtension.getDecisionContext!(first,viewer('a'))!;
    const secondDecision=colorMatchExtension.getDecisionContext!(second,viewer('a'))!;
    expect(secondDecision.legalActions).toEqual(firstDecision.legalActions);
    expect(decideBasicColorMatch({view:firstView,legalActions:firstDecision.legalActions}))
      .toEqual(decideBasicColorMatch({view:secondView,legalActions:secondDecision.legalActions}));
    for(const action of firstDecision.legalActions)expect(()=>colorMatchExtension.validateAction(first,actor('a'),action)).not.toThrow();
  });
});
