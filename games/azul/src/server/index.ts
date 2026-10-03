import { z } from 'zod';
import type { GameExtension, Json, RandomSource } from '@boardgame/game-sdk';
import {
  actionSchema, colors, completedRows, connection, floorPenalties, manifest, optionsSchema,
  outcomeSchema, playerSchema, scoreStepSchema, viewSchema, wallColor, wallColumn,
  type AzulAction, type AzulView, type Color, type Player, type ScoreStep,
} from '../shared/index.js';

const stateSchema = z.object({
  schemaVersion: z.literal(1), seats: z.array(z.string()).min(2).max(4),
  currentSeatId: z.string(), round: z.number().int().positive(), phase: z.enum(['drafting', 'finished']),
  factories: z.array(z.array(z.enum(colors)).max(4)).min(5).max(9), center: z.array(z.enum(colors)).max(100),
  firstAvailable: z.boolean(), nextStarter: z.string().nullable(),
  bag: z.array(z.enum(colors)).max(100), discard: z.array(z.enum(colors)).max(100),
  players: z.record(z.string(), playerSchema), lastRound: z.array(scoreStepSchema).max(44), outcome: outcomeSchema,
}).strict();
export type AzulState = z.infer<typeof stateSchema>;
type Event = { type: 'tiles.drafted'; seatId: string; color: Color; count: number; row: number; source: number }
  | { type: 'round.scored'; round: number; steps: ScoreStep[] }
  | { type: 'match.finished'; winners: string[] };
type InternalEvent = { public: Event };
export const azulAssetManifest = { id: 'azul.original', version: '1.0.0', language: 'zh-CN', assets: [] };

