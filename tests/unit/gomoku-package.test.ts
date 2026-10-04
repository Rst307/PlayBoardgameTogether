import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import { zipSync } from 'fflate';
import { DeterministicRng, type GameExtension } from '../../packages/game-sdk/src/index.js';
import { PackageRuntime } from '../../apps/api/src/registry/package-runtime.js';
import { readGamePackage } from '../../apps/api/src/catalog/game-package.js';

type Move = { x: number; y: number };
type State = { seats: string[]; moves: Move[] };
type Action = Move & { type: 'place' };
type View = {
  size: number; board: number[]; players: { seatId: string; color: number }[];
  you: string | null; currentSeat: string | null; moveCount: number; last: Move | null;
  winner: string | null; finished: boolean; winningLine: number[][]; actions: Action[];
};
let game: GameExtension<State, Record<string, never>, Action, View, unknown, unknown>;
const actor = (seatId: string) => ({ kind: 'seat' as const, seatId, controllerEpoch: 0 });
const viewer = (seatId: string) => ({ kind: 'seat' as const, seatId });
const move = (x: number, y: number): Action => ({ type: 'place', x, y });
const initial = () => game.setup({ seats: ['a', 'b'], options: {}, rng: new DeterministicRng(7) }).state;
function play(state: State, x: number, y: number) {
  return game.applyAction(state, actor(state.seats[state.moves.length % 2]!), move(x, y), new DeterministicRng(7));
}

