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
let db: Database, app: Awaited<ReturnType<typeof createApp>>, admin: Headers, players: Headers[];
const config = { NODE_ENV: 'test' as const, API_HOST: '127.0.0.1', API_PORT: 3001, DATABASE_URL: url!, WEB_ORIGIN: origin, ENABLE_DEV_LAB: false, LOG_LEVEL: 'silent' as const };
const write = (path: string, headers: Headers, payload: unknown, method: 'POST' | 'PUT' = 'POST') => app.inject({ method, url: path, headers, payload });
beforeAll(async () => {
  db = createDatabase(url!);
  await db.query('TRUNCATE accounts CASCADE');
  await db.query("DELETE FROM game_packages WHERE game_id='online.catan'; DELETE FROM game_installations WHERE game_id='online.catan'");
  app = await createApp({ db, config, registry: createRegistry(false) });
  const identities: Headers[] = [];
  for (const [username, role] of [['catan_admin', 'administrator'], ['catan_a', 'user'], ['catan_b', 'user'], ['catan_c', 'user']] as const) {
    await createAccount(db, { username, displayName: username, password: 'catan test password', role });
    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', headers: { origin }, payload: { username, password: 'catan test password' } });
    expect(response.statusCode).toBe(200);
    const raw = response.headers['set-cookie'];
    identities.push({ cookie: (Array.isArray(raw) ? raw : [String(raw)]).map(v => v.split(';')[0]).join('; '), origin, 'x-csrf-token': response.json().data.csrfToken });
  }
  admin = identities[0]!; players = identities.slice(1);
});
afterAll(async () => { if (app) await app.close(); });

it('reviews/installs Catan, runs three-party official identity turns with atomic receipts and restores exact package state', async () => {
  const zip = await readFile('dist/game-packages/catan-1.0.0.zip'), upload = { ...admin, 'content-type': 'application/zip' };
  const reviewed = await app.inject({ method: 'POST', url: '/api/v1/admin/game-packages/review', headers: upload, payload: zip });
  expect(reviewed.statusCode).toBe(200);
  const installed = await app.inject({ method: 'POST', url: `/api/v1/admin/game-packages?requestId=${randomUUID()}&expectedCatalogHash=${reviewed.json().data.catalogHash}`, headers: upload, payload: zip });
  expect(installed.statusCode).toBe(200);
  expect((await app.inject({ url: '/api/v1/games' })).json().data).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'online.catan', version: '1.0.0', players: { min: 3, max: 4 } })]));
  expect((await app.inject({ url: '/api/v1/game-packages/online.catan/versions/1.0.0/art/cover.png' })).headers['content-type']).toContain('image/png');
  const created = await write('/api/v1/rooms', players[0]!, { requestId: randomUUID(), name: '卡坦岛验收', gameId: 'online.catan', version: '1.0.0', options: {}, seatCount: 3 });
  expect(created.statusCode).toBe(200); const { roomId, inviteCode } = created.json().data;
  let revision = created.json().data.roomRevision;
  for (let i = 1; i < 3; i++) {
    const joined = await write('/api/v1/rooms/join', players[i]!, { requestId: randomUUID(), inviteCode });
    expect(joined.statusCode).toBe(200); revision = joined.json().data.roomRevision;
    const seated = await write(`/api/v1/rooms/${roomId}/my-seat`, players[i]!, { requestId: randomUUID(), expectedRoomRevision: revision, seatIndex: i }, 'PUT');
    expect(seated.statusCode).toBe(200); revision = seated.json().data.roomRevision;
  }
  for (const player of players) {
    const ready = await write(`/api/v1/rooms/${roomId}/my-ready`, player, { requestId: randomUUID(), expectedRoomRevision: revision, ready: true }, 'PUT');
    expect(ready.statusCode).toBe(200); revision = ready.json().data.roomRevision;
  }
  const started = await write(`/api/v1/rooms/${roomId}/start`, players[0]!, { requestId: randomUUID(), expectedRoomRevision: revision });
  expect(started.statusCode).toBe(200); const matchId = started.json().data.matchId;
  const read = (headers = players[0]!) => app.inject({ url: `/api/v1/matches/${matchId}/view`, headers });
  const snapshot = async () => (await db.query('SELECT state,rng_state,revision FROM matches WHERE id=$1', [matchId])).rows[0];
  expect((await read(admin)).statusCode).toBe(404);
  const first = (await read()).json().data, player = players[first.view.current]!, wrong = players[(first.view.current + 1) % 3]!;
  const own = (await read(player)).json().data;
  expect(own.view).not.toHaveProperty('resources'); expect(own.view).not.toHaveProperty('deck');
  const command = { requestId: randomUUID(), expectedRevision: 0, action: own.view.actions[0] };
  const before = await snapshot();
  expect((await write(`/api/v1/matches/${matchId}/actions`, wrong, command)).statusCode).toBe(422);
  expect((await write(`/api/v1/matches/${matchId}/actions`, player, { ...command, action: { type: 'city', node: 0 } })).statusCode).toBe(422);
  expect(await snapshot()).toEqual(before);
  await db.query("CREATE FUNCTION fail_catan_action() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test rollback'; END $$");
  await db.query('CREATE TRIGGER fail_catan_action AFTER UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION fail_catan_action()');
  try {
    expect((await write(`/api/v1/matches/${matchId}/actions`, player, command)).statusCode).toBe(500); expect(await snapshot()).toEqual(before);
  } finally { await db.query('DROP TRIGGER fail_catan_action ON matches'); await db.query('DROP FUNCTION fail_catan_action()'); }
  expect((await write(`/api/v1/matches/${matchId}/actions`, player, command)).statusCode).toBe(200);
  const once = await snapshot();
  expect((await write(`/api/v1/matches/${matchId}/actions`, player, command)).statusCode).toBe(200); expect(await snapshot()).toEqual(once);
  expect((await write(`/api/v1/matches/${matchId}/actions`, player, { ...command, action: { type: 'roll' } })).json().error.code).toBe('REQUEST_ID_CONFLICT');
  // Actual HTTP transitions finish snake setup, produce resources and exercise independent participant views.
  for (let i = 0; i < 16; i++) {
    const current = (await read()).json().data;
    const identity = players[current.view.current]!, next = (await read(identity)).json().data;
    expect(next.view.actions.length).toBeGreaterThan(0);
    const result = await write(`/api/v1/matches/${matchId}/actions`, identity, { requestId: randomUUID(), expectedRevision: next.revision, action: next.view.actions[0] });
    expect(result.statusCode).toBe(200);
  }
  const saved = await snapshot();
  await app.close(); db = createDatabase(url!); app = await createApp({ db, config, registry: createRegistry(false) });
  expect(await snapshot()).toEqual(saved);
  for (const identity of players) {
    const restored = await read(identity); expect(restored.statusCode).toBe(200);
    const v = restored.json().data.view; expect(v).not.toHaveProperty('resources'); expect(v).not.toHaveProperty('deck'); expect(v).not.toHaveProperty('used');
    const p = v.you; expect(v.hand).toEqual(saved.state.resources[p]);
  }
}, 90000);
