import { z } from 'zod';
import type { GameExtension, Json, Viewer } from '@boardgame/game-sdk';
import type { MultiActorDecisionRequests } from '@boardgame/game-sdk/multi-action';
import { actionSchema, boardSchema, cellsFor, choiceSchema, listLegalPlacements, manifest, optionsSchema, placementSchema, scoreBoard, viewSchema, type Choice, type GardenAction, type GardenEvent, type GardenView, type Placement } from '../shared/index.js';
export { gridGardenAssetManifest } from './assets.js';

const stateSchema = z.object({
  schemaVersion: z.literal(1), seats: z.array(z.string()).min(2).max(4), round: z.number().int().min(1).max(3),
  phase: z.enum(['selecting', 'placing', 'finished']), boards: z.record(z.string(), boardSchema),
  choices: z.record(z.string(), choiceSchema.nullable()), builders: z.array(z.string()), placedSeatIds: z.array(z.string()),
  roundResults: z.array(z.object({ round: z.number().int(), choices: z.record(z.string(), choiceSchema), energy: z.record(z.string(), z.number().int().nonnegative()) }).strict()),
  outcome: z.object({ status: z.literal('ongoing') }).strict().or(z.object({
    status: z.literal('finished'),
    scores: z.record(z.string(), z.number().int().nonnegative()),
    scoreDetails: z.record(z.string(), z.object({ occupied: z.number().int().nonnegative(), energy: z.number().int().nonnegative(), total: z.number().int().nonnegative() }).strict()),
    winners: z.array(z.string()).min(1),
  }).strict()),
}).strict();
export type GardenState = z.infer<typeof stateSchema>;
type InternalEvent = { scope: 'public'; payload: GardenEvent };
const event = (payload: GardenEvent): InternalEvent => ({ scope: 'public', payload });

function assertExactSeatKeys(label: string, seats: string[], value: Record<string, unknown>) {
  const expected = [...seats].sort();
  const actual = Object.keys(value).sort();
  if (expected.length !== actual.length || expected.some((seat, index) => seat !== actual[index]))
    throw new Error(`${label} seat keys are inconsistent`);
}

function assertStateInvariants(state: GardenState) {
  if (new Set(state.seats).size !== state.seats.length) throw new Error('Seat ids must be unique');
  assertExactSeatKeys('boards', state.seats, state.boards);
  assertExactSeatKeys('choices', state.seats, state.choices);
  if (new Set(state.builders).size !== state.builders.length || state.builders.some(id => !state.seats.includes(id))) throw new Error('Builders are inconsistent');
  if (new Set(state.placedSeatIds).size !== state.placedSeatIds.length || state.placedSeatIds.some(id => !state.builders.includes(id))) throw new Error('Placed seats are inconsistent');
  for (const seatId of state.seats) {
    const occupied = new Set<string>();
    const rounds = new Set<number>();
    for (const placement of state.boards[seatId]!.placements) {
      const round = Number(placement.id.slice(seatId.length + 1));
      if (!placement.id.startsWith(`${seatId}:`) || !Number.isInteger(round) || round < 1 || round > state.round || rounds.has(round)) throw new Error('Placement id is inconsistent');
      rounds.add(round);
      for (const [x, y] of cellsFor(placement.x, placement.y, placement.orientation)) {
        const key = `${x},${y}`;
        if (x < 0 || x > 3 || y < 0 || y > 3 || occupied.has(key)) throw new Error('Placements overlap or leave the board');
        occupied.add(key);
      }
    }
  }
  for (const result of state.roundResults) {
    assertExactSeatKeys('round choices', state.seats, result.choices);
    assertExactSeatKeys('round energy', state.seats, result.energy);
  }
  if (state.roundResults.some((result, index) => result.round !== index + 1)) throw new Error('Round results are not contiguous');
  const resolvedRounds = state.phase === 'selecting' ? state.round - 1 : state.round;
  if (state.roundResults.length !== resolvedRounds) throw new Error('Round result count is inconsistent');
  if (state.phase === 'selecting' && (state.builders.length || state.placedSeatIds.length)) throw new Error('Selecting phase contains placement state');
  if (state.phase !== 'selecting') {
    if (state.seats.some(id => state.choices[id] === null)) throw new Error('Resolved phase contains a missing choice');
    const expectedBuilders = state.seats.filter(id => state.choices[id] === 'build');
    if (expectedBuilders.some((id, index) => state.builders[index] !== id) || expectedBuilders.length !== state.builders.length) throw new Error('Builder list does not match choices');
  }
  if (state.phase === 'placing' && state.builders.every(id => state.placedSeatIds.includes(id))) throw new Error('Completed placements did not advance the round');
  if (state.phase === 'finished') {
    if (state.round !== 3 || state.builders.some(id => !state.placedSeatIds.includes(id)) || state.outcome.status !== 'finished') throw new Error('Finished state is inconsistent');
    const outcome = state.outcome;
    const scores = Object.fromEntries(state.seats.map(id => [id, scoreBoard(state.boards[id]!)]));
    assertExactSeatKeys('scores', state.seats, outcome.scores);
    assertExactSeatKeys('score details', state.seats, outcome.scoreDetails);
    if (state.seats.some(id => outcome.scores[id] !== scores[id])) throw new Error('Finished scores are inconsistent');
    if (state.seats.some(id => {
      const details = outcome.scoreDetails[id]!, board = state.boards[id]!;
      return details.occupied !== board.placements.length * 2 || details.energy !== Math.floor(board.energy / 2) || details.total !== scores[id];
    })) throw new Error('Finished score details are inconsistent');
    const high = Math.max(...Object.values(scores));
    const winners = state.seats.filter(id => scores[id] === high);
    if (winners.some((id, index) => outcome.winners[index] !== id) || winners.length !== outcome.winners.length) throw new Error('Finished winners are inconsistent');
  } else if (state.outcome.status !== 'ongoing') throw new Error('Ongoing state has a final outcome');
}

