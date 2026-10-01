import { z } from 'zod';
import {readFileSync} from 'node:fs';
import {assetManifestSchema,soundMapSchema,validateSoundReferences,type GameExtension, type Json, type Viewer} from '@boardgame/game-sdk';
import { actionSchema, manifest, roomManifest, optionsSchema, viewSchema, type CounterAction, type CounterOptions, type CounterView, type PublicCounterEvent } from '../shared/index.js';

export const counterAssetManifest=assetManifestSchema.parse(JSON.parse(readFileSync(new URL('../../assets/manifest.json',import.meta.url),'utf8')));
const counterSoundMap=soundMapSchema.parse(JSON.parse(readFileSync(new URL('../../assets/sounds.json',import.meta.url),'utf8')));
validateSoundReferences(counterAssetManifest,counterSoundMap);
for(const asset of counterAssetManifest.assets){
  const bytes=readFileSync(new URL(`../../assets/${asset.file}`,import.meta.url));
  if(asset.mediaType==='image/png'&&!bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')))throw new Error(`Invalid PNG resource: ${asset.id}`);
  if(asset.mediaType==='audio/wav'&&(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE'))throw new Error(`Invalid WAV resource: ${asset.id}`);
}

const outcomeSchema = z.object({ status: z.literal('ongoing') }).strict().or(z.object({ status: z.literal('finished'), winners: z.array(z.string()).min(1), scores: z.record(z.string(), z.number().int().nonnegative()) }).strict());
const stateSchema = z.object({
  schemaVersion: z.literal(1), seats: z.tuple([z.string(), z.string()]), scores: z.record(z.string(), z.number().int().nonnegative()), activeSeatId: z.string().nullable(), targetScore: z.number().int().min(2).max(10), privateHints: z.record(z.string(), z.number().int().min(0).max(999999)), outcome: outcomeSchema,
}).strict();
export type CounterState = z.infer<typeof stateSchema>;
type CounterEvent =
  | { scope: 'public'; type: 'counter.started' }
  | { scope: 'seat'; seatId: string; type: 'hint.assigned'; value: number }
  | { scope: 'public'; type: 'counter.added'; seatId: string; value: number }
  | { scope: 'public'; type: 'counter.finished'; scores: Record<string, number> };

function assertSeat(viewer: Viewer, state: CounterState): string {
  if (viewer.kind !== 'seat' || !state.seats.includes(viewer.seatId)) throw new Error('Viewer is not a game seat');
  return viewer.seatId;
}
function outcome(state: CounterState): Json { return state.outcome as Json; }

export const testCounterExtension: GameExtension<CounterState, CounterOptions, CounterAction, CounterView, CounterEvent, PublicCounterEvent> = {
  manifest: manifest as any,
  validateOptions: value => optionsSchema.parse(value),
  parseAction: value => actionSchema.parse(value),
  setup({ seats, options, rng }) {
    if (seats.length !== 2 || new Set(seats).size !== 2) throw new Error('Test Counter requires two distinct seats');
    const tuple = [seats[0]!, seats[1]!] as [string, string];
    const state: CounterState = { schemaVersion: 1, seats: tuple, scores: { [tuple[0]]: 0, [tuple[1]]: 0 }, activeSeatId: tuple[0], targetScore: options.targetScore, privateHints: { [tuple[0]]: rng.nextInt(0, 1_000_000), [tuple[1]]: rng.nextInt(0, 1_000_000) }, outcome: { status: 'ongoing' } };
    return { state, events: [{ scope: 'public', type: 'counter.started' }, ...tuple.map(seatId => ({ scope: 'seat' as const, seatId, type: 'hint.assigned' as const, value: state.privateHints[seatId]! }))] };
  },
  getView(state, viewer) { const seatId = assertSeat(viewer, state); return viewSchema.parse({ seats: state.seats, scores: state.scores, activeSeatId: state.activeSeatId, targetScore: state.targetScore, viewingSeatId: seatId, myHint: state.privateHints[seatId], outcome: state.outcome }); },
  getActionSpec(state, viewer) { const seatId = assertSeat(viewer, state); return { actions: [{ type: 'add', title: '增加分数', params: { value: { type: 'enum', values: [1, 2] } }, available: state.outcome.status === 'ongoing' && state.activeSeatId === seatId }] }; },
  validateAction(state, actor, action) { if (actor.kind !== 'seat' || !state.seats.includes(actor.seatId)) throw new Error('Actor is not a game seat'); if (state.outcome.status !== 'ongoing') throw new Error('Game has already finished'); if (state.activeSeatId !== actor.seatId) throw new Error('It is not this seat’s turn'); actionSchema.parse(action); },
  applyAction(state, actor, action) {
    this.validateAction(state, actor, action);
    if (actor.kind !== 'seat') throw new Error('Seat actor required');
    const next = structuredClone(state); next.scores[actor.seatId] = next.scores[actor.seatId]! + action.payload.value;
    const events: CounterEvent[] = [{ scope: 'public', type: 'counter.added', seatId: actor.seatId, value: action.payload.value }];
    if (next.scores[actor.seatId]! >= next.targetScore) { next.activeSeatId = null; next.outcome = { status: 'finished', winners: [actor.seatId], scores: { ...next.scores } }; events.push({ scope: 'public', type: 'counter.finished', scores: { ...next.scores } }); }
    else next.activeSeatId = next.seats.find(s => s !== actor.seatId)!;
    return { state: next, events };
  },
  projectEvents(events, viewer) { return events.filter(e => e.scope === 'public' || (viewer.kind === 'seat' && e.seatId === viewer.seatId)).map(e => { switch (e.type) { case 'counter.started': return { type: e.type }; case 'hint.assigned': return { type: e.type, seatId: e.seatId, value: e.value }; case 'counter.added': return { type: e.type, seatId: e.seatId, value: e.value }; case 'counter.finished': return { type: e.type, scores: e.scores }; } }); },
  getOutcome: outcome,
  serialize: state => state as unknown as Json,
  deserialize: value => stateSchema.parse(value),
  getFallbackAction(view) { return view.outcome.status === 'ongoing' && view.activeSeatId === view.viewingSeatId ? { type: 'add', payload: { value: 1 } } : null; },
};

export const counterRoomExtension = { ...testCounterExtension, manifest: roomManifest as any } satisfies typeof testCounterExtension;

export { stateSchema };
