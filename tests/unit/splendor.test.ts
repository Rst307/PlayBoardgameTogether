import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { DeterministicRng } from '@boardgame/game-sdk';
import { cards, cardById, nobles } from '../../games/splendor/src/shared/catalog.js';
import { colors, emptyTokens, paymentFor, tokenColors, type SplendorAction, type Token, type Tokens } from '../../games/splendor/src/shared/index.js';
import { decideBasicSplendor, splendorExtension as game, type SplendorState } from '../../games/splendor/src/server/index.js';

const rng = () => new DeterministicRng(42);
const setup = (count = 2, seed = 42) => game.setup({ seats: ['a','b','c','d'].slice(0, count), options: {}, rng: new DeterministicRng(seed) }).state;
const actor = (seatId = 'a') => ({ kind: 'seat' as const, seatId, controllerEpoch: 0 });
const apply = (state: SplendorState, action: SplendorAction) => game.applyAction(state, actor(state.seats[state.turn % state.seats.length]!), action, rng()).state;
const view = (state: SplendorState, seatId = 'a') => game.getView(state, { kind: 'seat', seatId });
function grant(state: SplendorState, seat: string, color: Token, amount: number) {
  state.bank[color] -= amount; state.players[seat]!.tokens[color] += amount;
}
function own(state: SplendorState, seat: string, id: string) {
  for (let tier = 0; tier < 3; tier++) {
    const market = state.market[tier]!, deck = state.decks[tier]!;
    const index = market.indexOf(id);
    if (index >= 0) {
      const replacement = deck.pop();
      if (replacement) market[index] = replacement; else market.splice(index, 1);
    } else if (deck.includes(id)) deck.splice(deck.indexOf(id), 1);
  }
  state.players[seat]!.purchased.push(id);
}
function expose(state: SplendorState, id: string) {
  const tier = cardById(id).tier - 1, deck = state.decks[tier]!;
  if (state.market[tier]!.includes(id)) return;
  deck.splice(deck.indexOf(id), 1);
  deck.push(state.market[tier]![0]!);
  state.market[tier]![0] = id;
}