function seatOf(state: GardenState, viewer: Viewer) {
  if (viewer.kind !== 'seat' || !state.seats.includes(viewer.seatId)) throw new Error('Unknown seat');
  return viewer.seatId;
}
function finish(state: GardenState, events: InternalEvent[]) {
  const scoreDetails = Object.fromEntries(state.seats.map(id => {
    const board = state.boards[id]!, occupied = board.placements.length * 2, energy = Math.floor(board.energy / 2);
    return [id, { occupied, energy, total: occupied + energy }];
  }));
  const scores = Object.fromEntries(state.seats.map(id => [id, scoreDetails[id]!.total]));
  const high = Math.max(...Object.values(scores));
  const winners = state.seats.filter(id => scores[id] === high);
  state.phase = 'finished';
  state.outcome = { status: 'finished', scores, scoreDetails, winners };
  events.push(event({ type: 'match.finished', scores, winners }));
}
function startNextRound(state: GardenState, events: InternalEvent[]) {
  if (state.round === 3) { finish(state, events); return; }
  state.round++;
  state.phase = 'selecting';
  state.choices = Object.fromEntries(state.seats.map(id => [id, null]));
  state.builders = [];
  state.placedSeatIds = [];
  events.push(event({ type: 'round.started', round: state.round }));
}
function resolveChoices(state: GardenState, events: InternalEvent[]) {
  const choices = Object.fromEntries(state.seats.map(id => [id, state.choices[id]!])) as Record<string, Choice>;
  const builders = state.seats.filter(id => choices[id] === 'build');
  for (const id of state.seats) state.boards[id]!.energy += choices[id] === 'harvest' ? 2 : -1;
  const energy = Object.fromEntries(state.seats.map(id => [id, state.boards[id]!.energy]));
  state.roundResults.push({ round: state.round, choices, energy });
  state.builders = builders;
  events.push(event({ type: 'choices.revealed', choices }));
  events.push(event({ type: 'energy.resolved', energy }));
  if (builders.length) state.phase = 'placing';
  else startNextRound(state, events);
}