function refill(state: AzulState, rng: RandomSource) {
  for (let i = 0; i < state.factories.length; i++) {
    const factory: Color[] = [];
    for (let j = 0; j < 4; j++) {
      if (!state.bag.length) { state.bag = state.discard; state.discard = []; }
      if (!state.bag.length) break;
      factory.push(state.bag.splice(rng.nextInt(0, state.bag.length), 1)[0]!);
    }
    state.factories[i] = factory;
  }
}
function legalActions(state: AzulState, seatId: string): AzulAction[] {
  if (state.phase !== 'drafting' || state.currentSeatId !== seatId) return [];
  const player = state.players[seatId];
  if (!player) return [];
  return [state.center, ...state.factories].flatMap((tiles, index) => [...new Set(tiles)].flatMap(color => {
    const rows = player.lines.flatMap((line, row) => line.count < row + 1 && (line.color === null || line.color === color)
      && !player.wall[row]![wallColumn(row, color)] ? [row] : []);
    return [...rows, -1].map(row => ({ type: 'draft' as const, source: index - 1, color, row }));
  }));
}
function addFloor(state: AzulState, player: Player, tile: Color | 'first') {
  if (player.floor.length < 7) player.floor.push(tile);
  else if (tile !== 'first') state.discard.push(tile);
}
function addScore(player: Player, steps: ScoreStep[], input: Omit<ScoreStep, 'from' | 'total'>) {
  const from = player.score;
  player.score = Math.max(0, from + input.points);
  steps.push({ ...input, from, total: player.score });
}
function resolveRound(state: AzulState, rng: RandomSource, events: InternalEvent[]) {
  const steps: ScoreStep[] = [];
  for (const seatId of state.seats) {
    const player = state.players[seatId]!;
    for (const [row, line] of player.lines.entries()) {
      if (line.count !== row + 1 || line.color === null) continue;
      const color = line.color, col = wallColumn(row, color);
      player.wall[row]![col] = true;
      const { points, cells } = connection(player.wall, row, col);
      addScore(player, steps, { seatId, kind: 'tile', row, col, color, points, cells,
        label: points >= 6 ? '交织连线' : points > 1 ? '连线得分' : '花砖落位' });
      state.discard.push(...Array<Color>(row).fill(color));
      player.lines[row] = { color: null, count: 0 };
    }
    if (player.floor.length) {
      const points = -floorPenalties.slice(0, player.floor.length).reduce((a, b) => a + b, 0);
      addScore(player, steps, { seatId, kind: 'floor', row: -1, col: -1, color: null, points, cells: [], label: '地板扣分' });
      state.discard.push(...player.floor.filter((tile): tile is Color => tile !== 'first'));
      player.floor = [];
    }
  }
  if (state.seats.some(id => completedRows(state.players[id]!) > 0)) {
    state.phase = 'finished';
    for (const seatId of state.seats) {
      const player = state.players[seatId]!;
      const rows = completedRows(player);
      const columns = [0, 1, 2, 3, 4].filter(col => player.wall.every(row => row[col])).length;
      const sets = colors.filter(color => player.wall.every((row, r) => row[wallColumn(r, color)])).length;
      for (const [count, value, label] of [[rows, 2, '完整横行'], [columns, 7, '完整竖列'], [sets, 10, '同色集齐']] as const) {
        if (count) addScore(player, steps, { seatId, kind: 'bonus', row: -1, col: -1, color: null,
          points: count * value, cells: [], label: `${label} ×${count}` });
      }
    }
    const scores = Object.fromEntries(state.seats.map(id => [id, state.players[id]!.score]));
    const high = Math.max(...Object.values(scores));
    const tied = state.seats.filter(id => scores[id] === high);
    const rowHigh = Math.max(...tied.map(id => completedRows(state.players[id]!)));
    const winners = tied.filter(id => completedRows(state.players[id]!) === rowHigh);
    state.outcome = { status: 'finished', scores, winners };
  }
  state.lastRound = steps;
  events.push({ public: { type: 'round.scored', round: state.round, steps } });
  if (state.outcome.status === 'finished') events.push({ public: { type: 'match.finished', winners: state.outcome.winners } });
  else {
    state.round++;
    state.currentSeatId = state.nextStarter ?? state.currentSeatId;
    state.nextStarter = null;
    state.firstAvailable = true;
    refill(state, rng);
  }
}
function assertState(state: AzulState) {
  if (new Set(state.seats).size !== state.seats.length || !state.seats.includes(state.currentSeatId)
    || Object.keys(state.players).length !== state.seats.length || state.seats.some(id => !state.players[id])
    || state.factories.length !== state.seats.length * 2 + 1) throw new Error('Invalid seats/factories');
  if (state.firstAvailable !== (state.nextStarter === null)
    || state.nextStarter !== null && !state.seats.includes(state.nextStarter)) throw new Error('Invalid starter');
  const inventory = [...state.bag, ...state.discard, ...state.center, ...state.factories.flat()];
  let markers = 0;
  for (const player of Object.values(state.players)) {
    for (const [row, line] of player.lines.entries()) {
      if (line.count > row + 1 || (line.count === 0) !== (line.color === null)
        || line.color !== null && player.wall[row]![wallColumn(row, line.color)]) throw new Error('Invalid pattern line');
      if (line.color) inventory.push(...Array<Color>(line.count).fill(line.color));
    }
    player.wall.forEach((row, r) => row.forEach((filled, c) => { if (filled) inventory.push(wallColor(r, c)); }));
    for (const tile of player.floor) {
      if (tile === 'first') markers++; else inventory.push(tile);
    }
  }
  if (colors.some(color => inventory.filter(tile => tile === color).length !== 20)) throw new Error('Invalid tile conservation');
  if (markers > 1 || markers && state.firstAvailable) throw new Error('Invalid first marker');
  if (state.seats.some(id => state.players[id]!.floor.includes('first') && state.nextStarter !== id)) throw new Error('Invalid marker owner');
  const ended = state.phase === 'finished';
  if (ended !== (state.outcome.status === 'finished') || ended !== state.seats.some(id => completedRows(state.players[id]!) > 0)) throw new Error('Invalid outcome phase');
  if (ended && (state.center.length || state.factories.some(f => f.length) || Object.values(state.players).some(p => p.floor.length))) throw new Error('Unresolved finished round');
  if (state.outcome.status === 'finished') {
    const outcome = state.outcome;
    const high = Math.max(...state.seats.map(id => state.players[id]!.score));
    const tied = state.seats.filter(id => state.players[id]!.score === high);
    const rows = Math.max(...tied.map(id => completedRows(state.players[id]!)));
    const winners = tied.filter(id => completedRows(state.players[id]!) === rows);
    if (Object.keys(outcome.scores).length !== state.seats.length || state.seats.some(id => outcome.scores[id] !== state.players[id]!.score)
      || JSON.stringify(winners) !== JSON.stringify(outcome.winners)) throw new Error('Invalid final scores');
  } else if (!state.center.length && state.factories.every(f => !f.length)) throw new Error('Empty active offer');
}

