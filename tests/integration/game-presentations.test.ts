import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
import { gamePresentationSchema } from '../../packages/protocol/src/index.js';
import { createApp } from '../../apps/api/src/app.js';
import { createDatabase, type Database } from '../../apps/api/src/db/index.js';
import { createRegistry } from '../../apps/api/src/registry/index.js';
import { createAccount } from '../../apps/api/src/auth.js';

process.loadEnvFile('.env');
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl || testUrl === process.env.DATABASE_URL) throw new Error('An isolated test database is required');
const origin = 'http://127.0.0.1:5173';
const endpoint = '/api/v1/games/color-match/versions/1.0.0/presentation';
const input = { expectedRevision: 0, iconUrl: '/game-art/color-match-icon.svg', coverUrl: '/game-art/color-match.svg', backgroundUrl: null };

describe('game presentation configuration', () => {
  let db: Database;
  let app: Awaited<ReturnType<typeof createApp>>;
  beforeAll(async () => {
    db = createDatabase(testUrl);
    app = await createApp({ db, registry: createRegistry(false), config: {
      NODE_ENV: 'test', API_HOST: '127.0.0.1', API_PORT: 3001,
      DATABASE_URL: testUrl, WEB_ORIGIN: origin, ENABLE_DEV_LAB: false, LOG_LEVEL: 'silent',
    } });
  });
  afterAll(async () => { await app.close(); });
  beforeEach(async () => {
    await db.query('TRUNCATE accounts CASCADE');
    await createAccount(db, { username: 'catalog_admin', displayName: '管理员', password: 'catalog test password', role: 'administrator' });
    await createAccount(db, { username: 'catalog_user', displayName: '玩家', password: 'catalog test password', role: 'user' });
  });
  async function login(username: string) {
    const reply = await app.inject({ method: 'POST', url: '/api/v1/auth/login', headers: { origin }, payload: { username, password: 'catalog test password' } });
    expect(reply.statusCode).toBe(200);
    const values = reply.headers['set-cookie'];
    const cookie = (Array.isArray(values) ? values : [String(values)]).map(value => value.split(';')[0]).join('; ');
    return { cookie, origin, 'x-csrf-token': String(reply.json().data.csrfToken) };
  }

  it('publishes only presentation fields and persists changes without modifying installed rules', async () => {
    const headers = await login('catalog_admin');
    const before = await db.query('SELECT manifest FROM game_installations WHERE game_id=$1 AND game_version=$2', ['color-match', '1.0.0']);
    const reply = await app.inject({ method: 'PUT', url: endpoint, headers, payload: input });
    expect(reply.statusCode).toBe(200);
    expect(gamePresentationSchema.parse(reply.json().data)).toMatchObject({ gameId: 'color-match', revision: 1, iconUrl: input.iconUrl });
    const publicReply = await app.inject({ url: '/api/v1/games/presentations' });
    expect(publicReply.statusCode).toBe(200);
    const catalog = gamePresentationSchema.array().parse(publicReply.json().data);
    expect(catalog.find(item => item.gameId === 'color-match')).toMatchObject({ revision: 1, coverUrl: input.coverUrl });
    expect(catalog.find(item => item.gameId === 'grid-garden')).toMatchObject({ revision: 0, iconUrl: null });
    expect(publicReply.body).not.toMatch(/updated_by|updated_at|password|csrf|session/);
    expect((await db.query('SELECT manifest FROM game_installations WHERE game_id=$1 AND game_version=$2', ['color-match', '1.0.0'])).rows).toEqual(before.rows);
  });

  it('requires administrator, origin and CSRF before saving', async () => {
    const admin = await login('catalog_admin'), user = await login('catalog_user');
    expect((await app.inject({ method: 'PUT', url: endpoint, headers: { origin }, payload: input })).statusCode).toBe(401);
    expect((await app.inject({ method: 'PUT', url: endpoint, headers: user, payload: input })).statusCode).toBe(403);
    expect((await app.inject({ method: 'PUT', url: endpoint, headers: { cookie: admin.cookie, origin }, payload: input })).statusCode).toBe(403);
    expect((await app.inject({ method: 'PUT', url: endpoint, headers: { ...admin, origin: 'https://other.example' }, payload: input })).statusCode).toBe(403);
    expect((await db.query('SELECT count(*)::int AS count FROM game_presentations')).rows[0]?.count).toBe(0);
  });

  it('serializes competing initial saves and preserves the winning configuration', async () => {
    const headers = await login('catalog_admin');
    const results = await Promise.all([
      app.inject({ method: 'PUT', url: endpoint, headers, payload: input }),
      app.inject({ method: 'PUT', url: endpoint, headers, payload: { ...input, coverUrl: '/game-art/grid-garden.svg' } }),
    ]);
    expect(results.map(reply => reply.statusCode).sort()).toEqual([200, 409]);
    const winner = results.find(reply => reply.statusCode === 200)!;
    const catalog = gamePresentationSchema.array().parse((await app.inject({ url: '/api/v1/games/presentations' })).json().data);
    expect(catalog.find(item => item.gameId === 'color-match')).toEqual(gamePresentationSchema.parse(winner.json().data));
    expect((await app.inject({ method: 'PUT', url: endpoint, headers, payload: input })).statusCode).toBe(409);
  });

  it('rejects unsafe image addresses and unavailable versions without creating records', async () => {
    const headers = await login('catalog_admin');
    for (const iconUrl of ['javascript:alert(1)', 'data:image/svg+xml,test', '/api/v1/assets/files/private', '/game-art/../private.png', 'https://user:secret@example.com/icon.png', 'https://example.com/icon.png?token=private']) {
      expect((await app.inject({ method: 'PUT', url: endpoint, headers, payload: { ...input, iconUrl } })).statusCode).toBe(400);
    }
    expect((await app.inject({ method: 'PUT', url: endpoint.replace('1.0.0', '9.9.9'), headers, payload: input })).statusCode).toBe(404);
    expect((await db.query('SELECT count(*)::int AS count FROM game_presentations')).rows[0]?.count).toBe(0);
  });

  it('resets images to defaults using a new revision', async () => {
    const headers = await login('catalog_admin');
    expect((await app.inject({ method: 'PUT', url: endpoint, headers, payload: input })).statusCode).toBe(200);
    const reply = await app.inject({ method: 'PUT', url: endpoint, headers, payload: {
      expectedRevision: 1, iconUrl: null, coverUrl: null, backgroundUrl: null,
    } });
    expect(reply.statusCode).toBe(200);
    expect(gamePresentationSchema.parse(reply.json().data)).toMatchObject({ revision: 2, iconUrl: null, coverUrl: null, backgroundUrl: null });
  });
});
