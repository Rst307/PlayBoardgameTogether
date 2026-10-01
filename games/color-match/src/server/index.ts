import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { assetManifestSchema, type GameExtension, type Json, type RandomSource, type Viewer } from '@boardgame/game-sdk';
import { actionSchema, cardSchema, colors, manifest, optionsSchema, viewSchema, type Card, type ColorAction, type ColorEvent, type ColorView } from '../shared/index.js';

export const colorAssetManifest = assetManifestSchema.parse(JSON.parse(readFileSync(new URL('../../assets/manifest.json', import.meta.url), 'utf8')));
const stateSchema = z.object({
  schemaVersion: z.literal(1), seats: z.array(z.string()).min(2).max(4),
  deck: z.array(cardSchema), hands: z.record(z.string(), z.array(cardSchema)),
  discardPile: z.array(cardSchema).min(1), currentPlayerId: z.string().nullable(),
  phase: z.enum(['play', 'choose_target', 'finished']), winner: z.string().nullable(),
  winners: z.array(z.string()), emptyDrawStreak: z.number().int().nonnegative(),
}).strict();
export type ColorState = z.infer<typeof stateSchema>;
type InternalEvent = ColorEvent & { scope: 'public' };

function shuffle(cards: Card[], rng: RandomSource): Card[] {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i + 1);
    [cards[i], cards[j]] = [cards[j]!, cards[i]!];
  }
  return cards;
}
function top(state: ColorState): Card { return state.discardPile.at(-1)!; }
function nextSeat(state: ColorState, seatId: string): string { return state.seats[(state.seats.indexOf(seatId) + 1) % state.seats.length]!; }
function assertViewer(state: ColorState, viewer: Viewer): string {
  if (viewer.kind !== 'seat' || !state.seats.includes(viewer.seatId)) throw new Error('Unknown seat');
  return viewer.seatId;
}
function legal(state: ColorState, card: Card): boolean { const current = top(state); return card.color === current.color || card.number === current.number; }
function draw(state: ColorState, seatId: string, rng: RandomSource): number {
  if (state.deck.length === 0 && state.discardPile.length > 1) {
    const current = state.discardPile.pop()!;
    state.deck = shuffle(state.discardPile.splice(0), rng);
    state.discardPile.push(current);
  }
  const card = state.deck.pop();
  if (card) state.hands[seatId]!.push(card);
  return card ? 1 : 0;
}