export const azulExtension: GameExtension<AzulState, Record<string, never>, AzulAction, AzulView, InternalEvent, Event> = {
  manifest,
  validateOptions: value => optionsSchema.parse(value),
  parseAction: value => actionSchema.parse(value),
  setup({ seats, rng }) {
    if (seats.length < 2 || seats.length > 4 || new Set(seats).size !== seats.length) throw new Error('Need 2–4 unique seats');
    const state: AzulState = {
      schemaVersion: 1, seats: [...seats], currentSeatId: seats[0]!, round: 1, phase: 'drafting',
      factories: Array.from({ length: seats.length * 2 + 1 }, () => []), center: [], firstAvailable: true, nextStarter: null,
      bag: colors.flatMap(color => Array<Color>(20).fill(color)), discard: [],
      players: Object.fromEntries(seats.map(id => [id, { score: 0, lines: Array.from({ length: 5 }, () => ({ color: null, count: 0 })),
        wall: Array.from({ length: 5 }, () => Array<boolean>(5).fill(false)), floor: [] }])), lastRound: [], outcome: { status: 'ongoing' },
    };
    refill(state, rng);
    return { state, events: [] };
  },
  getView(state, viewer) {
    if (viewer.kind !== 'seat' || !state.seats.includes(viewer.seatId)) throw new Error('Unknown viewer');
    return viewSchema.parse({
      seats: state.seats, currentSeatId: state.currentSeatId, round: state.round, phase: state.phase,
      factories: state.factories, center: state.center, firstAvailable: state.firstAvailable, nextStarter: state.nextStarter,
      players: state.players, lastRound: state.lastRound, outcome: state.outcome,
      viewingSeatId: viewer.seatId, bagCount: state.bag.length, legalActions: legalActions(state, viewer.seatId),
    });
  },
  getActionSpec(state, viewer) { return { actions: this.getView(state, viewer).legalActions }; },
  getDecisionContext(state, viewer) {
    const view = this.getView(state, viewer);
    return view.legalActions.length ? { decisionKey: `round:${state.round}:draft`, legalActions: view.legalActions } : null;
  },
  validateAction(state, actor, action) {
    actionSchema.parse(action);
    if (actor.kind !== 'seat' || !legalActions(state, actor.seatId).some(a => a.source === action.source && a.color === action.color && a.row === action.row)) throw new Error('Illegal draft');
  },
  applyAction(state, actor, action, rng) {
    this.validateAction(state, actor, action);
    if (actor.kind !== 'seat') throw new Error('Seat required');
    const next = structuredClone(state), player = next.players[actor.seatId]!;
    const source = action.source === -1 ? next.center : next.factories[action.source]!;
    const count = source.filter(tile => tile === action.color).length;
    if (action.source === -1) {
      next.center = source.filter(tile => tile !== action.color);
      if (next.firstAvailable) {
        next.firstAvailable = false; next.nextStarter = actor.seatId;
        addFloor(next, player, 'first');
      }
    } else {
      next.center.push(...source.filter(tile => tile !== action.color));
      next.factories[action.source] = [];
    }
    let remaining = count;
    if (action.row >= 0) {
      const line = player.lines[action.row]!, placed = Math.min(count, action.row + 1 - line.count);
      line.count += placed; line.color = action.color; remaining -= placed;
    }
    for (let i = 0; i < remaining; i++) addFloor(next, player, action.color);
    const events: InternalEvent[] = [{ public: { type: 'tiles.drafted', seatId: actor.seatId, color: action.color, count, row: action.row, source: action.source } }];
    next.currentSeatId = next.seats[(next.seats.indexOf(actor.seatId) + 1) % next.seats.length]!;
    if (!next.center.length && next.factories.every(f => !f.length)) resolveRound(next, rng, events);
    return { state: next, events };
  },
  projectEvents(events) { return events.map(event => structuredClone(event.public)); },
  getOutcome(state) { return state.outcome; },
  serialize(state): Json { return structuredClone(state) as unknown as Json; },
  deserialize(value) { const state = stateSchema.parse(value); assertState(state); return state; },
  getFallbackAction(view) { return decideBasicAzul({ view, legalActions: view.legalActions }); },
};
export function decideBasicAzul(input: { view: AzulView; legalActions: readonly AzulAction[] }): AzulAction | null {
  const player = input.view.players[input.view.viewingSeatId]!;
  function value(action: AzulAction) {
    const tiles = action.source === -1 ? input.view.center : input.view.factories[action.source]!;
    const count = tiles.filter(color => color === action.color).length;
    if (action.row < 0) return -count * 4 - 5;
    const line = player.lines[action.row]!, needed = action.row + 1 - line.count;
    const wall = structuredClone(player.wall), col = wallColumn(action.row, action.color);
    wall[action.row]![col] = true;
    return Math.min(count, needed) * 2 + (count >= needed ? connection(wall, action.row, col).points * 4 + 3 : 0)
      - Math.max(0, count - needed) * 4 - (action.source === -1 && input.view.firstAvailable ? 1 : 0);
  }
  return [...input.legalActions].sort((a, b) => value(b) - value(a))[0] ?? null;
}
