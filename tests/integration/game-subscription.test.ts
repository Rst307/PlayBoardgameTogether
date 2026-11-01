import { createHash, randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../apps/api/src/app.js';
import { createDatabase, type Database } from '../../apps/api/src/db/index.js';
import { createRegistry } from '../../apps/api/src/registry/index.js';
import { createAccount } from '../../apps/api/src/auth.js';
import { gamePackageZip } from '../fixtures/game-package.js';
import type { OfficialPackage } from '../../apps/api/src/catalog/official-source.js';
import { GameSubscriptionService } from '../../apps/api/src/catalog/subscriptions.js';
import { GamePackageService } from '../../apps/api/src/catalog/package-service.js';

process.loadEnvFile('.env');
const url = process.env.TEST_DATABASE_URL;
if (
  !url ||
  url === process.env.DATABASE_URL ||
  new URL(url).pathname === new URL(process.env.DATABASE_URL!).pathname
)
  throw new Error('An isolated test database is required');
const origin = 'http://127.0.0.1:5173';
type Headers = { cookie: string; origin: string; 'x-csrf-token': string };
describe('official game subscription', () => {
  let db: Database, app: Awaited<ReturnType<typeof createApp>>, admin: Headers, user: Headers;
  let offers: OfficialPackage[], archives: Map<string, Buffer>, downloads: number;
  let onDownload: (() => Promise<void>) | undefined;
  async function offer(version: string, id = 'online.subscription-example') {
    const bytes = await gamePackageZip((source) =>
      source.replaceAll('online.score-race', id).replaceAll('1.0.0', version),
    );
    const candidate = {
      gameId: id,
      version,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      url: `https://github.com/${id}/${version}.zip`,
    };
    archives.set(candidate.url, bytes);
    offers = [candidate];
    return candidate;
  }
  async function login(username: string) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { origin },
      payload: { username, password: 'subscription test password' },
    });
    expect(response.statusCode).toBe(200);
    const raw = response.headers['set-cookie'];
    return {
      cookie: (Array.isArray(raw) ? raw : [String(raw)])
        .map((value) => value.split(';')[0])
        .join('; '),
      origin,
      'x-csrf-token': String(response.json().data.csrfToken),
    };
  }
  const read = () => app.inject({ url: '/api/v1/admin/game-subscription', headers: admin });
  const save = (
    revision: number,
    autoAdd: boolean,
    autoUpdate: boolean,
    requestId = randomUUID(),
    headers = admin,
  ) =>
    app.inject({
      method: 'PUT',
      url: '/api/v1/admin/game-subscription',
      headers,
      payload: { requestId, expectedRevision: revision, autoAdd, autoUpdate },
    });
  async function completed() {
    await expect
      .poll(async () => (await read()).json().data.status)
      .toMatch(/succeeded|partial|failed/);
    return (await read()).json().data;
  }
  beforeEach(async () => {
    offers = [];
    archives = new Map();
    downloads = 0;
    onDownload = undefined;
    db = createDatabase(url!);
    await db.query('TRUNCATE accounts CASCADE');
    await db.query(
      "DELETE FROM game_packages WHERE game_id='online.subscription-example'; DELETE FROM game_installations WHERE game_id='online.subscription-example'",
    );
    await db.query(
      "UPDATE game_subscription SET auto_add=false,auto_update=false,revision=0,authorized_by=NULL,next_check_at=NULL,requested_at=NULL,started_at=NULL,finished_at=NULL,status='idle',items='[]',message=''",
    );
    app = await createApp({
      db,
      registry: createRegistry(false),
      config: {
        NODE_ENV: 'test',
        API_HOST: '127.0.0.1',
        API_PORT: 3001,
        DATABASE_URL: url!,
        WEB_ORIGIN: origin,
        ENABLE_DEV_LAB: false,
        LOG_LEVEL: 'silent',
      },
      gameSubscriptionSource: {
        discover: async () => offers,
        download: async (item) => {
          downloads++;
          await onDownload?.();
          return archives.get(item.url)!;
        },
      },
    });
    for (const [username, role] of [
      ['subscribe_admin', 'administrator'],
      ['subscribe_user', 'user'],
    ] as const) {
      await createAccount(db, {
        username,
        displayName: username,
        password: 'subscription test password',
        role,
      });
    }
    admin = await login('subscribe_admin');
    user = await login('subscribe_user');
  });
  afterEach(async () => {
    await app.close();
    const cleanup = createDatabase(url!);
    try {
      await cleanup.query(
        'UPDATE game_subscription SET auto_add=false,auto_update=false,next_check_at=NULL',
      );
      await cleanup.query('TRUNCATE accounts CASCADE');
      await cleanup.query(
        "DELETE FROM game_packages WHERE game_id='online.subscription-example'; DELETE FROM game_installations WHERE game_id='online.subscription-example'",
      );
    } finally {
      await cleanup.end();
    }
  });
  it('checks administrator, Origin, CSRF, revisions and durable duplicate receipts', async () => {
    expect((await app.inject({ url: '/api/v1/admin/game-subscription' })).statusCode).toBe(401);
    expect((await save(0, true, true, randomUUID(), user)).statusCode).toBe(403);
    expect(
      (await save(0, true, true, randomUUID(), { ...admin, origin: 'https://evil.example' }))
        .statusCode,
    ).toBe(403);
    expect(
      (await save(0, true, true, randomUUID(), { ...admin, 'x-csrf-token': 'invalid' })).statusCode,
    ).toBe(403);
    const requestId = randomUUID();
    const initial = await save(0, false, false, requestId);
    expect(initial.statusCode).toBe(200);
    expect(initial.headers['cache-control']).toBe('no-store');
    expect((await save(0, false, false, requestId)).json().data).toEqual(initial.json().data);
    expect((await save(0, true, false, requestId)).json().error.code).toBe('REQUEST_ID_CONFLICT');
    expect((await save(0, true, true)).json().error.code).toBe('STATE_CONFLICT');
    const checks = {
      method: 'POST' as const,
      url: '/api/v1/admin/game-subscription/check',
      headers: admin,
      payload: { requestId: randomUUID(), expectedRevision: 1 },
    };
    expect((await app.inject(checks)).json().error.code).toBe('STATE_CONFLICT');
  });
  it('adds new games, updates atomically, never downgrades and respects delisting', async () => {
    await offer('1.0.0');
    expect((await save(0, true, false)).statusCode).toBe(200);
    expect((await completed()).items[0].outcome).toBe('added');
    await offer('1.1.0');
    await save(1, true, false);
    await expect
      .poll(async () => (await read()).json().data.items[0]?.message)
      .toBe('未启用自动更新');
    expect(downloads).toBe(1);
    await save(2, true, true);
    await expect
      .poll(
        async () =>
          (
            await db.query(
              "SELECT game_version FROM game_installations WHERE game_id='online.subscription-example' AND enabled",
            )
          ).rows[0]?.game_version,
      )
      .toBe('1.1.0');
    expect((await completed()).items[0].outcome).toBe('updated');
    expect(
      (
        await db.query(
          "SELECT count(*)::int AS count FROM game_packages WHERE game_id='online.subscription-example'",
        )
      ).rows[0].count,
    ).toBe(2);
    await offer('1.0.0');
    await save(3, true, true);
    await expect
      .poll(async () => (await read()).json().data.items[0]?.message)
      .toBe('已安装相同或更高版本');
    expect(downloads).toBe(2);
    await db.query(
      "UPDATE game_installations SET enabled=false WHERE game_id='online.subscription-example'",
    );
    await offer('1.2.0');
    await save(4, true, true);
    await expect
      .poll(async () => (await read()).json().data.items[0]?.message)
      .toBe('保留管理员下架状态');
    expect(downloads).toBe(2);
    expect(
      (
        await db.query(
          "SELECT 1 FROM game_installations WHERE game_id='online.subscription-example' AND enabled",
        )
      ).rowCount,
    ).toBe(0);
  });
  it('keeps add and update policies separate and cancels an in-flight install when disabled', async () => {
    await offer('1.0.0');
    await save(0, false, true);
    expect((await completed()).items[0].message).toBe('未启用自动添加');
    expect(downloads).toBe(0);
    onDownload = async () => {
      expect((await save(2, false, false)).statusCode).toBe(200);
    };
    await save(1, true, true);
    await expect.poll(async () => (await read()).json().data.status).toBe('partial');
    expect((await read()).json().data.autoAdd).toBe(false);
    expect(
      (await db.query("SELECT 1 FROM game_packages WHERE game_id='online.subscription-example'"))
        .rowCount,
    ).toBe(0);
  });
  it('serializes workers across connections and deduplicates manual synchronization requests', async () => {
    await offer('1.0.0');
    onDownload = async () => {
      let competingDiscoveries = 0;
      const other = new GameSubscriptionService(
        db,
        await GamePackageService.create(db, createRegistry(false)),
        {
          discover: async () => {
            competingDiscoveries++;
            return offers;
          },
          download: async () => {
            throw new Error('Competing worker must not download');
          },
        },
      );
      await other.runDue();
      expect(competingDiscoveries).toBe(0);
      const command = {
        method: 'POST' as const,
        url: '/api/v1/admin/game-subscription/check',
        headers: admin,
        payload: { requestId: randomUUID(), expectedRevision: 1 },
      };
      const first = await app.inject(command);
      expect(first.statusCode).toBe(200);
      expect(first.json().data.status).toBe('running');
      const before = (await db.query('SELECT next_check_at,requested_at FROM game_subscription'))
        .rows[0];
      expect((await app.inject(command)).json().data).toEqual(first.json().data);
      expect(
        (await db.query('SELECT next_check_at,requested_at FROM game_subscription')).rows[0],
      ).toEqual(before);
      expect(
        (await app.inject({ ...command, payload: { ...command.payload, requestId: randomUUID() } }))
          .statusCode,
      ).toBe(429);
    };
    await save(0, true, true);
    expect((await completed()).items[0].outcome).toBe('added');
    expect(downloads).toBe(1);
    await db.query("UPDATE game_subscription SET status='running'");
    expect((await read()).json().data.status).toBe('interrupted');
  });
  it('rejects manifest substitution and revoked administrator authorization without changing the catalog', async () => {
    const candidate = await offer('1.0.0');
    candidate.gameId = 'online.another-game';
    await save(0, true, true);
    expect((await completed()).items[0].outcome).toBe('failed');
    expect(
      (await db.query("SELECT 1 FROM game_packages WHERE game_id='online.subscription-example'"))
        .rowCount,
    ).toBe(0);
    await offer('1.0.0');
    onDownload = async () => {
      await db.query(
        "UPDATE accounts SET status='disabled' WHERE username_canonical='subscribe_admin'",
      );
    };
    await save(1, true, true);
    await expect
      .poll(async () => (await db.query('SELECT status FROM game_subscription')).rows[0].status)
      .toBe('partial');
    expect(
      (await db.query("SELECT 1 FROM game_packages WHERE game_id='online.subscription-example'"))
        .rowCount,
    ).toBe(0);
  });
});