export const colorMatchExtension: GameExtension<ColorState, Record<string, never>, ColorAction, ColorView, InternalEvent, ColorEvent> = {
  manifest,
  validateOptions: value => optionsSchema.parse(value),
  parseAction: value => actionSchema.parse(value),
  setup({ seats, rng }) {
    if (seats.length < 2 || seats.length > 4 || new Set(seats).size !== seats.length) throw new Error('Color Match needs 2–4 unique seats');
    const deck: Card[] = [];
    for (const color of colors) for (let number = 1; number <= 5; number++) for (let copy = 0; copy < 2; copy++) {
      deck.push({ id: `card.${color}.${number}.${copy}`, contentId: `card.${color}.${number}`, color, number });
    }
    shuffle(deck, rng);
    const hands: Record<string, Card[]> = {};
    for (const seatId of seats) hands[seatId] = Array.from({ length: 5 }, () => deck.pop()!);
    const state: ColorState = { schemaVersion: 1, seats: [...seats], deck, hands,
      discardPile: [deck.pop()!], currentPlayerId: seats[0]!, phase: 'play', winner: null,
      winners: [], emptyDrawStreak: 0 };
    return { state, events: [] };
  },
  getView(state, viewer) {
    const seatId = assertViewer(state, viewer);
    const isTurn = state.currentPlayerId === seatId;
    return viewSchema.parse({ seats: state.seats, viewingSeatId: seatId, myHand: state.hands[seatId],
      handCounts: Object.fromEntries(state.seats.map(id => [id, state.hands[id]!.length])),
      topCard: top(state), deckCount: state.deck.length, currentPlayerId: state.currentPlayerId,
      phase: state.phase, winner: state.winner, winners: state.winners,
      legalCardIds: isTurn && state.phase === 'play' ? state.hands[seatId]!.filter(card => legal(state, card)).map(card => card.id) : [],
      canDraw: isTurn && state.phase === 'play',
      targetSeatIds: isTurn && state.phase === 'choose_target' ? state.seats.filter(id => id !== seatId) : [],
    });
  },
  getActionSpec(state, viewer) {
    const view = this.getView(state, viewer);
    return { legalCardIds: view.legalCardIds, canDraw: view.canDraw, targetSeatIds: view.targetSeatIds };
  },
  getDecisionContext(state, viewer) {
    const view = this.getView(state, viewer);
    const legalActions: ColorAction[] = [
      ...view.legalCardIds.map(cardId => ({ type: 'play_card' as const, cardId })),
      ...(view.canDraw ? [{ type: 'draw_card' as const }] : []),
      ...view.targetSeatIds.map(targetSeatId => ({ type: 'choose_target' as const, targetSeatId })),
    ];
    if (!legalActions.length) return null;
    return { decisionKey: `${view.phase}:${view.currentPlayerId}`, legalActions };
  },
  validateAction(state, actor, action) {
    if (actor.kind !== 'seat' || !state.seats.includes(actor.seatId)) throw new Error('Unknown actor');
    if (state.phase === 'finished') throw new Error('Game has finished');
    if (state.currentPlayerId !== actor.seatId) throw new Error('It is not your turn');
    if (state.phase === 'choose_target') {
      if (action.type !== 'choose_target' || !state.seats.includes(action.targetSeatId) || action.targetSeatId === actor.seatId) throw new Error('Invalid target');
      return;
    }
    if (action.type === 'draw_card') return;
    if (action.type !== 'play_card') throw new Error('Choose a card or draw');
    const card = state.hands[actor.seatId]!.find(item => item.id === action.cardId);
    if (!card || !legal(state, card)) throw new Error('Card is unavailable or does not match');
  },
  applyAction(state, actor, action, rng) {
    this.validateAction(state, actor, action);
    if (actor.kind !== 'seat') throw new Error('Seat actor required');
    const next = structuredClone(state);
    const seatId = actor.seatId;
    const events: InternalEvent[] = [];
    if (action.type === 'play_card') {
      const index = next.hands[seatId]!.findIndex(card => card.id === action.cardId);
      const [card] = next.hands[seatId]!.splice(index, 1);
      next.discardPile.push(card!);
      events.push({ scope: 'public', type: 'card.played', seatId, card: card! });
      next.emptyDrawStreak = 0;
      if (card!.number === 5) next.phase = 'choose_target';
      else if (next.hands[seatId]!.length === 0) {
        next.phase = 'finished'; next.winner = seatId; next.winners = [seatId]; next.currentPlayerId = null;
        events.push({ scope: 'public', type: 'game.win', seatId });
      }
      else next.currentPlayerId = nextSeat(next, seatId);
    } else if (action.type === 'draw_card') {
      const count = draw(next, seatId, rng);
      events.push({ scope: 'public', type: 'card.draw', seatId, count });
      next.emptyDrawStreak = count === 0 ? next.emptyDrawStreak + 1 : 0;
      if (next.emptyDrawStreak >= next.seats.length) {
        const minimum = Math.min(...next.seats.map(id => next.hands[id]!.length));
        next.winners = next.seats.filter(id => next.hands[id]!.length === minimum);
        next.winner = next.winners.length === 1 ? next.winners[0]! : null;
        next.phase = 'finished'; next.currentPlayerId = null;
        for (const winner of next.winners) events.push({ scope: 'public', type: 'game.win', seatId: winner });
      } else next.currentPlayerId = nextSeat(next, seatId);
    } else {
      const count = draw(next, action.targetSeatId, rng);
      events.push({ scope: 'public', type: 'target.chosen', seatId, targetSeatId: action.targetSeatId });
      events.push({ scope: 'public', type: 'card.draw', seatId: action.targetSeatId, count });
      if (next.hands[seatId]!.length === 0) {
        next.phase = 'finished'; next.winner = seatId; next.winners = [seatId]; next.currentPlayerId = null;
        events.push({ scope: 'public', type: 'game.win', seatId });
      } else {
        next.phase = 'play'; next.currentPlayerId = nextSeat(next, seatId);
      }
    }
    return { state: next, events };
  },
  projectEvents(events) { return events.map(event => {
    switch (event.type) {
      case 'card.played': return { type: event.type, seatId: event.seatId, card: event.card };
      case 'card.draw': return { type: event.type, seatId: event.seatId, count: event.count };
      case 'target.chosen': return { type: event.type, seatId: event.seatId, targetSeatId: event.targetSeatId };
      case 'game.win': return { type: event.type, seatId: event.seatId };
    }
  }); },
  getOutcome(state) { return state.phase === 'finished' ? { status: 'finished', winners: state.winners } : { status: 'ongoing' }; },
  serialize(state): Json { return state as unknown as Json; },
  deserialize(value) { return stateSchema.parse(value); },
  getFallbackAction(view) {
    if (view.targetSeatIds.length) return { type: 'choose_target', targetSeatId: view.targetSeatIds[0]! };
    if (view.legalCardIds.length) return { type: 'play_card', cardId: view.legalCardIds[0]! };
    return view.canDraw ? { type: 'draw_card' } : null;
  },
};

export function decideBasicColorMatch(input: { view: ColorView; legalActions: readonly ColorAction[] }): ColorAction {
  const targets = input.legalActions.filter((action): action is Extract<ColorAction, { type: 'choose_target' }> => action.type === 'choose_target');
  if (targets.length) return [...targets].sort((a, b) =>
    (input.view.handCounts[a.targetSeatId] ?? 0) - (input.view.handCounts[b.targetSeatId] ?? 0) ||
    input.view.seats.indexOf(a.targetSeatId) - input.view.seats.indexOf(b.targetSeatId))[0]!;
  const plays = input.legalActions.filter((action): action is Extract<ColorAction, { type: 'play_card' }> => action.type === 'play_card');
  if (plays.length) return [...plays].sort((a, b) => {
    const ac = input.view.myHand.find(card => card.id === a.cardId)!;
    const bc = input.view.myHand.find(card => card.id === b.cardId)!;
    const aFuture = input.view.myHand.filter(card => card.id !== ac.id && card.color === ac.color).length;
    const bFuture = input.view.myHand.filter(card => card.id !== bc.id && card.color === bc.color).length;
    return bFuture - aFuture || ac.color.localeCompare(bc.color) || ac.number - bc.number || ac.id.localeCompare(bc.id);
  })[0]!;
  const draw = input.legalActions.find((action): action is Extract<ColorAction, { type: 'draw_card' }> => action.type === 'draw_card');
  if (draw) return draw;
  throw new Error('No legal Color Match action');
}
