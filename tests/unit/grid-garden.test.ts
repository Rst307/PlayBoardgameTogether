import { describe, expect, it } from 'vitest';
import { DeterministicRng } from '@boardgame/game-sdk';
import { gridGardenExtension } from '../../games/grid-garden/src/server/index.js';
import { listLegalPlacements, scoreBoard, type GardenAction, type GardenState } from '../../games/grid-garden/src/shared/index.js';

function setup(seats = ['a', 'b']) {
  return gridGardenExtension.setup({ seats, options: {}, rng: new DeterministicRng(1) }).state;
}
function act(state: GardenState, seatId: string, action: GardenAction) {
  return gridGardenExtension.applyAction(state, { kind: 'seat', seatId, controllerEpoch: 0 }, action, new DeterministicRng(1));
}

describe('Grid Garden rules', () => {
  it('starts 2–4 seats with independent empty 4x4 boards and hides choices until reveal', () => {
    for (const count of [2, 3, 4]) {
      const state = setup(Array.from({ length: count }, (_, index) => `s${index}`));
      expect(Object.values(state.boards).every(board => board.energy === 3 && board.placements.length === 0)).toBe(true);
      expect(gridGardenExtension.getView(state, { kind: 'seat', seatId: 's0' }).canBuild).toBe(true);
      expect(gridGardenExtension.getActionSpec(state, { kind: 'seat', seatId: 's0' })).toMatchObject({ actions: ['harvest', 'build'] });
      const one = act(state, 's0', { type: 'submit_choice', round: 1, choice: 'build' }).state;
      const own = gridGardenExtension.getView(one, { kind: 'seat', seatId: 's0' });
      const other = gridGardenExtension.getView(one, { kind: 'seat', seatId: 's1' });
      expect(own.myChoice).toBe('build');
      expect(own.revealedChoices).toBeNull();
      expect(other.myChoice).toBeNull();
      expect(other.revealedChoices).toBeNull();
      expect(other.boards.s0?.energy).toBe(3);
    }
  });

  it('offers 24 unique placements on an empty board and rejects invalid geometry', () => {
    const legal = listLegalPlacements([]);
    expect(legal).toHaveLength(24);
    expect(new Set(legal.map(item => `${item.x},${item.y},${item.orientation}`)).size).toBe(24);
    expect(legal).not.toContainEqual({ x: 3, y: 1, orientation: 'H' });
    expect(legal).not.toContainEqual({ x: 2, y: 3, orientation: 'V' });
  });

  it('publishes all choices together, waits for every builder, and rejects overlap', () => {
    let state = setup();
    state = act(state, 'a', { type: 'submit_choice', round: 1, choice: 'build' }).state;
    const result = act(state, 'b', { type: 'submit_choice', round: 1, choice: 'build' });
    state = result.state;
    expect(state.phase).toBe('placing');
    expect(state.boards.a?.energy).toBe(2);
    expect(result.events.map(item => item.payload.type)).toContain('choices.revealed');
    state = act(state, 'a', { type: 'place_domino', round: 1, x: 0, y: 0, orientation: 'H' }).state;
    expect(state.phase).toBe('placing');
    state = act(state, 'b', { type: 'place_domino', round: 1, x: 0, y: 0, orientation: 'H' }).state;
    expect(state.round).toBe(2);
    expect(state.phase).toBe('selecting');
    state = act(state, 'a', { type: 'submit_choice', round: 2, choice: 'build' }).state;
    state = act(state, 'b', { type: 'submit_choice', round: 2, choice: 'harvest' }).state;
    expect(state.phase).toBe('placing');
    expect(() => act(state, 'a', { type: 'place_domino', round: 2, x: 0, y: 0, orientation: 'H' })).toThrow();
  });

  it('completes three rounds and scores from an independent formula with ties', () => {
    let state = setup(['a', 'b', 'c']);
    for (let round = 1; round <= 3; round++) {
      for (const seatId of state.seats) {
        const choice = seatId === 'a' && round < 3 || seatId === 'b' && round === 1 ? 'build' : 'harvest';
        state = act(state, seatId, { type: 'submit_choice', round, choice }).state;
      }
      if (state.phase === 'placing') for (const seatId of [...state.builders]) {
        const first = listLegalPlacements(state.boards[seatId]!.placements)[0]!;
        state = act(state, seatId, { type: 'place_domino', round, ...first }).state;
      }
    }
    expect(state.phase).toBe('finished');
    const independent = Object.fromEntries(state.seats.map(id => [id, state.boards[id]!.placements.length * 2 + Math.floor(state.boards[id]!.energy / 2)]));
    expect(state.outcome.status).toBe('finished');
    if (state.outcome.status === 'finished') {
      expect(state.outcome.scores).toEqual(independent);
      expect(state.outcome.winners).toContain('a');
      expect(state.outcome.winners).toContain('b');
    }
    expect(scoreBoard(state.boards.a!)).toBe(independent.a);
  });

  it('automatically advances all-harvest rounds and keeps results independent of submission order', () => {
    const play = (order: string[]) => {
      let state = setup(['a', 'b', 'c']);
      for (let round = 1; round <= 3; round++) {
        for (const seatId of order) state = act(state, seatId, { type: 'submit_choice', round, choice: 'harvest' }).state;
      }
      return state;
    };
    const forward = play(['a', 'b', 'c']);
    const reverse = play(['c', 'b', 'a']);
    expect(forward.phase).toBe('finished');
    expect(forward.boards).toEqual(reverse.boards);
    expect(forward.roundResults).toEqual(reverse.roundResults);
    expect(forward.outcome).toEqual({
      status: 'finished',
      scores: { a: 4, b: 4, c: 4 },
      scoreDetails: {
        a: { occupied: 0, energy: 4, total: 4 },
        b: { occupied: 0, energy: 4, total: 4 },
        c: { occupied: 0, energy: 4, total: 4 },
      },
      winners: ['a', 'b', 'c'],
    });
  });

  it('rejects malformed actions and corrupted persisted board invariants', () => {
    const state = setup();
    expect(() => gridGardenExtension.parseAction({ type: 'place_domino', round: 1, x: 3, y: 0, orientation: 'diagonal' })).toThrow();
    expect(() => gridGardenExtension.parseAction({ type: 'place_domino', round: 1, x: 0.5, y: 0, orientation: 'H' })).toThrow();
    const corrupted = structuredClone(state);
    corrupted.boards.a!.placements = [
      { id: 'a:1', x: 0, y: 0, orientation: 'H' },
      { id: 'a:1', x: 1, y: 0, orientation: 'V' },
    ];
    expect(() => gridGardenExtension.deserialize(corrupted)).toThrow(/Placement/);
  });
});
