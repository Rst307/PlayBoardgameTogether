import { describe, expect, it } from 'vitest';
import { DeterministicRng } from '@boardgame/game-sdk';
import { azulExtension as game, decideBasicAzul } from '../../games/azul/src/server/index.js';
import { colors, connection, wallColumn, type Color } from '../../games/azul/src/shared/index.js';
import { azulPresentationCues } from '../../games/azul/src/shared/assets.js';
const seats = ['a', 'b', 'c', 'd'];
const actor = (seatId: string) => ({ kind: 'seat' as const, seatId, controllerEpoch: 0 });
const setup = (count = 2, rng = new DeterministicRng(42)) => game.setup({ seats: seats.slice(0, count), options: {}, rng }).state;

describe('花砖物语经典彩墙', () => {
  it('uses deterministic offers and keeps bag order out of every View and event', () => {
    const state = setup();
    expect(state).toEqual(setup());
    expect(state.factories).toHaveLength(5);
    expect(state.factories.every(f => f.length === 4)).toBe(true);
    const view = game.getView(state, { kind: 'seat', seatId: 'a' });
    expect(view).not.toHaveProperty('bag'); expect(view).not.toHaveProperty('discard');
    expect(game.getView(state, { kind: 'seat', seatId: 'b' }).legalActions).toEqual([]);
    expect(() => game.getView(state, { kind: 'seat', seatId: 'outsider' })).toThrow();
    const action = view.legalActions[0]!;
    const events = game.applyAction(state, actor('a'), action, new DeterministicRng(9)).events;
    expect(JSON.stringify(game.projectEvents(events, { kind: 'seat', seatId: 'b' }))).not.toContain('bag');
  });
  it('counts horizontal and vertical connections independently, including the new tile twice', () => {
    const wall = Array.from({ length: 5 }, () => Array<boolean>(5).fill(false));
    wall[2]![2] = true; expect(connection(wall, 2, 2).points).toBe(1);
    wall[2]![1] = true; wall[2]![3] = true; wall[1]![2] = true;
    expect(connection(wall, 2, 2).points).toBe(5);
    wall[0]![2] = true; wall[4]![2] = true;
    expect(connection(wall, 2, 2).points).toBe(6); // gap at row 3 stops the chain
  });
  it('takes all of one color, spills to the center/floor, refuses wrong actor and full/mixed lines without mutating', () => {
    const state = setup(); state.factories[0] = ['blue', 'blue', 'red', 'yellow'];
    const action = { type: 'draft' as const, source: 0, color: 'blue' as const, row: 0 };
    const before = structuredClone(state), rng = new DeterministicRng(4), savedRng = rng.snapshot();
    expect(() => game.applyAction(state, actor('b'), action, rng)).toThrow();
    expect(state).toEqual(before); expect(rng.snapshot()).toEqual(savedRng);
    const next = game.applyAction(state, actor('a'), action, rng).state;
    expect(next.players.a!.lines[0]).toEqual({ color: 'blue', count: 1 });
    expect(next.players.a!.floor).toEqual(['blue']);
    expect(next.center).toEqual(['red', 'yellow']); expect(next.factories[0]).toEqual([]);
    next.currentSeatId = 'a';
    expect(() => game.validateAction(next, actor('a'), { ...action, source: -1, color: 'red' })).toThrow();
    next.players.a!.lines[2] = { color: 'blue', count: 1 };
    expect(() => game.validateAction(next, actor('a'), { ...action, source: -1, color: 'red', row: 2 })).toThrow();
    next.players.a!.wall[3]![wallColumn(3, 'red')] = true;
    expect(() => game.validateAction(next, actor('a'), { ...action, source: -1, color: 'red', row: 3 })).toThrow();
  });
  it('caps floor at seven and retains starter even when the marker cannot fit', () => {
    const state = setup(); state.center = ['red', 'red']; state.players.a!.floor = Array<Color>(7).fill('blue');
    const next = game.applyAction(state, actor('a'), { type: 'draft', source: -1, color: 'red', row: -1 }, new DeterministicRng(1)).state;
    expect(next.players.a!.floor).toHaveLength(7); expect(next.nextStarter).toBe('a');
    expect(next.firstAvailable).toBe(false); expect(next.discard.slice(-2)).toEqual(['red', 'red']);
  });
  it('resolves top to bottom, keeps unfinished lines, clamps penalties to zero and uses the marker holder as starter', () => {
    const state = setup(); state.factories = state.factories.map(() => []); state.center = ['red'];
    state.players.a!.lines[0] = { color: 'blue', count: 1 };
    state.players.a!.lines[1] = { color: 'white', count: 2 }; // same column as blue on row 0
    state.players.a!.lines[3] = { color: 'red', count: 2 };
    const result = game.applyAction(state, actor('a'), { type: 'draft', source: -1, color: 'red', row: -1 }, new DeterministicRng(8));
    expect(result.state.lastRound.filter(s => s.kind === 'tile').map(s => s.points)).toEqual([1, 2]);
    expect(result.state.players.a!.score).toBe(1); expect(result.state.players.a!.floor).toEqual([]);
    expect(result.state.players.a!.lines[3]).toEqual({ color: 'red', count: 2 });
    expect(result.state.round).toBe(2); expect(result.state.currentSeatId).toBe('a');
    expect(result.state.firstAvailable).toBe(true);
    expect(game.projectEvents(result.events, { kind: 'seat', seatId: 'b' }).some(e => e.type === 'round.scored')).toBe(true);
  });
  it('awards row/column/color bonuses only at the end and breaks ties by complete rows', () => {
    const state = setup(); state.factories = state.factories.map(() => []); state.center = ['black'];
    state.players.a!.wall = Array.from({ length: 5 }, () => Array<boolean>(5).fill(true));
    state.players.a!.wall[0]![0] = false; state.players.a!.lines[0] = { color: 'blue', count: 1 };
    const result = game.applyAction(state, actor('a'), { type: 'draft', source: -1, color: 'black', row: -1 }, new DeterministicRng(1));
    expect(result.state.phase).toBe('finished');
    expect(result.state.lastRound.filter(s => s.kind === 'bonus').map(s => s.points)).toEqual([10, 35, 50]);
    expect(result.state.outcome.status).toBe('finished');
    expect(result.state.players.a!.score).toBe(103); // 10 adjacency -2 floor +95 bonuses
    if (result.state.outcome.status === 'finished') expect(result.state.outcome.winners).toEqual(['a']);
  });
  it.each([false, true])('shares tied scores unless completed horizontal rows break the tie (%s)', extraRow => {
    const state = setup(); state.factories = state.factories.map(() => []); state.center = ['black'];
    state.players.a!.wall[0] = [false, true, true, true, true];
    state.players.a!.lines[0] = { color: 'blue', count: 1 };
    state.players.b!.wall[0] = Array<boolean>(5).fill(true);
    state.players.a!.score = 2; state.players.b!.score = extraRow ? 9 : 5;
    if (extraRow) state.players.a!.wall[1] = Array<boolean>(5).fill(true);
    const next = game.applyAction(state, actor('a'), { type: 'draft', source: -1, color: 'black', row: -1 }, new DeterministicRng(1)).state;
    expect(next.players.a!.score).toBe(next.players.b!.score);
    if (next.outcome.status !== 'finished') throw new Error('Expected finished outcome');
    expect(next.outcome.winners).toEqual(extraRow ? ['a'] : ['a', 'b']);
  });
  it('refills from discards when the bag runs out and permits partially empty factories', () => {
    const state = setup(); state.factories = state.factories.map(() => []); state.center = ['red'];
    state.bag = ['white']; state.discard = ['blue'];
    const next = game.applyAction(state, actor('a'), { type: 'draft', source: -1, color: 'red', row: -1 }, new DeterministicRng(1)).state;
    expect(next.factories[0]).toEqual(['white', 'blue', 'red']);
    expect(next.factories.slice(1).every(f => !f.length)).toBe(true);
    expect(next.bag).toEqual([]); expect(next.discard).toEqual([]);
  });
  it.each([2, 3, 4])('completes and restores full %i-player AI games with tile conservation and legal actions', count => {
    for (const seed of [1, 42, 2026]) {
      const rng = new DeterministicRng(seed);
      let state = setup(count, rng), turns = 0;
      while (state.phase !== 'finished' && turns++ < 1500) {
        state = game.deserialize(JSON.parse(JSON.stringify(game.serialize(state))));
        const view = game.getView(state, { kind: 'seat', seatId: state.currentSeatId });
        const action = decideBasicAzul({ view, legalActions: view.legalActions });
        expect(action).not.toBeNull();
        const original = structuredClone(state);
        state = game.applyAction(state, actor(state.currentSeatId), action!, rng).state;
        expect(original).not.toBe(state);
      }
      expect(state.phase).toBe('finished'); expect(turns).toBeLessThan(1500);
      expect(game.deserialize(game.serialize(state))).toEqual(state);
      expect(game.getView(state, { kind: 'seat', seatId: 'a' }).legalActions).toEqual([]);
      const corrupt = structuredClone(state); corrupt.bag.push(colors[0]);
      expect(() => game.deserialize(corrupt)).toThrow('conservation');
    }
  });
  it('maps only projected event IDs to the shared audio pipeline', () => {
    expect(azulPresentationCues([{ type: 'round.scored' }])).toEqual([]);
    expect(azulPresentationCues([{ eventId: 'e', type: 'round.scored' }])).toEqual([{ eventId: 'e', cueIndex: 0, cueId: 'round.scored' }]);
  });
});