export const gridGardenExtension: GameExtension<GardenState, Record<string, never>, GardenAction, GardenView, InternalEvent, GardenEvent> & MultiActorDecisionRequests<GardenState> = {
  manifest,
  validateOptions: value => optionsSchema.parse(value),
  parseAction: value => actionSchema.parse(value),
  setup({ seats }) {
    if (seats.length < 2 || seats.length > 4 || new Set(seats).size !== seats.length) throw new Error('Grid Garden needs 2–4 unique seats');
    return { state: { schemaVersion: 1, seats: [...seats], round: 1, phase: 'selecting',
      boards: Object.fromEntries(seats.map(id => [id, { energy: 3, placements: [] }])),
      choices: Object.fromEntries(seats.map(id => [id, null])), builders: [], placedSeatIds: [], roundResults: [], outcome: { status: 'ongoing' } }, events: [] };
  },
  getView(state, viewer) {
    const seatId = seatOf(state, viewer);
    const canBuild = state.phase === 'selecting' && state.choices[seatId] === null && state.boards[seatId]!.energy > 0 && listLegalPlacements(state.boards[seatId]!.placements).length > 0;
    return viewSchema.parse({ seats: state.seats, viewingSeatId: seatId, round: state.round, phase: state.phase,
      boards: state.boards, submittedSeatIds: state.seats.filter(id => state.choices[id] !== null),
      revealedChoices: state.phase === 'selecting' ? null : Object.fromEntries(state.seats.map(id => [id, state.choices[id]!])),
      myChoice: state.choices[seatId], canBuild, builders: state.builders, placedSeatIds: state.placedSeatIds,
      roundResults: state.roundResults, outcome: state.outcome,
      legalPlacements: state.phase === 'placing' && state.builders.includes(seatId) && !state.placedSeatIds.includes(seatId) ? listLegalPlacements(state.boards[seatId]!.placements) : [],
    });
  },
  getActionSpec(state, viewer) {
    const view = this.getView(state, viewer);
    return { phase: view.phase, round: view.round, actions: view.phase === 'selecting' ? ['harvest', ...(view.canBuild ? ['build'] : [])] : view.legalPlacements };
  },
  getDecisionContext(state, viewer) {
    const view = this.getView(state, viewer);
    if (view.phase === 'selecting' && view.myChoice === null) {
      const canBuild = view.boards[view.viewingSeatId]!.energy > 0 && listLegalPlacements(view.boards[view.viewingSeatId]!.placements).length > 0;
      return { decisionKey: `round:${view.round}:select`, legalActions: [
        { type: 'submit_choice', round: view.round, choice: 'harvest' },
        ...(canBuild ? [{ type: 'submit_choice' as const, round: view.round, choice: 'build' as const }] : []),
      ] };
    }
    if (view.phase === 'placing' && view.builders.includes(view.viewingSeatId) && !view.placedSeatIds.includes(view.viewingSeatId))
      return { decisionKey: `round:${view.round}:place`, legalActions: view.legalPlacements.map(item => ({ type: 'place_domino' as const, round: view.round, ...item })) };
    return null;
  },
  getDecisionRequests(state) {
    if (state.phase === 'selecting') return state.seats.filter(id => state.choices[id] === null).map(seatId => ({ seatId, decisionKey: `round:${state.round}:select` }));
    if (state.phase === 'placing') return state.builders.filter(id => !state.placedSeatIds.includes(id)).map(seatId => ({ seatId, decisionKey: `round:${state.round}:place` }));
    return [];
  },
  validateAction(state, actor, action) {
    if (actor.kind !== 'seat' || !state.seats.includes(actor.seatId)) throw new Error('Unknown actor');
    if (state.phase === 'finished') throw new Error('Game has finished');
    actionSchema.parse(action);
    if (action.round !== state.round) throw new Error('Round mismatch');
    if (action.type === 'submit_choice') {
      if (state.phase !== 'selecting') throw new Error('Not accepting choices');
      if (state.choices[actor.seatId] !== null) throw new Error('Choice already submitted');
      if (action.choice === 'build' && (state.boards[actor.seatId]!.energy < 1 || !listLegalPlacements(state.boards[actor.seatId]!.placements).length)) throw new Error('Build is unavailable');
      return;
    }
    if (state.phase !== 'placing' || !state.builders.includes(actor.seatId)) throw new Error('Seat is not placing');
    if (state.placedSeatIds.includes(actor.seatId)) throw new Error('Domino already placed');
    if (!listLegalPlacements(state.boards[actor.seatId]!.placements).some(item => item.x === action.x && item.y === action.y && item.orientation === action.orientation)) throw new Error('Placement is invalid');
  },
  applyAction(state, actor, action) {
    this.validateAction(state, actor, action);
    if (actor.kind !== 'seat') throw new Error('Seat actor required');
    const next = structuredClone(state), events: InternalEvent[] = [];
    if (action.type === 'submit_choice') {
      next.choices[actor.seatId] = action.choice;
      events.push(event({ type: 'choice.submitted', seatId: actor.seatId }));
      if (next.seats.every(id => next.choices[id] !== null)) resolveChoices(next, events);
    } else {
      const placement: Placement = { id: `${actor.seatId}:${next.round}`, x: action.x, y: action.y, orientation: action.orientation };
      placementSchema.parse(placement);
      next.boards[actor.seatId]!.placements.push(placement);
      next.placedSeatIds.push(actor.seatId);
      events.push(event({ type: 'domino.placed', seatId: actor.seatId, placement }));
      if (next.builders.every(id => next.placedSeatIds.includes(id))) startNextRound(next, events);
    }
    return { state: next, events };
  },
  projectEvents(events) { return events.map(item => item.payload); },
  getOutcome(state): Json { return state.outcome as Json; },
  serialize(state): Json { return state as unknown as Json; },
  deserialize(value) { const state = stateSchema.parse(value); assertStateInvariants(state); return state; },
  getFallbackAction(view, actionSpec) {
    if (view.phase === 'selecting' && view.myChoice === null) {
      const actions = actionSpec && typeof actionSpec === 'object' && 'actions' in actionSpec ? actionSpec.actions : [];
      return Array.isArray(actions) && actions.includes('build') ? { type: 'submit_choice', round: view.round, choice: 'build' } : { type: 'submit_choice', round: view.round, choice: 'harvest' };
    }
    const first = view.legalPlacements[0];
    return first ? { type: 'place_domino', round: view.round, ...first } : null;
  },
};

export function decideBasicGridGarden(input: { view: GardenView; legalActions: readonly GardenAction[] }) {
  if (input.view.phase === 'selecting') return input.legalActions.find(action => action.type === 'submit_choice' && action.choice === 'build') ?? input.legalActions[0]!;
  return [...input.legalActions].sort((a, b) => {
    if (a.type !== 'place_domino' || b.type !== 'place_domino') return 0;
    return a.y - b.y || a.x - b.x || (a.orientation === b.orientation ? 0 : a.orientation === 'H' ? -1 : 1);
  })[0]!;
}
