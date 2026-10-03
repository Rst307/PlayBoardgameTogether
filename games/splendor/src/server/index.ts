import { z } from 'zod';
import type { Actor, GameExtension, Json, RandomSource, Viewer } from '@boardgame/game-sdk';
import {
  actionSchema, bonuses, colors, countTokens, emptyTokens, manifest, optionsSchema,
  outcomeSchema, paymentFor, tokenColors, tokensSchema, viewSchema,
  type Card, type SplendorAction, type SplendorView, type Tokens,
} from '../shared/index.js';
import { cards, cardById, nobles, nobleById } from '../shared/catalog.js';

const stateSchema = z.object({
  schemaVersion: z.literal(1), seats: z.array(z.string()).min(2).max(4),
  turn: z.number().int().nonnegative(), phase: z.enum(['action', 'return', 'noble', 'finished']),
  finalRound: z.boolean(), passes: z.number().int().nonnegative().max(4),
  bank: tokensSchema, decks: z.array(z.array(z.string())).length(3),
  market: z.array(z.array(z.string()).max(4)).length(3), nobles: z.array(z.string()),
  players: z.record(z.string(), z.object({
    tokens: tokensSchema, purchased: z.array(z.string()), reserved: z.array(z.string()).max(3),
    nobles: z.array(z.string()),
  }).strict()), outcome: outcomeSchema,
}).strict();
export type SplendorState = z.infer<typeof stateSchema>;
type Event = { type: 'turn.played'; seatId: string; action: SplendorAction['type']; cardId?: string }
  | { type: 'noble.arrived'; seatId: string; nobleId: string }
  | { type: 'match.finished'; winners: string[] };
type InternalEvent = { public: Event };
export const splendorAssetManifest = {
  id: 'splendor.original', version: '1.0.0', language: 'zh-CN', assets: [],
};
const current = (state: SplendorState) => state.seats[state.turn % state.seats.length]!;
const ownedCards = (state: SplendorState, seat: string) => state.players[seat]!.purchased.map(cardById);
const score = (state: SplendorState, seat: string) =>
  ownedCards(state, seat).reduce((sum, card) => sum + card.points, 0) + state.players[seat]!.nobles.length * 3;
