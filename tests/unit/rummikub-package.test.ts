import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import { zipSync } from 'fflate';
import { DeterministicRng, type GameExtension } from '../../packages/game-sdk/src/index.js';
import { PackageRuntime } from '../../apps/api/src/registry/package-runtime.js';
import { readGamePackage } from '../../apps/api/src/catalog/game-package.js';

type State = { seats: string[]; hands: number[][]; pool: number[]; table: number[][];
  opened: boolean[]; turn: number; passes: number; move: number };
type Action = { type: 'draw' } | { type: 'play'; table: number[][] };
type View = { you: string | null; hand: { id: number }[]; table: number[][]; suggestions: Action[];
  canAct: boolean; finished: boolean; players: { seatId: string; score: number | null }[] };
let game: GameExtension<State, Record<string, never>, Action, View, unknown, unknown>;
const actor = (seatId = 'a') => ({ kind: 'seat' as const, seatId, controllerEpoch: 0 });
const viewer = (seatId = 'a') => ({ kind: 'seat' as const, seatId });
const id = (color: number, number: number, copy = 0) => color * 26 + (number - 1) * 2 + copy;
const run = (color: number, start: number, length = 3) => Array.from({ length }, (_, i) => id(color, start + i));
function initial(count = 2, seed = 123) {
  const rng = new DeterministicRng(seed);
  return { state: game.setup({ seats: ['a', 'b', 'c', 'd'].slice(0, count), options: {}, rng }).state, rng };
}
function arranged(hand: number[], table: number[][] = [], opened = true, emptyPool = false) {
  const used = new Set([...hand, ...table.flat()]);
  const rest = Array.from({ length: 106 }, (_, i) => i).filter(n => !used.has(n));
  const state: State = { seats: ['a', 'b'], hands: [hand, emptyPool ? rest : rest.splice(0, 14)],
    pool: emptyPool ? [] : rest, table, opened: [opened, false], turn: 0, passes: 0, move: 5 };
  return game.deserialize(state);
}
const play = (state: State, table: number[][]) => game.applyAction(state, actor(), { type: 'play', table }, new DeterministicRng(9));