describe('璀璨宝石', () => {
  it('has all 90 cards, exact tier/bonus counts and deterministic setup for 2–4 players', () => {
    expect(cards).toHaveLength(90);
    expect(nobles).toHaveLength(10);
    const expectedRequirements = [2, 3].flatMap(size => colors.map((_, start) =>
      colors.map((_, index) => Array.from({ length: size }, (_unused, offset) =>
        (start + offset) % colors.length).includes(index) ? size === 2 ? 4 : 3 : 0).join(',')));
    expect(nobles.map(noble => colors.map(color => noble.requirement[color]).join(',')).sort())
      .toEqual(expectedRequirements.sort());
    // Golden fingerprint from two independently matching published numeric tables.
    const signatures = cards.map(card => card.tier + ':' + card.bonus + ':' + card.points + ':' +
      colors.map(color => card.cost[color]).join(',')).sort().join('\n');
    expect(createHash('sha256').update(signatures).digest('hex')).toBe('77e2712cb0ca28dedf8b95ce594c8de67feabd10d1adf7fdde23ad1adaab8fc4');
    expect([1,2,3].map(tier => cards.filter(card => card.tier === tier).length)).toEqual([40,30,20]);
    for (const color of colors) expect(cards.filter(card => card.bonus === color)).toHaveLength(18);
    for (const count of [2,3,4]) {
      const state = setup(count);
      expect(state.nobles).toHaveLength(count + 1);
      expect(state.bank.white).toBe(count === 2 ? 4 : count === 3 ? 5 : 7);
      expect(state.bank.gold).toBe(5);
      expect(state.market.map(row => row.length)).toEqual([4,4,4]);
      expect(state.decks.map(row => row.length)).toEqual([36,26,16]);
      expect(state).toEqual(setup(count));
      expect(game.deserialize(game.serialize(state))).toEqual(state);
    }
    expect(() => game.setup({ seats: ['a','a'], options: {}, rng: rng() })).toThrow();
  });

  it('rejects wrong actors, duplicate colors, gold grabs and two-of-a-color below four without mutation', () => {
    const state = setup(), before = structuredClone(state), random = rng(), beforeRng = random.snapshot();
    expect(() => game.applyAction(state, actor('b'), { type: 'take', colors: ['white','blue','green'] }, random)).toThrow();
    expect(() => apply(state, { type: 'take', colors: ['white','white','blue'] })).toThrow();
    expect(() => game.parseAction({ type: 'take', colors: ['gold'] })).toThrow();
    grant(state, 'b', 'red', 1);
    expect(() => apply(state, { type: 'take', colors: ['red','red'] })).toThrow();
    expect(random.snapshot()).toEqual(beforeRng);
    state.bank.red++; state.players.b!.tokens.red--;
    expect(state).toEqual(before);
    const next = apply(state, { type: 'take', colors: ['blue','white','green'] });
    expect(next.bank.white).toBe(3); expect(next.turn).toBe(1);
  });

  it('requires all available colors when fewer than three remain', () => {
    const state = setup();
    for (const color of ['white','blue','green'] as const) { grant(state, 'b', color, 4); }
    expect(() => apply(state, { type: 'take', colors: ['red'] })).toThrow();
    const next = apply(state, { type: 'take', colors: ['black','red'] });
    expect(next.players.a!.tokens.black).toBe(1);
  });

  it('hides blind reservations and draws, enforces three-card limit and allows reservation without gold', () => {
    let state = setup();
    const top = state.decks[0]!.at(-1)!;
    const result = game.applyAction(state, actor(), { type: 'reserve_deck', tier: 1 }, rng());
    state = result.state;
    expect(view(state).myReserved[0]!.id).toBe(top);
    const other = view(state, 'b');
    expect(other.players.a!.reservedCount).toBe(1);
    expect(other.myReserved).toEqual([]);
    expect(other).not.toHaveProperty('decks');
    expect(other.players.a).not.toHaveProperty('reserved');
    expect(JSON.stringify(game.projectEvents(result.events, { kind: 'seat', seatId: 'b' }))).not.toContain(top);
    state.turn = 0;
    state = apply(state, { type: 'reserve_deck', tier: 2 }); state.turn = 0;
    state = apply(state, { type: 'reserve_deck', tier: 3 }); state.turn = 0;
    expect(() => apply(state, { type: 'reserve_deck', tier: 1 })).toThrow();
    const noGold = setup(); grant(noGold, 'b', 'gold', 5);
    expect(apply(noGold, { type: 'reserve_deck', tier: 1 }).players.a!.tokens.gold).toBe(0);
  });

  it('pays exact discounted cost, allows gold in place of held gems and rejects over/underpayment', () => {
    const state = setup(), card = cards.find(card => card.bonus === 'black' && card.cost.green === 3 && card.points === 0)!;
    expose(state, card.id); grant(state, 'a', 'green', 3); grant(state, 'a', 'gold', 2);
    const payment: Tokens = { ...emptyTokens(), green: 1, gold: 2 };
    expect(() => apply(state, { type: 'buy', cardId: card.id, payment: { ...payment, green: 2 } })).toThrow();
    expect(() => apply(state, { type: 'buy', cardId: card.id, payment: emptyTokens() })).toThrow();
    const next = apply(state, { type: 'buy', cardId: card.id, payment });
    expect(next.players.a!.tokens.green).toBe(2);
    expect(next.bank.gold).toBe(5);
    expect(view(next).players.a!.bonuses.black).toBe(1);
    expect(next.market[0]).toHaveLength(4);
    expect(next.decks[0]!.length).toBe(state.decks[0]!.length - 1);
    expect(game.deserialize(game.serialize(next))).toEqual(next);
    expect(view(state).legalActions.filter(action => action.type === 'buy' && action.cardId === card.id)).toHaveLength(3);
    const discountState = setup();
    for (const owned of cards.filter(card => card.bonus === 'green').slice(0,3)) own(discountState, 'a', owned.id);
    expose(discountState, card.id);
    expect(paymentFor(card, view(discountState).players.a!.bonuses, emptyTokens())).toEqual(emptyTokens());
    expect(apply(discountState, { type: 'buy', cardId: card.id, payment: emptyTokens() }).players.a!.purchased).toContain(card.id);
  });

  it('persists the return phase and lets the player return gold or newly taken tokens', () => {
    const state = setup();
    grant(state, 'a', 'white', 3); grant(state, 'a', 'blue', 3); grant(state, 'a', 'green', 3); grant(state, 'a', 'gold', 1);
    const next = apply(state, { type: 'take', colors: ['white','red','black'] });
    expect(next.phase).toBe('return'); expect(next.turn).toBe(0);
    expect(game.deserialize(game.serialize(next))).toEqual(next);
    expect(() => apply(next, { type: 'reserve_deck', tier: 1 })).toThrow();
    const firstDecision = game.getDecisionContext!(next, { kind: 'seat', seatId: 'a' })!.decisionKey;
    let returned = apply(next, { type: 'return', color: 'gold' });
    expect(game.getDecisionContext!(returned, { kind: 'seat', seatId: 'a' })!.decisionKey).not.toBe(firstDecision);
    returned = apply(returned, { type: 'return', color: 'red' });
    returned = apply(returned, { type: 'return', color: 'black' });
    expect(returned.phase).toBe('action'); expect(returned.turn).toBe(1);
    expect(game.deserialize(game.serialize(returned))).toEqual(returned);
  });

  it('requires a noble choice, awards exactly one and does not spend bonuses', () => {
    const state = setup();
    state.nobles = ['noble.0','noble.1','noble.2'];
    for (const color of ['red','green','blue'] as const)
      for (const card of cards.filter(card => card.bonus === color).slice(0,4)) own(state, 'a', card.id);
    const next = apply(state, { type: 'take', colors: ['white','blue','black'] });
    expect(next.phase).toBe('noble');
    expect(game.deserialize(game.serialize(next))).toEqual(next);
    const resolved = apply(next, { type: 'noble', nobleId: 'noble.0' });
    expect(resolved.players.a!.nobles).toEqual(['noble.0']);
    expect(resolved.nobles).toContain('noble.1');
    expect(view(resolved).players.a!.score).toBe(3);
    expect(resolved.players.a!.purchased).toHaveLength(12);
    expect(resolved.turn).toBe(1);
  });

  it('completes the round at fifteen and breaks score ties by fewer development cards', () => {
    const state = setup();
    const highCards = cards.filter(card => card.points === 5);
    for (const card of highCards.slice(0,3)) own(state, 'a', card.id);
    for (const card of highCards.slice(3)) own(state, 'b', card.id);
    for (const card of cards.filter(card => card.points === 4).slice(0,1)) own(state, 'b', card.id);
    own(state, 'b', cards.find(card => card.points === 1)!.id);
    const next = apply(state, { type: 'take', colors: ['white','blue','green'] });
    expect(next.finalRound).toBe(true); expect(next.phase).toBe('action');
    expect(next.turn).toBe(1);
    const final = apply(next, { type: 'take', colors: ['white','blue','red'] });
    expect(final.phase).toBe('finished');
    expect(final.outcome).toMatchObject({ winners: ['a'], scores: { a: 15, b: 15 } });
    expect(game.deserialize(game.serialize(final))).toEqual(final);
    const jsonb = structuredClone(final);
    if (jsonb.outcome.status === 'finished') {
      jsonb.outcome.scores = Object.fromEntries(Object.entries(jsonb.outcome.scores).reverse());
    }
    expect(game.deserialize(jsonb)).toEqual(final);
    expect(() => apply(final, { type: 'take', colors: ['white','blue','green'] })).toThrow();
  });

  it('rejects corrupted archives and keeps deck depletion valid', () => {
    const state = setup();
    const broken = structuredClone(state); broken.bank.gold = 4;
    expect(() => game.deserialize(broken)).toThrow(/conservation/);
    const duplicate = structuredClone(state); duplicate.decks[0]![0] = duplicate.market[0]![0]!;
    expect(() => game.deserialize(duplicate)).toThrow(/conservation/);
    for (const id of [...state.decks[0]!]) own(state, 'b', id);
    expect(state.decks[0]).toEqual([]);
    const next = apply(state, { type: 'reserve', cardId: state.market[0]![0]! });
    expect(next.market[0]).toHaveLength(3);
    expect(game.deserialize(game.serialize(next))).toEqual(next);
  });

  it('script AI completes seeded 2/3/4-player games using private legal decisions', () => {
    for (const count of [2,3,4]) for (const seed of [1,42,100]) {
      let state = setup(count, seed);
      for (let step = 0; step < 1500 && state.phase !== 'finished'; step++) {
        const seat = state.seats[state.turn % count]!;
        const currentView = view(state, seat);
        const context = game.getDecisionContext!(state, { kind: 'seat', seatId: seat })!;
        const action = decideBasicSplendor({ view: currentView, legalActions: context.legalActions });
        expect(action).not.toBeNull();
        state = apply(state, action!);
        game.deserialize(game.serialize(state));
      }
      expect(state.phase, 'count=' + count + ' seed=' + seed).toBe('finished');
      expect(state.outcome.status).toBe('finished');
      for (const color of tokenColors) expect(state.bank[color]).toBeGreaterThanOrEqual(0);
    }
  }, 30_000);
});
