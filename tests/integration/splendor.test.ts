import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../apps/api/src/app.js';
import { createDatabase, type Database } from '../../apps/api/src/db/index.js';
import { createRegistry } from '../../apps/api/src/registry/index.js';
import { createAccount } from '../../apps/api/src/auth.js';
import { decideBasicSplendor } from '../../games/splendor/src/server/index.js';
import { viewSchema } from '../../games/splendor/src/shared/index.js';


process.loadEnvFile('.env');
const url = process.env.TEST_DATABASE_URL;
if (url && url === process.env.DATABASE_URL) throw new Error('Refusing shared development database');
const origin = 'http://127.0.0.1:5173';
type Session = { cookie: string; csrf: string };

describe.skipIf(!url)('Splendor formal action flow', () => {
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
  async function start(seatCount = 2, assetVersionId?: string) {
    const sessions = await Promise.all(['garden_a', 'garden_b', 'garden_c', 'garden_d'].map(login));
    const created = await write('/api/v1/rooms', sessions[0]!, { requestId: 'create', name: 'Splendor', gameId: 'splendor.base', version: '1.0.0', options: {}, seatCount });
    expect(created.statusCode).toBe(200);
    const { roomId, inviteCode } = created.json().data;
    let revision = 0;
    if (assetVersionId) {
      const selected = await write(`/api/v1/rooms/${roomId}/assets`, sessions[0]!, {
        requestId: 'select-tts', expectedRoomRevision: revision, versionId: assetVersionId,
      }, 'PUT');
      expect(selected.statusCode).toBe(200);
      revision = selected.json().data.roomRevision;
    }
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
  it('locks the selected TTS manifest and restores both image and legacy SVG matches', async () => {
    const versions = (await db.query<{ id: string; pack_id: string; manifest_hash: string; manifest: { assets: Record<string, unknown> } }>(
      "SELECT id,pack_id,manifest_hash,manifest FROM asset_versions WHERE game_id='splendor.base' AND status='published' ORDER BY pack_id",
    )).rows;
    expect(versions.map(version => version.pack_id)).toEqual(['splendor.original', 'splendor.tts-classic']);
    const tts = versions.find(version => version.pack_id === 'splendor.tts-classic')!;
    expect(Object.keys(tts.manifest.assets)).toHaveLength(109);
    const { sessions, matchId } = await start(2, tts.id);
    const endpoint = '/api/v1/matches/' + matchId + '/view';
    const initial = (await read(endpoint, sessions[0]!)).json().data;
    expect(initial.assetBinding.versionId).toBe(tts.id);
    expect(initial.assetBinding.manifestHash).toBe(tts.manifest_hash);
    expect((await read(endpoint, sessions[0]!)).json().data.assetBinding).toEqual(initial.assetBinding);
    // The previous release created null bindings; its rule/resource digest stays unchanged.
    await db.query("UPDATE matches SET asset_version_id=NULL,asset_manifest_hash=NULL,asset_contract_version=NULL,resource_pack_id='splendor.original' WHERE id=$1", [matchId]);
    const legacy = await read(endpoint, sessions[0]!);
    expect(legacy.statusCode).toBe(200);
    expect(legacy.json().data.assetBinding).toBeNull();
    expect(legacy.json().data.view).toEqual(initial.view);
  });

  it('enforces identity, conflicts, exact retries, rollback, private reservation and recovery', async () => {
    const { sessions, matchId } = await start();
    const endpoint = '/api/v1/matches/' + matchId;
    const payload = { requestId: 'blind', expectedRevision: 0, action: { type: 'reserve_deck', tier: 1 } };
    const initial = (await read(endpoint + '/view', sessions[0]!)).json().data;
    expect(initial.view.deckCounts).toEqual([36,26,16]);
    expect((await write(endpoint + '/actions', sessions[1]!, payload)).statusCode).toBe(422);
    expect((await read(endpoint + '/view', sessions[0]!)).json().data.revision).toBe(0);
    const [accepted, conflict] = await Promise.all([
      write(endpoint + '/actions', sessions[0]!, payload),
      write(endpoint + '/actions', sessions[0]!, { ...payload, requestId: 'race', action: { type: 'take', colors: ['white','blue','green'] } }),
    ]);
    expect([accepted.statusCode, conflict.statusCode].sort()).toEqual([200,409]);
    const won = accepted.statusCode === 200 ? payload : { ...payload, requestId: 'race', action: { type: 'take', colors: ['white','blue','green'] } };
    expect((await write(endpoint + '/actions', sessions[0]!, won)).statusCode).toBe(200);
    expect((await write(endpoint + '/actions', sessions[0]!, { ...won, action: { type: 'reserve_deck', tier: 3 } })).statusCode).toBe(409);
    expect((await read(endpoint + '/commands/' + won.requestId, sessions[0]!)).json().data.outcome).toBe('accepted');
    const outsider = sessions[2]!;
    expect((await read(endpoint + '/view', outsider)).statusCode).toBe(404);
    const before = (await db.query('SELECT state, rng_state, revision FROM matches WHERE id=$1', [matchId])).rows[0];
    expect((await write(endpoint + '/actions', sessions[1]!, { requestId: 'illegal', expectedRevision: 1,
      action: { type: 'buy', cardId: 'card.white.0', payment: { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 } } })).statusCode).toBe(422);
    expect((await db.query('SELECT state, rng_state, revision FROM matches WHERE id=$1', [matchId])).rows[0]).toEqual(before);
    expect((await read(endpoint + '/commands/illegal', sessions[1]!)).json().data.outcome).toBe('not_found');
    const reserve = await write(endpoint + '/actions', sessions[1]!, { requestId: 'b-blind', expectedRevision: 1, action: { type: 'reserve_deck', tier: 2 } });
    expect(reserve.statusCode).toBe(200);
    const privateView = (await read(endpoint + '/view', sessions[1]!)).json().data.view;
    const publicView = (await read(endpoint + '/view', sessions[0]!)).json().data.view;
    expect(privateView.myReserved).toHaveLength(1);
    expect(publicView.players[privateView.viewingSeatId].reservedCount).toBe(1);
    expect(publicView.players[privateView.viewingSeatId]).not.toHaveProperty('reserved');
    expect(publicView).not.toHaveProperty('decks');
    const reloaded = (await read(endpoint + '/view', sessions[1]!)).json().data;
    expect(reloaded.view.myReserved).toEqual(privateView.myReserved);
    expect(reloaded.revision).toBe(2);
  });

  it.each([2,3,4])('finishes a %i-player match through authenticated commands and releases room ready state', async count => {
    const { sessions, roomId, matchId } = await start(count);
    const endpoint = '/api/v1/matches/' + matchId;
    let result = (await read(endpoint + '/view', sessions[0]!)).json().data;
    for (let step = 0; step < 600 && result.view.phase !== 'finished'; step++) {
      const seatIndex = result.view.seats.indexOf(result.view.currentSeatId);
      const session = sessions[seatIndex]!;
      result = (await read(endpoint + '/view', session)).json().data;
      const view = viewSchema.parse(result.view);
      const action = decideBasicSplendor({ view, legalActions: view.legalActions });
      expect(action).not.toBeNull();
      const response = await write(endpoint + '/actions', session, { requestId: 'move-' + step, expectedRevision: result.revision, action });
      expect(response.statusCode).toBe(200);
      result = (await read(endpoint + '/view', sessions[0]!)).json().data;
    }
    expect(result.view.phase).toBe('finished');
    expect(result.view.outcome.winners.length).toBeGreaterThan(0);
    const room = (await read('/api/v1/rooms/' + roomId, sessions[0]!)).json().data;
    expect(room.status).toBe('waiting');
    expect(room.activeMatchId).toBeNull();
    expect(room.seats.every((seat: { ready: boolean }) => !seat.ready)).toBe(true);
    expect((await db.query('SELECT status FROM matches WHERE id=$1',[matchId])).rows[0]!.status).toBe('finished');
  }, 30_000);
});
