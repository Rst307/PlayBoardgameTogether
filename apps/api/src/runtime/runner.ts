import { randomBytes, randomUUID } from 'node:crypto';
import { DeterministicRng, type Actor, type Viewer } from '@boardgame/game-sdk';
import type { GameRegistry } from '../registry/index.js';

export class RunnerError extends Error { constructor(readonly code: 'GAME_NOT_FOUND' | 'MATCH_NOT_FOUND' | 'STATE_CONFLICT' | 'ACTION_NOT_ALLOWED' | 'RATE_LIMITED', message: string) { super(message); } }
type Match = { id: string; gameId: string; version: string; seats: [string, string]; state: any; rng: DeterministicRng; revision: number; lastAccess: number };
export class LabRunner {
  private matches = new Map<string, Match>();
  constructor(private registry: GameRegistry, private now = () => Date.now(), private maxMatches = 20, private ttlMs = 30 * 60_000) {}
  private extension(match: Match) { const ext = this.registry.get(match.gameId, match.version); if (!ext) throw new RunnerError('GAME_NOT_FOUND', 'Game extension is unavailable'); return ext; }
  private find(id: string) { const match = this.matches.get(id); if (!match || this.now() - match.lastAccess > this.ttlMs) { this.matches.delete(id); throw new RunnerError('MATCH_NOT_FOUND', 'Development match was not found or expired'); } match.lastAccess = this.now(); return match; }
  create(gameId: string, version: string, rawOptions: unknown, seed?: number) {
    this.cleanup(); if (this.matches.size >= this.maxMatches) throw new RunnerError('RATE_LIMITED', 'Development match limit reached');
    const ext = this.registry.get(gameId, version); if (!ext) throw new RunnerError('GAME_NOT_FOUND', 'Game extension not found');
    const options = ext.validateOptions(rawOptions); const id = randomUUID(); const seats: [string, string] = ['seat-a', 'seat-b']; const rng = new DeterministicRng(seed ?? randomBytes(4).readUInt32LE());
    const setup = ext.setup({ seats, options, rng }); const match: Match = { id, gameId, version, seats, state: setup.state, rng, revision: 0, lastAccess: this.now() }; this.matches.set(id, match);
    return { matchId: id, seats, revision: 0, view: ext.getView(match.state, { kind: 'seat', seatId: seats[0] }), events: ext.projectEvents(setup.events, { kind: 'seat', seatId: seats[0] }).map((event: any, i: number) => ({ ...event, eventId: `${id}:0:${i}` })), delivery: 'snapshot' as const };
  }
  view(id: string, seatId: string) { const match = this.find(id); this.assertSeat(match, seatId); return { matchId: id, seats: match.seats, revision: match.revision, view: this.extension(match).getView(match.state, { kind: 'seat', seatId }), events: [], delivery: 'snapshot' as const }; }
  act(id: string, seatId: string, expectedRevision: number, rawAction: unknown) {
    const match = this.find(id); this.assertSeat(match, seatId); if (expectedRevision !== match.revision) throw new RunnerError('STATE_CONFLICT', `Expected revision ${expectedRevision}, current revision is ${match.revision}`);
    const ext = this.extension(match); const actor: Actor = { kind: 'seat', seatId, controllerEpoch: 0 }; const viewer: Viewer = { kind: 'seat', seatId }; const rng = match.rng.clone();
    try { const action = ext.parseAction(rawAction); ext.validateAction(match.state, actor, action); const result = ext.applyAction(match.state, actor, action, rng); const nextRevision = match.revision + 1; match.state = result.state; match.rng = rng as DeterministicRng; match.revision = nextRevision; return { matchId: id, seats: match.seats, revision: nextRevision, view: ext.getView(match.state, viewer), events: ext.projectEvents(result.events, viewer).map((event: any, i: number) => ({ ...event, eventId: `${id}:${nextRevision}:${i}` })), delivery: 'live' as const }; }
    catch (error) { if (error instanceof RunnerError) throw error; throw new RunnerError('ACTION_NOT_ALLOWED', error instanceof Error ? error.message : 'Action rejected'); }
  }
  delete(id: string) { this.matches.delete(id); }
  cleanup() { const now = this.now(); for (const [id, match] of this.matches) if (now - match.lastAccess > this.ttlMs) this.matches.delete(id); }
  close() { this.matches.clear(); }
  get size() { return this.matches.size; }
  private assertSeat(match: Match, seatId: string) { if (!match.seats.includes(seatId)) throw new RunnerError('ACTION_NOT_ALLOWED', 'Unknown test seat'); }
}
