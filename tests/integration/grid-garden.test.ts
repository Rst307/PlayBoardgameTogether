import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../apps/api/src/app.js';
import { createDatabase, type Database } from '../../apps/api/src/db/index.js';
import { createRegistry } from '../../apps/api/src/registry/index.js';
import { createAccount } from '../../apps/api/src/auth.js';
import { gridGardenExtension } from '../../games/grid-garden/src/server/index.js';
import { listLegalPlacements } from '../../games/grid-garden/src/shared/index.js';
import { spawn, type ChildProcess } from 'node:child_process';

process.loadEnvFile('.env');
const url = process.env.TEST_DATABASE_URL;
const origin = 'http://127.0.0.1:5173';
type Session = { cookie: string; csrf: string };

describe.skipIf(!url)('Grid Garden formal action flow', () => {
  let db: Database;
  let app: Awaited<ReturnType<typeof createApp>>;
  beforeAll(async () => {
    db = createDatabase(url!);
    app = await createApp({ config: { NODE_ENV: 'test', API_HOST: '127.0.0.1', API_PORT: 3001, DATABASE_URL: url!, WEB_ORIGIN: origin, ENABLE_DEV_LAB: false, LOG_LEVEL: 'error' }, db, registry: createRegistry(false) });
  });
  afterAll(async () => { await app.close(); });
  beforeEach(async () => {
    await db.query('TRUNCATE accounts CASCADE');
    for (const username of ['garden_a', 'garden_b', 'garden_c', 'garden_d']) await createAccount(db, { username, displayName: username, password: 'correct horse battery', role: 'user' });
  });
  async function login(username: string): Promise<Session> {
    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', headers: { origin }, payload: { username, password: 'correct horse battery' } });
    expect(response.statusCode).toBe(200);
    const raw = response.headers['set-cookie'], cookies = Array.isArray(raw) ? raw : [String(raw)];
    return { cookie: cookies.map(value => value.split(';')[0]).join('; '), csrf: response.json().data.csrfToken };
  }
  const write = (urlPath: string, session: Session, payload: unknown, method: 'POST' | 'PUT' = 'POST') => app.inject({ method, url: urlPath, headers: { origin, cookie: session.cookie, 'x-csrf-token': session.csrf }, payload });
  const read = (urlPath: string, session: Session) => app.inject({ url: urlPath, headers: { cookie: session.cookie } });
  async function start(seatCount = 2) {
    const sessions = await Promise.all(['garden_a', 'garden_b', 'garden_c', 'garden_d'].map(login));
    const created = await write('/api/v1/rooms', sessions[0]!, { requestId: 'create', name: 'Garden', gameId: 'grid-garden', version: '1.0.0', options: {}, seatCount });
    expect(created.statusCode).toBe(200);
    const { roomId, inviteCode } = created.json().data;
    let revision = 0;
    for (let index = 1; index < seatCount; index++) {
      const joined = await write('/api/v1/rooms/join', sessions[index]!, { requestId: `join-${index}`, inviteCode });
      expect(joined.statusCode).toBe(200); revision = joined.json().data.roomRevision;
      const seated = await write(`/api/v1/rooms/${roomId}/my-seat`, sessions[index]!, { requestId: `seat-${index}`, expectedRoomRevision: revision, seatIndex: index }, 'PUT');
      expect(seated.statusCode).toBe(200); revision = seated.json().data.roomRevision;
    }
    for (let index = 0; index < seatCount; index++) {
      const ready = await write(`/api/v1/rooms/${roomId}/my-ready`, sessions[index]!, { requestId: `ready-${index}`, expectedRoomRevision: revision, ready: true }, 'PUT');
      expect(ready.statusCode).toBe(200); revision = ready.json().data.roomRevision;
    }
    const launched = await write(`/api/v1/rooms/${roomId}/start`, sessions[0]!, { requestId: 'start', expectedRoomRevision: revision });
    expect(launched.statusCode).toBe(200);
    return { sessions, roomId, matchId: launched.json().data.matchId as string };
  }
  it('isolates unrevealed choices and serializes same-revision submissions', async () => {
    const { sessions, roomId, matchId } = await start();
    const endpoint = `/api/v1/matches/${matchId}`;
    const [a0, b0] = await Promise.all(sessions.slice(0, 2).map(session => read(`${endpoint}/view`, session)));
    expect(a0.json().data.view.boards[a0.json().data.view.viewingSeatId].energy).toBe(3);
    const requestA = { requestId: 'select-a', expectedRevision: 0, action: { type: 'submit_choice', round: 1, choice: 'build' } };
    const requestB = { requestId: 'select-b', expectedRevision: 0, action: { type: 'submit_choice', round: 1, choice: 'harvest' } };
    const [first, conflict] = await Promise.all([write(`${endpoint}/actions`, sessions[0]!, requestA), write(`${endpoint}/actions`, sessions[1]!, requestB)]);
    expect([first.statusCode, conflict.statusCode].sort()).toEqual([200, 409]);
    const winner = first.statusCode === 200 ? requestA : requestB;
    const actor = first.statusCode === 200 ? sessions[0]! : sessions[1]!;
    const other = first.statusCode === 200 ? sessions[1]! : sessions[0]!;
    const visible = (await read(`${endpoint}/view`, other)).json().data;
    expect(visible.view.revealedChoices).toBeNull();
    expect(visible.view.myChoice).toBeNull();
    expect(visible.view.submittedSeatIds).toHaveLength(1);
    expect((await write(`${endpoint}/actions`, actor, winner)).statusCode).toBe(200);
    expect((await read(`${endpoint}/commands/${winner.requestId}`, actor)).json().data.outcome).toBe('accepted');
    const hiddenBeforeReveal = (await read(`${endpoint}/view`, other)).json().data;
    const losingChoice = first.statusCode === 200 ? requestB : requestA;
    const reveal = await write(`${endpoint}/actions`, other, { ...losingChoice, requestId: 'select-other', expectedRevision: hiddenBeforeReveal.revision });
    expect(reveal.statusCode).toBe(200);
    const hidden = (await read(`${endpoint}/view`, other)).json().data;
    expect(hidden.view.revealedChoices).not.toBeNull();
    expect(hidden.view.boards[hidden.view.viewingSeatId].energy).not.toBe(3);
    expect(JSON.stringify(hidden.view.revealedChoices)).toContain(first.statusCode === 200 ? 'build' : 'harvest');
    expect(b0.statusCode).toBe(200);
    const room = (await read(`/api/v1/rooms/${roomId}`, sessions[0]!)).json().data;
    expect((await write(`/api/v1/rooms/${roomId}/close`, sessions[0]!, {
      requestId: 'close-for-replay', expectedRoomRevision: room.roomRevision,
    })).statusCode).toBe(200);
    const replay = await read(`${endpoint}/replay?revision=1`, other);
    expect(replay.statusCode).toBe(200);
    expect(replay.json().data.view).toEqual(visible.view);
    expect(replay.json().data.view.myChoice).toBeNull();
    expect(replay.json().data.view.revealedChoices).toBeNull();
    expect(JSON.stringify(replay.json().data.events)).not.toContain('build');
    expect(JSON.stringify(replay.json().data.events)).not.toContain('harvest');
  });

  it('enumerates all simultaneous AI requests, keeps boards independent, and persists placements', async () => {
    const initial = gridGardenExtension.setup({ seats: ['a', 'b', 'c', 'd'], options: {}, rng: { nextInt: () => 0, snapshot: () => ({ algorithm: 'mulberry32-v1', state: 0 }), clone() { return this; } } }).state;
    expect(gridGardenExtension.getDecisionRequests?.(initial).map(item => item.seatId)).toEqual(['a', 'b', 'c', 'd']);
    const started = await start(2);
    const endpoint = `/api/v1/matches/${started.matchId}`;
    for (let index = 0; index < 2; index++) {
      const current = (await read(`${endpoint}/view`, started.sessions[index]!)).json().data;
      const response = await write(`${endpoint}/actions`, started.sessions[index]!, { requestId: `build-${index}`, expectedRevision: current.revision, action: { type: 'submit_choice', round: 1, choice: 'build' } });
      expect(response.statusCode).toBe(200);
    }
    const latest = (await read(`${endpoint}/view`, started.sessions[1]!)).json().data;
    expect(latest.view.phase).toBe('placing');
    const firstLegal = listLegalPlacements(latest.view.boards[latest.view.viewingSeatId].placements)[0];
    const placed = await write(`${endpoint}/actions`, started.sessions[1]!, { requestId: 'place', expectedRevision: latest.revision, action: { type: 'place_domino', round: 1, ...firstLegal } });
    expect(placed.statusCode).toBe(200);
    const restored = (await read(`${endpoint}/view`, started.sessions[1]!)).json().data;
    expect(restored.view.boards[restored.view.viewingSeatId].placements).toHaveLength(1);
    expect(restored.view.boards[restored.view.seats[0]].placements).toHaveLength(0);
    expect(JSON.stringify(restored.view)).not.toContain('secretChoices');
  });

  it('finishes four human boards with independent scores and rejects new terminal actions', async () => {
    const { sessions, roomId, matchId } = await start(4);
    const endpoint = `/api/v1/matches/${matchId}`;
    for (let round = 1; round <= 3; round++) {
      for (let index = 0; index < 4; index++) {
        const current = (await read(`${endpoint}/view`, sessions[index]!)).json().data;
        const result = await write(`${endpoint}/actions`, sessions[index]!, {
          requestId: `select-${round}-${index}`, expectedRevision: current.revision,
          action: { type: 'submit_choice', round, choice: index >= round ? 'harvest' : 'build' },
        });
        expect(result.statusCode).toBe(200);
      }
      for (let index = 0; index < round; index++) {
        const current = (await read(`${endpoint}/view`, sessions[index]!)).json().data;
        const result = await write(`${endpoint}/actions`, sessions[index]!, {
          requestId: `place-${round}-${index}`, expectedRevision: current.revision,
          action: { type: 'place_domino', round, x: 0, y: round - 1, orientation: 'H' },
        });
        expect(result.statusCode).toBe(200);
      }
    }
    const final = (await read(`${endpoint}/view`, sessions[0]!)).json().data;
    expect(final.status).toBe('finished');
    expect(final.view.roundResults).toHaveLength(3);
    expect(final.view.seats.map((seat: string) => final.view.outcome.scores[seat])).toEqual([6, 5, 5, 4]);
    expect(final.view.seats.map((seat: string) => final.view.boards[seat].energy)).toEqual([0, 3, 6, 9]);
    expect(final.view.outcome.winners).toEqual([final.view.seats[0]]);
    expect((await write(`${endpoint}/actions`, sessions[0]!, {
      requestId: 'finished-choice', expectedRevision: final.revision,
      action: { type: 'submit_choice', round: 3, choice: 'harvest' },
    })).statusCode).toBe(422);
    expect((await read(`/api/v1/rooms/${roomId}`, sessions[0]!)).json().data)
      .toMatchObject({ status: 'waiting', activeMatchId: null });
  });

  it('keeps hidden choices, state and RNG intact on duplicate, forged and unauthorized requests', async () => {
    const { sessions, matchId } = await start();
    const endpoint = `/api/v1/matches/${matchId}`;
    const payload = { requestId: 'private-choice', expectedRevision: 0,
      action: { type: 'submit_choice', round: 1, choice: 'build' } };
    const accepted = await write(`${endpoint}/actions`, sessions[0]!, payload);
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json().data.events).toEqual([
      expect.objectContaining({ type: 'choice.submitted' }),
    ]);
    expect(accepted.json().data.events[0]).not.toHaveProperty('choice');
    const saved = async () => (await db.query<{ state: unknown; rng_state: unknown; revision: number }>(
      'SELECT state,rng_state,revision FROM matches WHERE id=$1', [matchId])).rows[0];
    const before = await saved();
    expect((await write(`${endpoint}/actions`, sessions[0]!, payload)).statusCode).toBe(200);
    const rejected = await write(`${endpoint}/actions`, sessions[0]!, {
      ...payload, requestId: 'change-choice', expectedRevision: 1,
      action: { type: 'submit_choice', round: 1, choice: 'harvest' },
    });
    expect(rejected.json().error.code).toBe('ACTION_NOT_ALLOWED');
    const forged = await write(`${endpoint}/actions`, sessions[1]!, {
      requestId: 'forged-seat', expectedRevision: 1,
      action: { type: 'submit_choice', round: 1, choice: 'build', seatId: 'other' },
    });
    expect(forged.statusCode).toBe(422);
    expect((await read(`${endpoint}/view`, sessions[2]!)).statusCode).toBe(404);
    expect((await read(`${endpoint}/commands/private-choice`, sessions[1]!)).json().data.outcome).toBe('not_found');
    expect(await saved()).toEqual(before);
    const hidden = (await read(`${endpoint}/view`, sessions[1]!)).json().data.view;
    expect(hidden.myChoice).toBeNull();
    expect(hidden.revealedChoices).toBeNull();
    expect(hidden.boards[hidden.seats[0]].energy).toBe(3);
    expect(hidden).not.toHaveProperty('choices');
    const own = (await read(`${endpoint}/view`, sessions[0]!)).json().data.view;
    expect(own.myChoice).toBe('build');
  });

  it.each([
    { actionType: 'reveal', phase: 'before' }, { actionType: 'reveal', phase: 'after' },
    { actionType: 'place', phase: 'before' }, { actionType: 'place', phase: 'after' },
  ] as const)('recovers $actionType after a real API exit $phase COMMIT without applying twice', async ({ actionType, phase }) => {
    const { sessions, matchId } = await start();
    const endpoint = `/api/v1/matches/${matchId}`;
    expect((await write(`${endpoint}/actions`, sessions[0]!, {
      requestId: 'first-choice', expectedRevision: 0,
      action: { type: 'submit_choice', round: 1, choice: 'build' },
    })).statusCode).toBe(200);
    if (actionType === 'place') expect((await write(`${endpoint}/actions`, sessions[1]!, {
      requestId: 'last-choice', expectedRevision: 1,
      action: { type: 'submit_choice', round: 1, choice: 'harvest' },
    })).statusCode).toBe(200);
    const actor = sessions[actionType === 'reveal' ? 1 : 0]!;
    const revision = actionType === 'reveal' ? 1 : 2;
    const payload = {
      requestId: `crash-${actionType}-${phase}`, expectedRevision: revision,
      action: actionType === 'reveal'
        ? { type: 'submit_choice', round: 1, choice: 'harvest' }
        : { type: 'place_domino', round: 1, x: 0, y: 0, orientation: 'V' },
    };
    let child: ChildProcess | undefined;
    try {
      child = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'tests/fixtures/match-crash-server.ts'], {
        cwd: process.cwd(), env: { ...process.env, TEST_DATABASE_URL: url!, MATCH_CRASH_PHASE: phase },
        stdio: ['ignore', 'ignore', 'ignore', 'ipc'], windowsHide: true,
      });
      const processChild = child;
      const exited = new Promise<number | null>(resolve => processChild.once('exit', resolve));
      const port = await new Promise<number>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Child API startup timed out')), 10_000);
        processChild.once('message', message => {
          clearTimeout(timeout);
          if (message && typeof message === 'object' && 'port' in message && typeof message.port === 'number') resolve(message.port);
          else reject(new Error('Invalid child API address'));
        });
        processChild.once('error', cause => { clearTimeout(timeout); reject(cause); });
        processChild.once('exit', code => { clearTimeout(timeout); reject(new Error(`Child API exited: ${code}`)); });
      });
      const response = await fetch(`http://127.0.0.1:${port}${endpoint}/actions`, {
        method: 'POST', headers: { origin, cookie: actor.cookie, 'x-csrf-token': actor.csrf, 'content-type': 'application/json' },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(10_000),
      }).catch(() => undefined);
      expect(response).toBeUndefined();
      expect(await exited).toBe(86);
      const restored = (await read(`${endpoint}/view`, actor)).json().data;
      expect(restored.revision).toBe(revision + (phase === 'after' ? 1 : 0));
      if (actionType === 'reveal' && phase === 'before') {
        expect(restored.view.phase).toBe('selecting');
        expect(Object.values(restored.view.boards).map(board => (board as { energy: number }).energy)).toEqual([3, 3]);
        expect(restored.view.revealedChoices).toBeNull();
      }
      const receipt = (await read(`${endpoint}/commands/${payload.requestId}`, actor)).json().data;
      expect(receipt.outcome).toBe(phase === 'after' ? 'accepted' : 'not_found');
      for (let retry = 0; retry < 2; retry++) expect((await write(`${endpoint}/actions`, actor, payload)).statusCode).toBe(200);
      const final = (await read(`${endpoint}/view`, actor)).json().data;
      expect(final.revision).toBe(revision + 1);
      expect(final.view.roundResults).toHaveLength(1);
      expect(final.view.seats.map((seat: string) => final.view.boards[seat].energy)).toEqual([2, 5]);
      expect(final.view.phase).toBe(actionType === 'place' ? 'selecting' : 'placing');
      expect(final.view.round).toBe(actionType === 'place' ? 2 : 1);
      expect(final.view.boards[final.view.seats[0]].placements).toHaveLength(actionType === 'place' ? 1 : 0);
      expect((await db.query<{ count: string }>('SELECT count(*) FROM match_actions WHERE match_id=$1', [matchId])).rows[0]!.count)
        .toBe(String(revision + 1));
    } finally {
      if (child && child.exitCode === null) {
        const stopped = new Promise<void>(resolve => child!.once('exit', () => resolve()));
        child.kill();
        await stopped;
      }
    }
  }, 30_000);
});