describe('Gomoku ZIP in the real QuickJS runtime', () => {
  beforeAll(async () => {
    const base = new URL('../../game-packages/gomoku/', import.meta.url);
    const files = {
      'game.json': await readFile(new URL('game.json', base)),
      'server.js': await readFile(new URL('server.txt', base)),
      'client.html': await readFile(new URL('client.html', base)),
    };
    const parsed = readGamePackage(Buffer.from(zipSync(files)));
    game = (await PackageRuntime.create()).extension(parsed.server) as unknown as typeof game;
  });
  it('supports installation, exact recovery and turn-specific legal candidates without consuming RNG', () => {
    const rng = new DeterministicRng(42), before = rng.snapshot();
    const { state } = game.setup({ seats: ['a', 'b'], options: {}, rng });
    expect(game.manifest.players).toEqual({ min: 2, max: 2 });
    expect(game.deserialize(game.serialize(state))).toEqual(state);
    expect(game.getView(state, viewer('a')).actions).toHaveLength(225);
    expect(game.getDecisionContext!(state, viewer('a'))?.legalActions[0]).toEqual(move(7, 7));
    expect(game.getDecisionContext!(state, viewer('b'))).toBeNull();
    expect(game.getView(state, { kind: 'spectator' }).actions).toEqual([]);
    expect(game.getView(state, viewer('intruder')).you).toBeNull();
    expect(game.getFallbackAction(game.getView(state, viewer('a')), {})).toEqual(move(7, 7));
    const result = game.applyAction(state, actor('a'), move(7, 7), rng);
    expect(result.state.moves).toEqual([{ x: 7, y: 7 }]);
    expect(state.moves).toEqual([]);
    expect(rng.snapshot()).toEqual(before);
    expect(game.projectEvents(result.events, viewer('b'))).toEqual(result.events);
    expect(game.deserialize(game.serialize(result.state))).toEqual(result.state);
  });
  it('rejects malformed/forged actions, invalid options, wrong actors and occupied points without mutation', () => {
    for (const action of [move(-1, 0), move(15, 0), move(0.5, 0), { ...move(0, 0), seatId: 'a' }, { type: 'resign' }]) {
      expect(() => game.parseAction(action)).toThrow();
    }
    expect(() => game.validateOptions({ size: 9 })).toThrow();
    expect(() => game.setup({ seats: ['a', 'a'], options: {}, rng: new DeterministicRng(1) })).toThrow();
    const state = play(initial(), 7, 7).state, saved = structuredClone(state), rng = new DeterministicRng(9);
    for (const badActor of [actor('a'), actor('intruder'), { kind: 'system' as const, purpose: 'test' }]) {
      expect(() => game.applyAction(state, badActor, move(8, 8), rng)).toThrow();
    }
    expect(() => game.applyAction(state, actor('b'), move(7, 7), rng)).toThrow();
    expect(state).toEqual(saved);
    expect(rng.snapshot()).toEqual(new DeterministicRng(9).snapshot());
  });
  it.each([[1, 0], [0, 1], [1, 1], [1, -1]])('wins along direction %i,%i and rejects post-game moves', (dx, dy) => {
    let state = initial();
    const startY = dy < 0 ? 14 : 0;
    for (let i = 0; i < 5; i++) {
      state = play(state, i * dx, startY + i * dy).state;
      if (i < 4) state = play(state, 14, i * 2).state;
    }
    expect(game.getOutcome(state)).toEqual({ status: 'finished', winners: ['a'] });
    const view = game.getView(state, viewer('a'));
    expect(view.winningLine).toHaveLength(5);
    expect(view.actions).toEqual([]);
    expect(game.getDecisionContext!(state, viewer('a'))).toBeNull();
    expect(() => play(state, 10, 10)).toThrow();
    expect(game.deserialize(state)).toEqual(state);
  });
  it('allows a six-stone bridge and makes both colors eligible to win', () => {
    let state = initial();
    for (const [i, x] of [0, 1, 2, 4, 5].entries()) {
      state = play(state, x, 0).state;
      state = play(state, 14, i * 2).state;
    }
    state = play(state, 3, 0).state;
    expect(game.getView(state, viewer('a')).winningLine).toHaveLength(6);
    let white = initial();
    for (let i = 0; i < 5; i++) {
      white = play(white, i * 2, 14).state;
      white = play(white, i, 0).state;
    }
    expect(game.getOutcome(white)).toEqual({ status: 'finished', winners: ['b'] });
  });
  it('prioritizes immediate wins and blocks an immediate opponent win with legal fallback', () => {
    let state = initial();
    for (let i = 0; i < 4; i++) {
      state = play(state, i, 0).state;
      state = play(state, 14, i * 2).state;
    }
    expect(game.getDecisionContext!(state, viewer('a'))?.legalActions[0]).toEqual(move(4, 0));
    const threat = play(state, 10, 10).state;
    expect(game.getDecisionContext!(threat, viewer('b'))?.legalActions[0]).toEqual(move(4, 0));
    const context = game.getDecisionContext!(threat, viewer('b'))!;
    expect(context.legalActions).toHaveLength(216);
    for (const action of context.legalActions) game.validateAction(threat, actor('b'), action);
  });
  it('completes a deterministic two-script game with legal decisions and recoverable final state', () => {
    let state = initial();
    const rng = new DeterministicRng(21);
    for (let step = 0; step < 225 && game.getOutcome(state).status === 'ongoing'; step++) {
      const seat = state.seats[state.moves.length % 2]!;
      const view = game.getView(state, viewer(seat));
      const context = game.getDecisionContext!(state, viewer(seat))!;
      const action = game.getFallbackAction(view, game.getActionSpec(state, viewer(seat)))!;
      expect(action).toEqual(context.legalActions[0]);
      game.validateAction(state, actor(seat), action);
      state = game.applyAction(state, actor(seat), action, rng).state;
      expect(game.deserialize(game.serialize(state))).toEqual(state);
    }
    expect(game.getOutcome(state).status).toBe('finished');
    expect(rng.snapshot()).toEqual(new DeterministicRng(21).snapshot());
    expect(() => game.deserialize({ ...state, moves: [...state.moves, { x: 14, y: 14 }] })).toThrow();
  });
  it('finishes a full non-winning board as a draw and validates saved history', () => {
    const groups: Move[][] = [[], []];
    for (let y = 0; y < 15; y++) for (let x = 0; x < 15; x++) groups[(x + 2 * y) % 4 < 2 ? 0 : 1]!.push({ x, y });
    if (groups[0]!.length < groups[1]!.length) groups.reverse();
    const state: State = { seats: ['a', 'b'], moves: [] };
    for (let i = 0; i < 113; i++) {
      state.moves.push(groups[0]![i]!);
      if (groups[1]![i]) state.moves.push(groups[1]![i]!);
    }
    expect(game.deserialize(state)).toEqual(state);
    expect(game.getOutcome(state)).toEqual({ status: 'finished', winners: [] });
    expect(game.getView(state, viewer('a')).board.every(Boolean)).toBe(true);
    expect(() => game.deserialize({ seats: ['a', 'b'], moves: [{ x: 0, y: 0 }, { x: 0, y: 0 }] })).toThrow();
    expect(() => game.deserialize({ ...initial(), extra: true })).toThrow();
    expect(() => game.deserialize({ seats: ['a', 'b'], moves: [{ x: 99, y: 0 }] })).toThrow();
  });
});
