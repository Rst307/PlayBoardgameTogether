import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';
import { createAccount } from '../../apps/api/src/auth.js';
import { createApp } from '../../apps/api/src/app.js';
import { createDatabase, type Database } from '../../apps/api/src/db/index.js';
import { createRegistry } from '../../apps/api/src/registry/index.js';

process.loadEnvFile('.env');
const url = process.env.TEST_DATABASE_URL;
const origin = 'http://127.0.0.1:5173';
type Session = { cookie: string; csrf: string };

describe.skipIf(!url)('model bot seats', () => {
  let db: Database;
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    db = createDatabase(url!);
    app = await createApp({ db, registry: createRegistry(false), config: {
      NODE_ENV: 'test', API_HOST: '127.0.0.1', API_PORT: 3001, DATABASE_URL: url!,
      WEB_ORIGIN: origin, ENABLE_DEV_LAB: false, LOG_LEVEL: 'silent', AI_SCAN_INTERVAL_MS: 100,
      AI_DECISION_TIMEOUT_MS: 1000,
    } });
  });
  afterAll(async () => { await app.close(); });
  beforeEach(async () => {
    await db.query('TRUNCATE accounts CASCADE');
    for (const username of ['alice', 'bob']) {
      await createAccount(db, { username, displayName: username, password: 'correct horse battery', role: 'user' });
    }
  });

  async function login(username = 'alice'): Promise<Session> {
    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', headers: { origin },
      payload: { username, password: 'correct horse battery' } });
    const raw = response.headers['set-cookie'];
    const cookies = Array.isArray(raw) ? raw : [String(raw)];
    return { cookie: cookies.map(value => value.split(';')[0]).join('; '), csrf: response.json().data.csrfToken };
  }
  function write(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, session: Session, payload?: unknown) {
    return app.inject({ method, url: `/api/v1${path}`, headers: { origin, cookie: session.cookie, 'x-csrf-token': session.csrf }, payload });
  }
  async function room(id: string, session: Session) {
    return (await app.inject({ url: `/api/v1/rooms/${id}`, headers: { cookie: session.cookie } })).json().data;
  }
  async function command(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', id: string, path: string, session: Session, extra = {}) {
    return write(method, `/rooms/${id}/${path}`, session, { requestId: randomUUID(), expectedRoomRevision: (await room(id, session)).roomRevision, ...extra });
  }
  async function profile(session: Session, name = 'Model') {
    const response = await write('POST', '/me/model-profiles', session, { name, endpointId: 'mock', modelId: 'mock-v1' });
    expect(response.statusCode).toBe(200);
    return response.json().data.id as string;
  }
  async function create(session: Session, seatCount = 2) {
    const response = await write('POST', '/rooms', session, { requestId: randomUUID(), name: 'Model bots', gameId: 'color-match', version: '1.0.0', options: {}, seatCount });
    expect(response.statusCode).toBe(200);
    return response.json().data;
  }

  it('edits script/model settings, clears ready, scopes receipts to the seat and preserves privacy', async () => {
    const alice = await login();
    const bob = await login('bob');
    const ownProfile = await profile(alice);
    const foreignProfile = await profile(bob);
    const created = await create(alice, 3);
    const id = created.roomId;
    const seatId = created.room.seats[2].seatId;
    const path = `/rooms/${id}/seats/${seatId}/bot`;
    const body = { requestId: 'add-model', expectedRoomRevision: 0, controllerType: 'model', profileId: ownProfile };
    expect((await write('PUT', path, alice, body)).statusCode).toBe(200);
    expect((await write('PUT', path, alice, body)).json().data.roomRevision).toBe(1);
    expect((await write('PUT', `/rooms/${id}/seats/${created.room.seats[1].seatId}/bot`, alice, body)).statusCode).toBe(409);
    expect((await write('PUT', path, alice, { ...body, profileId: foreignProfile })).statusCode).toBe(409);
    const joined = await write('POST', '/rooms/join', bob, { requestId: randomUUID(), inviteCode: created.inviteCode });
    expect(joined.statusCode).toBe(200);
    expect((await room(id, bob)).seats[2]).toMatchObject({ ownerAccountId: null, botPolicyId: 'model', botModelProfileId: null });
    expect((await command('PATCH', id, `seats/${seatId}/bot`, bob, { policyId: 'basic-v1' })).statusCode).toBe(403);
    expect((await command('PATCH', id, `seats/${seatId}/bot`, alice, { controllerType: 'model', profileId: foreignProfile })).statusCode).toBe(403);
    expect((await command('PUT', id, 'my-ready', alice, { ready: true })).statusCode).toBe(200);
    const revision = (await room(id, alice)).roomRevision;
    expect((await write('PATCH', path, alice, { requestId: randomUUID(), expectedRoomRevision: revision - 1, policyId: 'basic-v1' })).statusCode).toBe(409);
    const script = await command('PATCH', id, `seats/${seatId}/bot`, alice, { policyId: 'basic-v1' });
    expect(script.statusCode).toBe(200);
    expect(script.json().data.seats[0].ready).toBe(false);
    expect(script.json().data.seats[2]).toMatchObject({ botPolicyId: 'basic-v1', botModelProfileId: null });
    expect((await command('PATCH', id, `seats/${seatId}/bot`, alice, { controllerType: 'model', profileId: ownProfile })).statusCode).toBe(200);
    expect((await room(id, alice)).seats[2].botModelProfileId).toBe(ownProfile);
    expect((await command('DELETE', id, `seats/${seatId}/bot`, alice)).statusCode).toBe(200);
    expect((await room(id, alice)).seats[2]).toMatchObject({ occupantKind: 'human', botPolicyId: null, botModelProfileId: null });
  });

  it('preserves accepted legacy script add/remove retries without a second effect', async () => {
    const alice = await login();
    const created = await create(alice);
    const id = created.roomId;
    const path = `/rooms/${id}/seats/${created.room.seats[1].seatId}/bot`;
    const add = { requestId: 'legacy-add', expectedRoomRevision: 0, policyId: 'basic-v1' };
    const remove = { requestId: 'legacy-remove', expectedRoomRevision: 1 };
    function oldHash(body: Record<string, unknown>) {
      const value = { roomId: id, ...body };
      const canonical = `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${JSON.stringify(item)}`).join(',')}}`;
      return createHash('sha256').update(canonical).digest('hex');
    }
    expect((await write('PUT', path, alice, add)).statusCode).toBe(200);
    await db.query("UPDATE command_receipts SET request_hash=$1 WHERE operation='room.bot.add' AND request_id=$2", [oldHash(add), add.requestId]);
    expect((await write('PUT', path, alice, add)).json().data.roomRevision).toBe(1);
    expect((await write('DELETE', path, alice, remove)).statusCode).toBe(200);
    await db.query("UPDATE command_receipts SET request_hash=$1 WHERE operation='room.bot.remove' AND request_id=$2", [oldHash(remove), remove.requestId]);
    expect((await write('DELETE', path, alice, remove)).json().data.roomRevision).toBe(2);
    expect((await write('DELETE', path, alice, { ...remove, expectedRoomRevision: 2 })).statusCode).toBe(409);
    expect((await room(id, alice)).seats[1].occupantKind).toBe('human');
  });

  it('rejects unavailable profiles and rolls back start when a waiting binding is deleted', async () => {
    const alice = await login();
    const idProfile = await profile(alice);
    const created = await create(alice);
    const id = created.roomId;
    const path = `seats/${created.room.seats[1].seatId}/bot`;
    await db.query('UPDATE model_profiles SET enabled=false WHERE id=$1', [idProfile]);
    expect((await command('PUT', id, path, alice, { controllerType: 'model', profileId: idProfile })).statusCode).toBe(403);
    expect((await room(id, alice)).roomRevision).toBe(0);
    await db.query('UPDATE model_profiles SET enabled=true WHERE id=$1', [idProfile]);
    const real = await write('POST', '/me/model-profiles', alice, { name: 'No credential', endpointId: 'openai', modelId: 'example' });
    expect((await command('PUT', id, path, alice, { controllerType: 'model', profileId: real.json().data.id })).statusCode).toBe(403);
    expect((await command('PUT', id, path, alice, { controllerType: 'model', profileId: idProfile, seatId: 'spoof' })).statusCode).toBe(400);
    expect((await command('PUT', id, path, alice, { controllerType: 'model', profileId: idProfile })).statusCode).toBe(200);
    expect((await command('PUT', id, 'my-ready', alice, { ready: true })).statusCode).toBe(200);
    expect((await write('DELETE', `/me/model-profiles/${idProfile}`, alice)).statusCode).toBe(200);
    const before = await room(id, alice);
    expect(before.permissions.canStart).toBe(false);
    expect(before.startBlockers.join(' ')).toContain('模型 AI 配置不可用');
    expect((await command('POST', id, 'start', alice)).statusCode).toBe(403);
    expect((await room(id, alice))).toMatchObject({ status: 'waiting', roomRevision: before.roomRevision, activeMatchId: null });
    expect((await db.query('SELECT id FROM matches WHERE room_id=$1', [id])).rowCount).toBe(0);
  });

  it('requires the new host to authorize their own profile after host transfer', async () => {
    const alice = await login();
    const bob = await login('bob');
    const own = await profile(alice);
    const replacement = await profile(bob);
    const created = await create(alice, 3);
    const id = created.roomId;
    const botPath = `seats/${created.room.seats[2].seatId}/bot`;
    await command('PUT', id, botPath, alice, { controllerType: 'model', profileId: own });
    await write('POST', '/rooms/join', bob, { requestId: randomUUID(), inviteCode: created.inviteCode });
    await command('PUT', id, 'my-seat', bob, { seatIndex: 1 });
    await command('PUT', id, 'my-ready', alice, { ready: true });
    await command('PUT', id, 'my-ready', bob, { ready: true });
    const bobId = (await db.query<{id: string}>("SELECT id FROM accounts WHERE username_canonical='bob'")).rows[0]!.id;
    expect((await command('POST', id, 'host', alice, { targetAccountId: bobId })).statusCode).toBe(200);
    expect((await room(id, bob)).permissions.canStart).toBe(false);
    expect((await command('POST', id, 'start', bob)).statusCode).toBe(403);
    expect((await command('PATCH', id, botPath, bob, { controllerType: 'model', profileId: replacement })).statusCode).toBe(200);
    expect((await room(id, bob)).seats.map((seat: {ready: boolean}) => seat.ready)).toEqual([false, false, true]);
  });

  it('keeps the two-attempt limit for one decision and resumes model use on the next turn', async () => {
    const alice = await login();
    const own = await profile(alice);
    const created = await create(alice);
    const id = created.roomId;
    const seatId = created.room.seats[1].seatId;
    await command('PUT', id, `seats/${seatId}/bot`, alice, { controllerType: 'model', profileId: own });
    await command('PUT', id, 'my-ready', alice, { ready: true });
    const matchId = (await command('POST', id, 'start', alice)).json().data.matchId;
    const exhaustedKey = `revision:1:play:${seatId}`;
    await db.query(`INSERT INTO ai_decision_groups(match_id,seat_id,controller_epoch,decision_key,external_attempts)
      VALUES($1,$2,0,$3,2)`, [matchId, seatId, exhaustedKey]);
    async function waitForBot(revision: number) {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        const result = await db.query<{status: string; safe_error_code: string | null}>(
          'SELECT status,safe_error_code FROM ai_tasks WHERE match_id=$1 AND seat_id=$2 AND source_revision=$3', [matchId, seatId, revision]);
        if (result.rows[0]?.status === 'succeeded') return result.rows[0];
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      throw new Error('Bot did not complete the decision');
    }
    const first = await write('POST', `/matches/${matchId}/actions`, alice, {
      requestId: randomUUID(), expectedRevision: 0, expectedControllerEpoch: 0, action: { type: 'draw_card' },
    });
    expect(first.statusCode).toBe(200);
    expect((await waitForBot(1)).safe_error_code).toBe('AI_FALLBACK_USED');
    expect((await db.query<{external_attempts: number}>(
      'SELECT external_attempts FROM ai_decision_groups WHERE match_id=$1 AND seat_id=$2 AND decision_key=$3',
      [matchId, seatId, exhaustedKey])).rows[0]!.external_attempts).toBe(2);
    // A fallback play can open a target phase; let that separate legal decision finish first.
    const deadline = Date.now() + 5000;
    let view;
    while (Date.now() < deadline) {
      view = (await app.inject({ url: `/api/v1/matches/${matchId}/view`, headers: { cookie: alice.cookie } })).json().data;
      if (view.view.canDraw) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    expect(view.view.canDraw).toBe(true);
    const nextRevision = view.revision + 1;
    expect((await write('POST', `/matches/${matchId}/actions`, alice, {
      requestId: randomUUID(), expectedRevision: view.revision, expectedControllerEpoch: 0, action: { type: 'draw_card' },
    })).statusCode).toBe(200);
    expect((await waitForBot(nextRevision)).safe_error_code).toBeNull();
  }, 15000);

  it('uses the authorized bot model without fallback, locks active settings and completes a real scheduled match', async () => {
    const alice = await login();
    const own = await profile(alice);
    const created = await create(alice);
    const id = created.roomId;
    const seatId = created.room.seats[1].seatId;
    await command('PUT', id, `seats/${seatId}/bot`, alice, { controllerType: 'model', profileId: own });
    await command('PUT', id, 'my-ready', alice, { ready: true });
    const startBody = { requestId: 'start-model-match', expectedRoomRevision: (await room(id, alice)).roomRevision };
    const started = await write('POST', `/rooms/${id}/start`, alice, startBody);
    expect(started.statusCode).toBe(200);
    const matchId = started.json().data.matchId;
    expect((await write('POST', `/rooms/${id}/start`, alice, startBody)).json().data.matchId).toBe(matchId);
    const participant = (await db.query('SELECT account_id,model_owner_account_id,model_profile_id,occupant_kind,controller_type FROM match_participants WHERE match_id=$1 AND seat_id=$2', [matchId, seatId])).rows[0];
    expect(participant).toMatchObject({ account_id: null, model_profile_id: own, occupant_kind: 'bot', controller_type: 'model' });
    expect(participant.model_owner_account_id).toBeTruthy();
    expect((await write('PATCH', `/me/model-profiles/${own}`, alice, { name: 'Changed', endpointId: 'mock', modelId: 'mock-v1', expectedVersion: 1 })).statusCode).toBe(409);
    expect((await write('DELETE', `/me/model-profiles/${own}`, alice)).statusCode).toBe(409);
    expect((await command('PATCH', id, `seats/${seatId}/bot`, alice, { policyId: 'basic-v1' })).statusCode).toBe(409);
    const delegated = await write('PUT', `/matches/${matchId}/my-controller`, alice, { requestId: 'delegate', expectedControllerEpoch: 0, controllerType: 'model', profileId: own });
    expect(delegated.statusCode).toBe(200);
    const deadline = Date.now() + 15000;
    let finished = false;
    while (Date.now() < deadline) {
      const result = await db.query<{status: string}>('SELECT status FROM matches WHERE id=$1', [matchId]);
      if (result.rows[0]!.status === 'finished') { finished = true; break; }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    expect(finished).toBe(true);
    const tasks = await db.query<{safe_error_code: string | null}>("SELECT safe_error_code FROM ai_tasks WHERE match_id=$1 AND seat_id=$2 AND status='succeeded'", [matchId, seatId]);
    expect(tasks.rows.length).toBeGreaterThan(0);
    expect(tasks.rows.every(task => task.safe_error_code === null)).toBe(true);
    const groups = await db.query<{external_attempts: number}>(
      'SELECT external_attempts FROM ai_decision_groups WHERE match_id=$1 AND seat_id=$2', [matchId, seatId]);
    expect(groups.rows.length).toBeGreaterThan(2);
    expect(groups.rows.every(group => group.external_attempts <= 2)).toBe(true);
    expect((await room(id, alice))).toMatchObject({ status: 'waiting', activeMatchId: null });
    expect((await write('PATCH', `/me/model-profiles/${own}`, alice, { name: 'Next round', endpointId: 'mock', modelId: 'mock-v1', expectedVersion: 1 })).statusCode).toBe(200);
    const view = (await app.inject({ url: `/api/v1/matches/${matchId}/view?seatId=${seatId}`, headers: { cookie: alice.cookie } })).json().data;
    expect(view.seatIndex).toBe(0);
    expect(view.view.viewingSeatId).toBe(created.room.seats[0].seatId);
    expect(JSON.stringify(view)).not.toContain('model_owner_account_id');
  }, 20000);
});