function eligibleNobles(state: SplendorState, seat: string) {
  const discount = bonuses(ownedCards(state, seat));
  return state.nobles.filter(id => colors.every(color => discount[color] >= nobleById(id).requirement[color]));
}
function shuffle<T>(items: T[], rng: RandomSource) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i + 1);
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
// Enumerate all exact payments, including voluntarily spending gold.
function payments(card: Card, discount: ReturnType<typeof bonuses>, tokens: Tokens): Tokens[] {
  if (!paymentFor(card, discount, tokens)) return [];
  const result: Tokens[] = [];
  const visit = (index: number, payment: Tokens) => {
    if (index === colors.length) { result.push(payment); return; }
    const color = colors[index]!, need = Math.max(0, card.cost[color] - discount[color]);
    for (let gold = Math.max(0, need - tokens[color]); gold <= Math.min(need, tokens.gold - payment.gold); gold++) {
      visit(index + 1, { ...payment, [color]: need - gold, gold: payment.gold + gold });
    }
  };
  visit(0, emptyTokens());
  return result;
}
function legalActions(state: SplendorState, seat: string): SplendorAction[] {
  if (state.phase === 'finished' || seat !== current(state)) return [];
  const player = state.players[seat]!;
  if (state.phase === 'return') return tokenColors.filter(color => player.tokens[color] > 0).map(color => ({ type: 'return', color }));
  if (state.phase === 'noble') return eligibleNobles(state, seat).map(nobleId => ({ type: 'noble', nobleId }));
  const result: SplendorAction[] = [];
  const available = colors.filter(color => state.bank[color] > 0);
  if (available.length <= 3 && available.length) result.push({ type: 'take', colors: available });
  else {
    for (let a = 0; a < available.length; a++)
      for (let b = a + 1; b < available.length; b++)
        for (let c = b + 1; c < available.length; c++)
          result.push({ type: 'take', colors: [available[a]!, available[b]!, available[c]!] });
  }
  for (const color of colors) if (state.bank[color] >= 4) result.push({ type: 'take', colors: [color, color] });
  const visible = state.market.flat();
  if (player.reserved.length < 3) {
    for (const cardId of visible) result.push({ type: 'reserve', cardId });
    for (let i = 0; i < 3; i++) if (state.decks[i]!.length) result.push({ type: 'reserve_deck', tier: i + 1 });
  }
  const discount = bonuses(ownedCards(state, seat));
  for (const cardId of [...visible, ...player.reserved])
    for (const payment of payments(cardById(cardId), discount, player.tokens)) result.push({ type: 'buy', cardId, payment });
  return result.length ? result : [{ type: 'pass' }];
}
function actionEquals(a: SplendorAction, b: SplendorAction) {
  if (a.type !== b.type) return false;
  if (a.type === 'take' && b.type === 'take')
    return [...a.colors].sort().join(',') === [...b.colors].sort().join(',');
  if (a.type === 'buy' && b.type === 'buy')
    return a.cardId === b.cardId && tokenColors.every(color => a.payment[color] === b.payment[color]);
  return JSON.stringify(a) === JSON.stringify(b);
}
function finish(state: SplendorState, events: InternalEvent[], reason: 'prestige' | 'stalemate') {
  const scores = Object.fromEntries(state.seats.map(seat => [seat, score(state, seat)]));
  const high = Math.max(...Object.values(scores));
  const tied = state.seats.filter(seat => scores[seat] === high);
  const fewest = Math.min(...tied.map(seat => state.players[seat]!.purchased.length));
  const winners = tied.filter(seat => state.players[seat]!.purchased.length === fewest);
  state.outcome = { status: 'finished', scores, winners, reason };
  state.phase = 'finished';
  events.push({ public: { type: 'match.finished', winners } });
}
function endTurn(state: SplendorState, events: InternalEvent[]) {
  if (score(state, current(state)) >= 15) state.finalRound = true;
  if (state.finalRound && (state.turn + 1) % state.seats.length === 0) {
    finish(state, events, 'prestige'); return;
  }
  if (state.passes === state.seats.length) { finish(state, events, 'stalemate'); return; }
  state.turn++;
  state.phase = 'action';
}
function afterMain(state: SplendorState, events: InternalEvent[]) {
  const seat = current(state);
  if (countTokens(state.players[seat]!.tokens) > 10) { state.phase = 'return'; return; }
  const eligible = eligibleNobles(state, seat);
  if (eligible.length > 1) { state.phase = 'noble'; return; }
  if (eligible.length === 1) awardNoble(state, seat, eligible[0]!, events);
  endTurn(state, events);
}
function awardNoble(state: SplendorState, seat: string, nobleId: string, events: InternalEvent[]) {
  state.nobles = state.nobles.filter(id => id !== nobleId);
  state.players[seat]!.nobles.push(nobleId);
  events.push({ public: { type: 'noble.arrived', seatId: seat, nobleId } });
}
function removeCard(state: SplendorState, seat: string, cardId: string, allowReserved: boolean) {
  const player = state.players[seat]!;
  if (allowReserved && player.reserved.includes(cardId)) {
    player.reserved.splice(player.reserved.indexOf(cardId), 1); return;
  }
  const tier = cardById(cardId).tier - 1, row = state.market[tier]!, index = row.indexOf(cardId);
  if (index < 0) throw new Error('Card is unavailable');
  const replacement = state.decks[tier]!.pop();
  if (replacement) row[index] = replacement;
  else row.splice(index, 1);
}
function checkInvariants(state: SplendorState) {
  if (new Set(state.seats).size !== state.seats.length ||
      Object.keys(state.players).length !== state.seats.length ||
      state.seats.some(seat => !state.players[seat])) throw new Error('Seat mapping is inconsistent');
  const ids = [...state.decks.flat(), ...state.market.flat(),
    ...Object.values(state.players).flatMap(p => [...p.purchased, ...p.reserved])];
  if (ids.length !== 90 || new Set(ids).size !== 90) throw new Error('Card conservation failed');
  ids.forEach(cardById);
  for (let tier = 0; tier < 3; tier++) {
    if ([...state.decks[tier]!, ...state.market[tier]!].some(id => cardById(id).tier !== tier + 1))
      throw new Error('Card tier is inconsistent');
    if (state.decks[tier]!.length && state.market[tier]!.length !== 4) throw new Error('Market refill is inconsistent');
  }
  const nobleIds = [...state.nobles, ...Object.values(state.players).flatMap(p => p.nobles)];
  if (nobleIds.length !== state.seats.length + 1 || new Set(nobleIds).size !== nobleIds.length)
    throw new Error('Noble conservation failed');
  nobleIds.forEach(nobleById);
  const initial = state.seats.length === 2 ? 4 : state.seats.length === 3 ? 5 : 7;
  for (const color of tokenColors) {
    if (state.bank[color] + Object.values(state.players).reduce((sum, p) => sum + p.tokens[color], 0) !== (color === 'gold' ? 5 : initial))
      throw new Error('Token conservation failed');
  }
  for (const seat of state.seats) {
    if (countTokens(state.players[seat]!.tokens) > 10 && (state.phase !== 'return' || current(state) !== seat))
      throw new Error('Token limit is inconsistent');
  }
  if (state.phase === 'return' && countTokens(state.players[current(state)]!.tokens) <= 10)
    throw new Error('Return phase is inconsistent');
  if (state.phase === 'noble' && eligibleNobles(state, current(state)).length < 2)
    throw new Error('Noble phase is inconsistent');
  if ((state.phase === 'finished') !== (state.outcome.status === 'finished'))
    throw new Error('Outcome is inconsistent');
  if (state.passes > state.seats.length) throw new Error('Pass count is inconsistent');
  if (state.outcome.status === 'finished') {
    const copy = structuredClone(state);
    finish(copy, [], state.outcome.reason);
    const expected = copy.outcome;
    const actual = state.outcome;
    if (expected.status !== 'finished' ||
        Object.keys(actual.scores).length !== state.seats.length ||
        state.seats.some(seat => actual.scores[seat] !== expected.scores[seat]) ||
        expected.winners.length !== actual.winners.length ||
        expected.winners.some((seat, index) => actual.winners[index] !== seat))
      throw new Error('Final ranking is inconsistent');
    if (actual.reason === 'prestige' && (!state.finalRound || (state.turn + 1) % state.seats.length !== 0 ||
        Math.max(...Object.values(actual.scores)) < 15))
      throw new Error('Final round is inconsistent');
    if (actual.reason === 'stalemate' && state.passes !== state.seats.length)
      throw new Error('Stalemate is inconsistent');
  }
}
export const splendorExtension: GameExtension<SplendorState, Record<string, never>, SplendorAction, SplendorView, InternalEvent, Event> = {
  manifest,
  validateOptions: value => optionsSchema.parse(value),
  parseAction: value => actionSchema.parse(value),
  setup({ seats, rng }) {
    if (seats.length < 2 || seats.length > 4 || new Set(seats).size !== seats.length) throw new Error('需要 2–4 个不同座位');
    const decks = [1, 2, 3].map(tier => shuffle(cards.filter(card => card.tier === tier).map(card => card.id), rng));
    const market = decks.map(deck => deck.splice(-4));
    const supply = seats.length === 2 ? 4 : seats.length === 3 ? 5 : 7;
    return { state: {
      schemaVersion: 1, seats: [...seats], turn: 0, phase: 'action', finalRound: false, passes: 0,
      bank: { white: supply, blue: supply, green: supply, red: supply, black: supply, gold: 5 },
      decks, market, nobles: shuffle(nobles.map(noble => noble.id), rng).slice(0, seats.length + 1),
      players: Object.fromEntries(seats.map(seat => [seat, { tokens: emptyTokens(), purchased: [], reserved: [], nobles: [] }])),
      outcome: { status: 'ongoing' },
    }, events: [] };
  },
  getView(state, viewer) {
    if (viewer.kind !== 'seat' || !state.seats.includes(viewer.seatId)) throw new Error('Unknown viewer');
    return viewSchema.parse({
      seats: state.seats, viewingSeatId: viewer.seatId, currentSeatId: current(state),
      turn: state.turn, phase: state.phase, finalRound: state.finalRound, bank: state.bank,
      market: state.market.map(row => row.map(cardById)), deckCounts: state.decks.map(deck => deck.length),
      nobles: state.nobles.map(nobleById),
      players: Object.fromEntries(state.seats.map(seat => [seat, {
        tokens: state.players[seat]!.tokens, purchased: ownedCards(state, seat),
        nobles: state.players[seat]!.nobles.map(nobleById), reservedCount: state.players[seat]!.reserved.length,
        bonuses: bonuses(ownedCards(state, seat)), score: score(state, seat),
      }])),
      myReserved: state.players[viewer.seatId]!.reserved.map(cardById),
      legalActions: legalActions(state, viewer.seatId), outcome: state.outcome,
    });
  },
  getActionSpec(state, viewer) { return { actions: this.getView(state, viewer).legalActions } as Json; },
  getDecisionContext(state, viewer) {
    const view = this.getView(state, viewer);
    // Returning each excess token is a new decision, not a retry of the previous return.
    const step = state.phase === 'return' ? ':tokens:' + countTokens(state.players[view.viewingSeatId]!.tokens) : '';
    return view.legalActions.length ? {
      decisionKey: 'turn:' + state.turn + ':' + state.phase + step,
      legalActions: view.legalActions,
    } : null;
  },
  validateAction(state, actor: Actor, raw) {
    const action = actionSchema.parse(raw);
    if (actor.kind !== 'seat' || !state.seats.includes(actor.seatId)) throw new Error('Unknown actor');
    if (!legalActions(state, actor.seatId).some(candidate => actionEquals(candidate, action)))
      throw new Error('当前阶段不能执行此操作，请检查回合、库存和费用');
  },
  applyAction(state, actor, action) {
    this.validateAction(state, actor, action);
    if (actor.kind !== 'seat') throw new Error('Seat actor required');
    const next = structuredClone(state), player = next.players[actor.seatId]!;
    const publicEvent: Event = { type: 'turn.played', seatId: actor.seatId, action: action.type };
    // Reserved identities and deck draws never appear in public events.
    if (action.type === 'buy') publicEvent.cardId = action.cardId;
    const events: InternalEvent[] = [{ public: publicEvent }];
    if (action.type === 'return') {
      player.tokens[action.color]--; next.bank[action.color]++;
      afterMain(next, events);
    } else if (action.type === 'noble') {
      awardNoble(next, actor.seatId, action.nobleId, events);
      endTurn(next, events);
    } else {
      next.passes = action.type === 'pass' ? next.passes + 1 : 0;
      if (action.type === 'take') {
        for (const color of action.colors) { player.tokens[color]++; next.bank[color]--; }
      } else if (action.type === 'reserve' || action.type === 'reserve_deck') {
        const cardId = action.type === 'reserve' ? action.cardId : next.decks[action.tier - 1]!.pop()!;
        if (action.type === 'reserve') removeCard(next, actor.seatId, cardId, false);
        player.reserved.push(cardId);
        if (next.bank.gold) { next.bank.gold--; player.tokens.gold++; }
      } else if (action.type === 'buy') {
        removeCard(next, actor.seatId, action.cardId, true);
        for (const color of tokenColors) { player.tokens[color] -= action.payment[color]; next.bank[color] += action.payment[color]; }
        player.purchased.push(action.cardId);
      }
      afterMain(next, events);
    }
    return { state: next, events };
  },
  projectEvents(events, viewer: Viewer) {
    if (viewer.kind !== 'seat') return [];
    return events.map(item => item.public);
  },
  getOutcome: state => state.outcome as Json,
  serialize: state => state as unknown as Json,
  deserialize(value) { const state = stateSchema.parse(value); checkInvariants(state); return state; },
  getFallbackAction: view => decideBasicSplendor({ view, legalActions: view.legalActions }),
};

