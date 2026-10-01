import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createDatabase, databaseStatus, listInstalledGames, type Database } from '../../apps/api/src/db/index.js';
import { createRegistry } from '../../apps/api/src/registry/index.js';

process.loadEnvFile('.env');
const developmentUrl = process.env.DATABASE_URL;
const testUrl = process.env.TEST_DATABASE_URL;
describe.skipIf(!developmentUrl || !testUrl)('real PostgreSQL integration', () => {
  let db: Database;
  beforeAll(() => { if (developmentUrl === testUrl) throw new Error('Refusing integration test: test and development database URLs match'); db = createDatabase(testUrl!); });
  afterAll(async () => { await db?.end(); });
  it('has applied migrations and an executable installation matching the code registry', async () => {
    const registry = createRegistry(true);
    expect(await databaseStatus(db, registry.manifests())).toEqual({ ready: true });
    expect(await listInstalledGames(db, false)).toContainEqual(registry.manifests()[0]);
  });
  it('migrates populated stage-3 match and receipt rows without inventing version digests', async () => {
    const client = await db.connect();
    const schema = `stage4_fixture_${randomUUID().replaceAll('-', '')}`;
    const matchId = randomUUID();
    const accountId = randomUUID();
    try {
      await client.query('BEGIN');
      await client.query(`CREATE SCHEMA ${schema}`);
      await client.query(`SET LOCAL search_path TO ${schema}`);
      await client.query('CREATE TABLE matches(id uuid PRIMARY KEY,state jsonb NOT NULL,rng_state jsonb NOT NULL,revision integer NOT NULL)');
      await client.query('CREATE TABLE command_receipts(account_id uuid NOT NULL,operation text NOT NULL,request_id text NOT NULL,expires_at timestamptz NOT NULL)');
      await client.query('INSERT INTO matches(id,state,rng_state,revision) VALUES($1,$2,$3,1)', [
        matchId, { phase: 'choose_target' }, { algorithm: 'mulberry32-v1', state: 123 },
      ]);
      await client.query("INSERT INTO command_receipts(account_id,operation,request_id,expires_at) VALUES($1,$2,'old-match',now()+interval '1 day'),($1,'room.start','old-room',now()+interval '1 day')", [accountId, `match.action:${matchId}`]);
      const migration = readFileSync(new URL('../../apps/api/src/db/migrations/005_match_reliability.sql', import.meta.url), 'utf8');
      await client.query(migration);
      const match = await client.query<{state:unknown;rng_state:unknown;revision:number;rule_digest:string|null;resource_digest:string|null}>(
        'SELECT state,rng_state,revision,rule_digest,resource_digest FROM matches WHERE id=$1', [matchId]);
      expect(match.rows[0]).toEqual({ state: { phase: 'choose_target' }, rng_state: { algorithm: 'mulberry32-v1', state: 123 },
        revision: 1, rule_digest: null, resource_digest: null });
      const receipts = await client.query<{request_id:string;expiry:string}>(
        'SELECT request_id,expires_at::text AS expiry FROM command_receipts ORDER BY request_id');
      expect(receipts.rows.find(row => row.request_id === 'old-match')?.expiry).toBe('infinity');
      expect(receipts.rows.find(row => row.request_id === 'old-room')?.expiry).not.toBe('infinity');
    } finally { await client.query('ROLLBACK'); client.release(); }
  });
});