describe('Rummikub in the real isolated package runtime', () => {
  beforeAll(async () => {
    const base = new URL('../../game-packages/rummikub/', import.meta.url);
    const shared = await readFile(new URL('shared.txt', base), 'utf8');
    const files = {
      'game.json': await readFile(new URL('game.json', base)),
      'server.js': Buffer.from(shared + '\n' + await readFile(new URL('server.txt', base), 'utf8')),
      'client.html': Buffer.from((await readFile(new URL('client.html', base), 'utf8')).replace('/* RUMMIKUB_SHARED */', shared)),
    };
    const parsed = readGamePackage(Buffer.from(zipSync(files)));
    game = (await PackageRuntime.create()).extension(parsed.server) as unknown as typeof game;
  });
  it('passes min/max lifecycle, deterministic shuffling and conserved exact recovery', () => {
    for (const count of [2, 3, 4]) {
      const { state, rng } = initial(count);
      expect(state).toEqual(initial(count).state);
      expect(rng.snapshot()).toEqual(initial(count).rng.snapshot());
      expect(state.hands.every(h => h.length === 14)).toBe(true);
      expect(state.pool).toHaveLength(106 - count * 14);
      expect(game.deserialize(game.serialize(state))).toEqual(state);
      for (const seat of state.seats) {
        const view = game.getView(state, viewer(seat));
        expect(view.hand.map(t => t.id)).toEqual(state.hands[state.seats.indexOf(seat)]);
        const decision = game.getDecisionContext!(state, viewer(seat));
        if (decision) {
          game.validateAction(state, actor(seat), decision.legalActions[0]!);
          expect(decision.legalActions).toContainEqual(game.getFallbackAction(view, game.getActionSpec(state, viewer(seat))));
        }
      }
    }
  });
  it('conceals other hands/pool order and projects draw events without the tile', () => {
    const { state, rng } = initial();
    const current = state.seats[state.turn]!;
    for (const view of [game.getView(state, { kind: 'spectator' }), game.getView(state, viewer('intruder'))]) {
      expect(view.hand).toEqual([]); expect(view.suggestions).toEqual([]);
      expect(view).not.toHaveProperty('pool'); expect(view).not.toHaveProperty('hands');
    }
    const result = game.applyAction(state, actor(current), { type: 'draw' }, rng);
    expect(game.projectEvents(result.events, viewer('b'))).toEqual([{ type: 'tile.drawn', seatId: current }]);
    expect(state.hands[state.turn]).toHaveLength(14);
    expect(result.state.hands[state.turn]).toHaveLength(15);
    expect(result.state.turn).toBe((state.turn + 1) % 2);
  });
  it('enforces 30 points from own rack, multiple sets and positional jokers', () => {
    const low = run(0, 1), high = run(1, 8);
    const hand = [...low, ...high, ...run(2, 10), 104, id(3, 13), ...run(3, 1)];
    const state = arranged(hand, [], false);
    expect(() => play(state, [low])).toThrow();
    expect(() => play(state, [high])).toThrow();
    const result = play(state, [low, high]);
    expect(result.state.opened[0]).toBe(true); expect(result.state.hands[0]).toHaveLength(8);
    const wild = arranged([...run(0, 10, 2), 104, ...Array.from({ length: 11 }, (_, i) => id(2, i + 1))], [], false);
    expect(play(wild, [[id(0, 10), id(0, 11), 104]]).state.opened[0]).toBe(true);
    const existing = [run(0, 4)], unopen = arranged(hand, existing, false);
    expect(() => play(unopen, [[...existing[0]!, id(0, 7)], high])).toThrow();
  });
  it('accepts splitting, duplicate-number copies and joker replacement/reuse atomically', () => {
    const row = run(0, 1, 6), hand = [id(0, 4, 1), id(1, 4), id(2, 4)];
    const state = arranged(hand, [row]);
    const result = play(state, [row.slice(0, 3), [id(0, 4, 1), ...row.slice(4)], [id(0, 4), id(1, 4), id(2, 4)]]);
    expect(result.state.hands[0]).toEqual([]);
    const wild = arranged([id(0, 6), id(1, 10), id(1, 11)], [[id(0, 5), 104, id(0, 7)]]);
    expect(play(wild, [run(0, 5), [id(1, 10), id(1, 11), 104]]).state.hands[0]).toEqual([]);
  });
  it('rejects foreign/duplicate/disappearing tiles, invalid sets and wrong actors without mutation or RNG consumption', () => {
    const existing = run(0, 5), state = arranged([id(0, 8), id(1, 8), id(2, 8), 104], [existing]);
    const before = structuredClone(state), rng = new DeterministicRng(19), random = rng.snapshot();
    const bad = [
      [[...existing, id(0, 8), id(0, 8)]], [run(3, 9)], [[id(0, 8), id(1, 8), id(2, 8)]],
      [[id(0, 12), id(0, 13), id(0, 1)]], [[...existing, id(1, 8)]],
    ];
    for (const table of bad) {
      expect(() => game.applyAction(state, actor(), { type: 'play', table }, rng)).toThrow();
      expect(state).toEqual(before); expect(rng.snapshot()).toEqual(random);
    }
    for (const seat of ['b', 'intruder']) expect(() => game.applyAction(state, actor(seat), { type: 'draw' }, rng)).toThrow();
    for (const action of [{ type: 'draw', seatId: 'a' }, { type: 'play', table: [[1, 2, 106]] }, { type: 'play', table: 'bad' }]) expect(() => game.parseAction(action)).toThrow();
  });
  it('scores empty-rack wins and exhausted-pool endings with joker penalties', () => {
    const state = arranged(run(0, 10), [run(1, 1)]);
    const result = play(state, [...state.table, run(0, 10)]).state;
    expect(game.getOutcome(result)).toEqual({ status: 'finished', winners: ['a'] });
    expect(game.getView(result, viewer()).players.map(p => p.score!).reduce((a, b) => a + b, 0)).toBe(0);
    expect(() => game.applyAction(result, actor('b'), { type: 'draw' }, new DeterministicRng(1))).toThrow();
    let blocked = arranged([104], [run(0, 1)], true, true);
    blocked = game.applyAction(blocked, actor(), { type: 'draw' }, new DeterministicRng(1)).state;
    expect(game.getOutcome(blocked)).toEqual({ status: 'ongoing' });
    blocked = game.applyAction(blocked, actor('b'), { type: 'draw' }, new DeterministicRng(1)).state;
    expect(game.getOutcome(blocked)).toEqual({ status: 'finished', winners: ['a'] });
    expect(game.getView(blocked, viewer()).players.map(p => p.score!).reduce((a, b) => a + b, 0)).toBe(0);
    const table = Array.from({ length: 8 }, (_, i) => run(Math.floor(i / 2), 1, 13).map(n => n + i % 2));
    let tied = game.deserialize({ seats: ['a', 'b'], hands: [[104], [105]], pool: [], table,
      opened: [true, true], turn: 0, passes: 0, move: 20 });
    tied = game.applyAction(tied, actor(), { type: 'draw' }, new DeterministicRng(1)).state;
    tied = game.applyAction(tied, actor('b'), { type: 'draw' }, new DeterministicRng(1)).state;
    expect(game.getOutcome(tied)).toEqual({ status: 'finished', winners: ['a', 'b'] });
    expect(game.getView(tied, viewer()).players.map(p => p.score)).toEqual([0, 0]);
  });
  it('rejects corrupted conservation, malformed saves and invalid options', () => {
    const { state } = initial();
    for (const corrupt of [{ ...state, pool: state.pool.slice(1) }, { ...state, turn: 5 },
      { ...state, hands: [state.hands[0], state.hands[0]] }, { ...state, opened: [true, false] },
      { ...state, passes: 2 }, { ...state, move: -1 }]) expect(() => game.deserialize(corrupt)).toThrow();
    expect(() => game.validateOptions({ timer: 60 })).toThrow();
    expect(() => game.setup({ seats: ['a', 'a'], options: {}, rng: new DeterministicRng(1) })).toThrow();
  });
  it('completes a four-script game using identity views and recoverable legal candidates', () => {
    let { state } = initial(4, 77);
    const rng = new DeterministicRng(77);
    for (let step = 0; step < 350 && game.getOutcome(state).status === 'ongoing'; step++) {
      const seat = state.seats[state.turn]!, view = game.getView(state, viewer(seat));
      const action = game.getFallbackAction(view, game.getActionSpec(state, viewer(seat)))!;
      state = game.applyAction(state, actor(seat), action, rng).state;
      state = game.deserialize(game.serialize(state));
    }
    expect(game.getOutcome(state).status).toBe('finished');
    expect(game.getView(state, viewer()).suggestions).toEqual([]);
  }, 20_000);
});