export function decideBasicSplendor(input: { view: SplendorView; legalActions: readonly SplendorAction[] }): SplendorAction | null {
  const { view, legalActions: actions } = input, player = view.players[view.viewingSeatId]!;
  const buys = actions.filter(action => action.type === 'buy').sort((a, b) =>
    cardById(b.cardId).points - cardById(a.cardId).points ||
    a.payment.gold - b.payment.gold ||
    countTokens(a.payment) - countTokens(b.payment) ||
    player.bonuses[cardById(a.cardId).bonus] - player.bonuses[cardById(b.cardId).bonus]);
  if (buys[0]) return buys[0];
  if (view.phase === 'return') {
    return [...actions].sort((a, b) => a.type === 'return' && b.type === 'return'
      ? (a.color === 'gold' ? -100 : player.tokens[a.color]) - (b.color === 'gold' ? -100 : player.tokens[b.color]) : 0).at(-1) ?? null;
  }
  const candidates = [...view.market.flat(), ...view.myReserved];
  const target = candidates.sort((a, b) => {
    const deficit = (card: Card) => colors.reduce((sum, color) => sum + Math.max(0, card.cost[color] - player.bonuses[color] - player.tokens[color]), 0) - card.points * 0.45;
    return deficit(a) - deficit(b);
  })[0];
  const takes = actions.filter(action => action.type === 'take').sort((a, b) => {
    const benefit = (action: Extract<SplendorAction, { type: 'take' }>) =>
      action.colors.reduce((sum, color) => sum + (target && target.cost[color] > player.bonuses[color] + player.tokens[color] ? 4 : 0.1), 0);
    return benefit(b) - benefit(a);
  });
  return actions.find(action => action.type === 'noble') ?? takes[0]
    ?? actions.find(action => action.type === 'reserve' && action.cardId === target?.id) ?? actions[0] ?? null;
}
