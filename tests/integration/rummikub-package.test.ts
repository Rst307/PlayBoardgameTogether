import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createApp } from '../../apps/api/src/app.js';
import { createDatabase, type Database } from '../../apps/api/src/db/index.js';
import { createRegistry } from '../../apps/api/src/registry/index.js';
import { createAccount } from '../../apps/api/src/auth.js';

process.loadEnvFile('.env');
const url = process.env.TEST_DATABASE_URL;
if (!url || url === process.env.DATABASE_URL || new URL(url).pathname === new URL(process.env.DATABASE_URL!).pathname) throw new Error('Isolated test database required');
const origin = 'http://127.0.0.1:5173';
type Headers = { cookie: string; origin: string; 'x-csrf-token': string };
let db: Database, app: Awaited<ReturnType<typeof createApp>>, admin: Headers, alice: Headers, bob: Headers;
const config = { NODE_ENV: 'test' as const, API_HOST: '127.0.0.1', API_PORT: 3001, DATABASE_URL: url!, WEB_ORIGIN: origin, ENABLE_DEV_LAB: false, LOG_LEVEL: 'silent' as const };
const write = (path: string, headers: Headers, payload: unknown, method: 'POST' | 'PUT' = 'POST') => app.inject({ method, url: path, headers, payload });
beforeAll(async () => {
  db = createDatabase(url!);
  await db.query('TRUNCATE accounts CASCADE');
  await db.query("DELETE FROM game_packages WHERE game_id='online.rummikub'; DELETE FROM game_installations WHERE game_id='online.rummikub'");
  app = await createApp({ db, config, registry: createRegistry(false) });
  const identities: Headers[] = [];
  for (const [username, role] of [['rummy_admin', 'administrator'], ['rummy_a', 'user'], ['rummy_b', 'user']] as const) {
    await createAccount(db, { username, displayName: username, password: 'rummy test password', role });
    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', headers: { origin }, payload: { username, password: 'rummy test password' } });
    expect(response.statusCode).toBe(200);
    const raw = response.headers['set-cookie'];
    identities.push({ cookie: (Array.isArray(raw) ? raw : [String(raw)]).map(v => v.split(';')[0]).join('; '), origin, 'x-csrf-token': response.json().data.csrfToken });
  }
  [admin, alice, bob] = identities as [Headers, Headers, Headers];
});
afterAll(async () => {
  if (app) await app.close();
});
it('installs the real artwork ZIP, persists atomic/private/deduplicated turns, restarts and completes a replayable match', async () => {
  const zip = await readFile('dist/game-packages/rummikub-1.0.0.zip');
  const uploadHeaders = { ...admin, 'content-type': 'application/zip' };
  const reviewed = await app.inject({ method: 'POST', url: '/api/v1/admin/game-packages/review', headers: uploadHeaders, payload: zip });
  expect(reviewed.statusCode).toBe(200);
  const installed = await app.inject({ method: 'POST', url: `/api/v1/admin/game-packages?requestId=${randomUUID()}&expectedCatalogHash=${reviewed.json().data.catalogHash}`, headers: uploadHeaders, payload: zip });
  expect(installed.statusCode).toBe(200);
  expect((await app.inject({ url: '/api/v1/games' })).json().data).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'online.rummikub', version: '1.0.0' })]));
  const art = await app.inject({ url: '/api/v1/game-packages/online.rummikub/versions/1.0.0/art/cover.png' });
  expect(art.statusCode).toBe(200); expect(art.headers['content-type']).toContain('image/png');
  const created = await write('/api/v1/rooms', alice, { requestId: randomUUID(), name: '拉密验收', gameId: 'online.rummikub', version: '1.0.0', options: {}, seatCount: 2 });
  expect(created.statusCode).toBe(200);
  const { roomId, inviteCode } = created.json().data;
  const joined = await write('/api/v1/rooms/join', bob, { requestId: randomUUID(), inviteCode });
  let revision = joined.json().data.roomRevision;
  const seated = await write(`/api/v1/rooms/${roomId}/my-seat`, bob, { requestId: randomUUID(), expectedRoomRevision: revision, seatIndex: 1 }, 'PUT');
  expect(seated.statusCode).toBe(200); revision = seated.json().data.roomRevision;
  for (const player of [alice, bob]) {
    const ready = await write(`/api/v1/rooms/${roomId}/my-ready`, player, { requestId: randomUUID(), expectedRoomRevision: revision, ready: true }, 'PUT');
    expect(ready.statusCode).toBe(200); revision = ready.json().data.roomRevision;
  }
  const started = await write(`/api/v1/rooms/${roomId}/start`, alice, { requestId: randomUUID(), expectedRoomRevision: revision });
  expect(started.statusCode).toBe(200);
  const matchId = started.json().data.matchId;
  const read = (headers = alice) => app.inject({ url: `/api/v1/matches/${matchId}/view`, headers });
  const snapshot = async () => (await db.query('SELECT state,rng_state,revision FROM matches WHERE id=$1', [matchId])).rows[0];
  const a = (await read()).json().data, b = (await read(bob)).json().data;
  expect(a.view.hand).toHaveLength(14); expect(b.view.hand).toHaveLength(14);
  expect(a.view.hand.map((t: { id: number }) => t.id).some((id: number) => b.view.hand.some((t: { id: number }) => t.id === id))).toBe(false);
  expect(a.view).not.toHaveProperty('pool'); expect(a.view).not.toHaveProperty('hands');
  expect((await read(admin)).statusCode).toBe(404);
  const player = a.view.canAct ? alice : bob, wrong = a.view.canAct ? bob : alice;
  const before = await snapshot();
  expect((await write(`/api/v1/matches/${matchId}/actions`, wrong, { requestId: randomUUID(), expectedRevision: 0, action: { type: 'draw' } })).statusCode).toBe(422);
  expect((await write(`/api/v1/matches/${matchId}/actions`, player, { requestId: randomUUID(), expectedRevision: 0, action: { type: 'play', table: [[0, 0, 0]] } })).statusCode).toBe(422);
  expect(await snapshot()).toEqual(before);
  await db.query("CREATE FUNCTION fail_rummy_action() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test rollback'; END $$");
  await db.query('CREATE TRIGGER fail_rummy_action AFTER UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION fail_rummy_action()');
  const command = { requestId: randomUUID(), expectedRevision: 0, action: { type: 'draw' } };
  try {
    expect((await write(`/api/v1/matches/${matchId}/actions`, player, command)).statusCode).toBe(500);
    expect(await snapshot()).toEqual(before);
  } finally {
    await db.query('DROP TRIGGER fail_rummy_action ON matches'); await db.query('DROP FUNCTION fail_rummy_action()');
  }
  expect((await write(`/api/v1/matches/${matchId}/actions`, player, command)).statusCode).toBe(200);
  const committed = await snapshot();
  expect((await write(`/api/v1/matches/${matchId}/actions`, player, command)).json().data.revision).toBe(1);
  expect(await snapshot()).toEqual(committed);
  expect((await write(`/api/v1/matches/${matchId}/actions`, player, { ...command, action: { type: 'play', table: [] } })).json().error.code).toBe('REQUEST_ID_CONFLICT');
  await app.close(); db = createDatabase(url!); app = await createApp({ db, config, registry: createRegistry(false) });
  expect((await read()).statusCode).toBe(200); expect(await snapshot()).toEqual(committed);
  for (let i = 0; i < 250; i++) {
    const first = (await read()).json().data;
    if (first.status === 'finished') break;
    const current = first.view.canAct ? first : (await read(bob)).json().data;
    const action = current.view.suggestions[0];
    const response = await write(`/api/v1/matches/${matchId}/actions`, first.view.canAct ? alice : bob,
      { requestId: randomUUID(), expectedRevision: current.revision, action });
    expect(response.statusCode).toBe(200);
  }
  const final = (await read()).json().data;
  expect(final.status).toBe('finished');
  const replay = await app.inject({ url: `/api/v1/matches/${matchId}/replay?revision=0`, headers: alice });
  expect(replay.statusCode).toBe(200); expect(replay.json().data.view.hand).toHaveLength(14);
  expect((await app.inject({ url: `/api/v1/rooms/${roomId}`, headers: alice })).json().data.status).toBe('waiting');
}, 30_000);
