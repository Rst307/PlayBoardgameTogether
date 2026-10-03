import { DeterministicRng } from '@boardgame/game-sdk';
import { azulExtension as game, type AzulState } from '../../games/azul/src/server/index.js';
import { colors, wallColor, type AzulAction, type Color } from '../../games/azul/src/shared/index.js';

const seats = ['tutorial.you', 'tutorial.opponent'];
function scene(): AzulState {
  const state = game.setup({ seats, options: {}, rng: new DeterministicRng(42) }).state;
  state.factories = [['blue', 'blue', 'yellow', 'red'], ['white'], [], [], []];
  state.center = [];
  return state;
}
function conserve(state: AzulState): AzulState {
  const used: Color[] = [...state.factories.flat(), ...state.center, ...state.discard];
  for (const player of Object.values(state.players)) {
    for (const line of player.lines) if (line.color) used.push(...Array<Color>(line.count).fill(line.color));
    player.wall.forEach((row, r) => row.forEach((filled, c) => { if (filled) used.push(wallColor(r, c)); }));
    used.push(...player.floor.filter((tile): tile is Color => tile !== 'first'));
  }
  state.bag = colors.flatMap(color => Array<Color>(20 - used.filter(tile => tile === color).length).fill(color));
  return game.deserialize(game.serialize(state));
}

/** Authoritative synthetic states stay in tests; the browser receives public projections only. */
export function azulTutorialReferences(): { id: string; state: AzulState; action: AzulAction }[] {
  const take = scene();
  const same = scene();
  same.players[seats[0]!]!.lines[2] = { color: 'blue', count: 1 };
  same.players[seats[0]!]!.wall[1]![1] = true;
  const overflow = scene();
  const first = scene();
  first.center = ['yellow', 'yellow', 'red'];
  const scoring = scene();
  scoring.factories = [['blue'], [], [], [], []];
  scoring.players[seats[0]!]!.lines[4] = { color: 'red', count: 2 };
  const cross = scene();
  cross.factories = [['blue'], [], [], [], []];
  cross.players[seats[0]!]!.lines[2] = { color: 'blue', count: 2 };
  for (const [r, c] of [[2, 1], [2, 3], [1, 2], [3, 2]]) cross.players[seats[0]!]!.wall[r!]![c!] = true;
  const floor = scene();
  floor.factories = [[], [], [], [], []];
  floor.center = ['red'];
  floor.players[seats[0]!]!.score = 1;
  floor.players[seats[0]!]!.floor = ['yellow', 'yellow'];
  const finish = scene();
  finish.factories = [['blue'], [], [], [], []];
  const player = finish.players[seats[0]!]!;
  player.score = 10;
  player.wall = Array.from({ length: 5 }, () => Array<boolean>(5).fill(true));
  for (const [r, c] of [[0, 0], [1, 4], [2, 4], [3, 4], [4, 3]]) player.wall[r!]![c!] = false;
  const draft = (row: number, source = 0, color: Color = 'blue'): AzulAction => ({ type: 'draft', source, color, row });
  return [
    { id: 'factory', state: take, action: draft(1) },
    { id: 'pattern', state: same, action: draft(2) },
    { id: 'overflow', state: overflow, action: draft(0) },
    { id: 'first', state: first, action: draft(1, -1, 'yellow') },
    { id: 'wall', state: scoring, action: draft(0) },
    { id: 'cross', state: cross, action: draft(2) },
    { id: 'floor', state: floor, action: draft(-1, -1, 'red') },
    { id: 'finish', state: finish, action: draft(0) },
  ].map(reference => ({ ...reference, state: conserve(reference.state) }));
}
