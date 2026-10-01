import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createAccount } from '../../apps/api/src/auth.js';
import { createApp } from '../../apps/api/src/app.js';
import { createDatabase, type Database } from '../../apps/api/src/db/index.js';
import { createRegistry } from '../../apps/api/src/registry/index.js';
import { ModelProfileService } from '../../apps/api/src/model-profiles.js';

process.loadEnvFile('.env');
const url = process.env.TEST_DATABASE_URL;
const origin = 'http://127.0.0.1:5173';
type Session = { cookie: string; csrf: string };

describe.skipIf(!url)('stage 6 model profile endpoint ownership', () => {
  let db: Database;
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    db = createDatabase(url!);
    app = await createApp({
      config: {
        NODE_ENV: 'test', API_HOST: '127.0.0.1', API_PORT: 3001,
        DATABASE_URL: url!, WEB_ORIGIN: origin, ENABLE_DEV_LAB: false,
        LOG_LEVEL: 'silent', AI_SCAN_INTERVAL_MS: 100, AI_DECISION_TIMEOUT_MS: 1000,
      },
      db,
      registry: createRegistry(false),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await db.query('TRUNCATE accounts CASCADE');
    await createAccount(db, { username: 'alice', displayName: 'Alice', password: 'correct horse battery', role: 'user' });
    await createAccount(db, { username: 'bob', displayName: 'Bob', password: 'correct horse battery', role: 'user' });
  });

  async function login(username: string): Promise<Session> {
    const response = await app.inject({
      method: 'POST', url: '/api/v1/auth/login', headers: { origin },
      payload: { username, password: 'correct horse battery' },
    });
    const raw = response.headers['set-cookie'];
    const cookies = Array.isArray(raw) ? raw : [String(raw)];
    return { cookie: cookies.map((value) => value.split(';')[0]).join('; '), csrf: response.json().data.csrfToken };
  }

  it('edits and deletes a saved profile, preserves history and rejects other accounts', async () => {
    const alice = await login('alice');
    const headers = { origin, cookie: alice.cookie, 'x-csrf-token': alice.csrf };
    const payload = { name: 'Before', endpointId: 'mock', modelId: 'mock-v1', parameters: {} };
    const created = await app.inject({ method: 'POST', url: '/api/v1/me/model-profiles', headers, payload });
    const id = created.json().data.id;
    const path = `/api/v1/me/model-profiles/${id}`;
    const edited = await app.inject({ method: 'PATCH', url: path, headers, payload: { ...payload, name: 'After', expectedVersion: 1 } });
    expect(edited.statusCode).toBe(200);
    expect(edited.json().data.profileVersion).toBe(2);
    expect((await db.query('SELECT version FROM model_profile_versions WHERE profile_id=$1', [id])).rowCount).toBe(2);
    const stale = await app.inject({ method: 'PATCH', url: path, headers, payload: { ...payload, expectedVersion: 1 } });
    expect(stale.statusCode).toBe(409);
    const bob = await login('bob');
    const forbidden = await app.inject({ method: 'DELETE', url: path, headers: { origin, cookie: bob.cookie, 'x-csrf-token': bob.csrf } });
    expect(forbidden.statusCode).toBe(404);
    expect((await app.inject({ method: 'DELETE', url: path, headers })).statusCode).toBe(200);
    expect((await app.inject({ url: '/api/v1/me/model-profiles', headers })).json().data).toEqual([]);
    expect((await app.inject({ method: 'POST', url: `${path}/test`, headers, payload: {} })).statusCode).toBe(404);
  });

  it('does not leave a partial profile when credential encryption is unavailable', async () => {
    const alice = await login('alice');
    const response = await app.inject({ method: 'POST', url: '/api/v1/me/model-profiles',
      headers: { origin, cookie: alice.cookie, 'x-csrf-token': alice.csrf },
      payload: { name: 'Atomic', endpointId: 'openai', modelId: 'example', apiKey: 'fake-key-for-tests' },
    });
    expect(response.statusCode).toBe(503);
    expect(response.json().error.message).toContain('加密');
    expect((await db.query('SELECT id FROM model_profiles WHERE name=$1', ['Atomic'])).rowCount).toBe(0);
  });

  it('keeps, replaces and revokes encrypted credentials without leaking keys into profile history', async () => {
    const owner = (await db.query<{ id: string }>("SELECT id FROM accounts WHERE username_canonical='alice'")).rows[0]!.id;
    const service = new ModelProfileService(db, Buffer.alloc(32, 17).toString('base64'));
    const input = { name: 'Encrypted', endpointId: 'openai', modelId: 'model-v1', apiKey: 'fake-original-key' };
    const made = await service.save(owner, input);
    await expect(service.decryptCredential(owner, made.id)).resolves.toBe(input.apiKey);
    const update = { name: 'Renamed', endpointId: 'openai', modelId: 'model-v2', expectedVersion: 1 };
    await service.save(owner, update, made.id);
    await expect(service.decryptCredential(owner, made.id)).resolves.toBe(input.apiKey);
    await service.save(owner, { ...update, expectedVersion: 2, apiKey: 'fake-replacement-key' }, made.id);
    await expect(service.decryptCredential(owner, made.id)).resolves.toBe('fake-replacement-key');
    const history = await db.query('SELECT snapshot FROM model_profile_versions WHERE profile_id=$1', [made.id]);
    expect(JSON.stringify(history.rows)).not.toContain('fake-');
    expect(JSON.stringify(await service.list(owner))).not.toContain('fake-');
    await service.remove(owner, made.id);
    await expect(service.decryptCredential(owner, made.id)).rejects.toThrow('API key');
    expect((await db.query('SELECT id FROM model_credentials WHERE owner_account_id=$1 AND revoked_at IS NULL', [owner])).rowCount).toBe(0);
    await expect(service.replaceCredential(owner, made.id, { apiKey: 'fake-another-key' })).rejects.toThrow('已删除');
  });

  it('rolls back a credential replacement if saving the new profile version fails', async () => {
    const owner = (await db.query<{ id: string }>("SELECT id FROM accounts WHERE username_canonical='alice'")).rows[0]!.id;
    const service = new ModelProfileService(db, Buffer.alloc(32, 17).toString('base64'));
    const input = { name: 'Atomic', endpointId: 'openai', modelId: 'model-v1', apiKey: 'fake-original-key' };
    const made = await service.save(owner, input);
    await db.query(`CREATE FUNCTION fail_model_version() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END $$`);
    await db.query('CREATE TRIGGER fail_model_version BEFORE INSERT ON model_profile_versions FOR EACH ROW EXECUTE FUNCTION fail_model_version()');
    try {
      await expect(service.save(owner, { ...input, name: 'Failed update', apiKey: 'fake-new-key', expectedVersion: 1 }, made.id)).rejects.toThrow('test failure');
      await expect(service.decryptCredential(owner, made.id)).resolves.toBe('fake-original-key');
      expect(await service.list(owner)).toMatchObject([{ name: 'Atomic', profile_version: 1, has_credential: true }]);
      expect((await db.query('SELECT id FROM model_credentials WHERE owner_account_id=$1', [owner])).rowCount).toBe(1);
    } finally {
      await db.query('DROP TRIGGER fail_model_version ON model_profile_versions');
      await db.query('DROP FUNCTION fail_model_version()');
    }
  });

  it('requires a new key for a new endpoint and keeps the old profile intact on rejection', async () => {
    const owner = (await db.query<{ id: string }>("SELECT id FROM accounts WHERE username_canonical='alice'")).rows[0]!.id;
    const service = new ModelProfileService(db, Buffer.alloc(32, 17).toString('base64'));
    const made = await service.save(owner, { name: 'Original', endpointId: 'openai', modelId: 'model-v1', apiKey: 'fake-original-key' });
    const changed = { name: 'Custom', endpointId: 'custom', baseUrl: 'https://8.8.8.8/v1', modelId: 'model-v2', expectedVersion: 1 };
    await expect(service.save(owner, changed, made.id)).rejects.toThrow('重新填写');
    expect(await service.list(owner)).toMatchObject([{ endpoint_id: 'openai', profile_version: 1 }]);
    await expect(service.decryptCredential(owner, made.id)).resolves.toBe('fake-original-key');
    await service.save(owner, { ...changed, apiKey: 'fake-new-endpoint-key' }, made.id);
    await expect(service.decryptCredential(owner, made.id)).resolves.toBe('fake-new-endpoint-key');
    expect(await service.list(owner)).toMatchObject([{ base_url: 'https://8.8.8.8/v1', profile_version: 2 }]);
  });

  it('serializes concurrent edits so a stale page cannot overwrite another save', async () => {
    const owner = (await db.query<{ id: string }>("SELECT id FROM accounts WHERE username_canonical='alice'")).rows[0]!.id;
    const service = new ModelProfileService(db, undefined);
    const input = { name: 'Original', endpointId: 'mock', modelId: 'mock-v1' };
    const made = await service.save(owner, input);
    const results = await Promise.allSettled([
      service.save(owner, { ...input, name: 'First', expectedVersion: 1 }, made.id),
      service.save(owner, { ...input, name: 'Second', expectedVersion: 1 }, made.id),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
    expect((await db.query('SELECT version FROM model_profile_versions WHERE profile_id=$1', [made.id])).rowCount).toBe(2);
  });

  it('keeps a custom endpoint private and refuses to attach another owner’s endpoint', async () => {
    const bobId = (await db.query<{ id: string }>("SELECT id FROM accounts WHERE username_canonical='bob'")).rows[0]!.id;
    const endpointId = `custom-${randomUUID()}`;
    await db.query(
      'INSERT INTO provider_endpoints(id,display_name,protocol,base_url,capabilities) VALUES($1,$2,$3,$4,$5)',
      [endpointId, 'Bob private endpoint', 'openai-chat-completions', 'https://api.example.com/v1', { ownerAccountId: bobId }],
    );

    const alice = await login('alice');
    const listed = await app.inject({ url: '/api/v1/model-endpoints', headers: { cookie: alice.cookie } });
    expect(listed.statusCode).toBe(200);
    expect(JSON.stringify(listed.json().data)).not.toContain(endpointId);

    const response = await app.inject({
      method: 'POST', url: '/api/v1/me/model-profiles',
      headers: { origin, cookie: alice.cookie, 'x-csrf-token': alice.csrf },
      payload: { name: 'stolen endpoint', endpointId, modelId: 'model-v1', parameters: {} },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
    expect((await db.query('SELECT id FROM model_profiles WHERE name=$1', ['stolen endpoint'])).rowCount).toBe(0);
  });
});
