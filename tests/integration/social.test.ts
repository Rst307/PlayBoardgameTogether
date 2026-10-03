import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../apps/api/src/app.js';
import { createDatabase, type Database } from '../../apps/api/src/db/index.js';
import { createRegistry } from '../../apps/api/src/registry/index.js';
import { createAccount } from '../../apps/api/src/auth.js';
import { socialOverviewSchema, friendshipSchema, friendInviteSchema, messagePageSchema, socialMessageSchema } from '../../packages/protocol/src/index.js';

process.loadEnvFile('.env');
const url = process.env.TEST_DATABASE_URL;
if (!url || !process.env.DATABASE_URL || new URL(url).pathname === new URL(process.env.DATABASE_URL).pathname)
  throw new Error('An isolated test database is required');
const origin = 'http://127.0.0.1:5173';
type Headers = { cookie: string; origin: string; 'x-csrf-token': string };

describe('friends, private messages and room invitations', () => {
  let db: Database;
  let app: Awaited<ReturnType<typeof createApp>>;
  let a: Headers, b: Headers, c: Headers;
  let aid: string, bid: string, cid: string;
  const post = (path: string, payload: unknown, headers = a) => app.inject({ method: 'POST', url: path, headers, payload });
  const read = (path: string, headers = a) => app.inject({ url: path, headers });
  const overview = async (headers = a) => {
    const response = await read('/api/v1/social', headers);
    expect(response.statusCode).toBe(200);
    return socialOverviewSchema.parse(response.json().data);
  };
  beforeAll(async () => {
    db = createDatabase(url);
    app = await createApp({ db, registry: createRegistry(false), config: {
      NODE_ENV: 'test', API_HOST: '127.0.0.1', API_PORT: 3001, DATABASE_URL: url,
      WEB_ORIGIN: origin, ENABLE_DEV_LAB: false, LOG_LEVEL: 'silent',
    } });
  });
  afterAll(async () => { await app.close(); });
  async function login(username: string) {
    const response = await post('/api/v1/auth/login', { username, password: 'social test password' }, { origin, cookie: '', 'x-csrf-token': '' });
    expect(response.statusCode).toBe(200);
    const cookies = response.headers['set-cookie'];
    return { cookie: (Array.isArray(cookies) ? cookies : [String(cookies)]).map(value => value.split(';')[0]).join('; '), origin, 'x-csrf-token': String(response.json().data.csrfToken) };
  }
  beforeEach(async () => {
    await db.query('TRUNCATE accounts CASCADE');
    aid = await createAccount(db, { username: 'social_a', displayName: '桌友 A', password: 'social test password', role: 'user' });
    bid = await createAccount(db, { username: 'social_b', displayName: '桌友 B', password: 'social test password', role: 'user' });
    cid = await createAccount(db, { username: 'social_c', displayName: '桌友 C', password: 'social test password', role: 'user' });
    await db.query('UPDATE accounts SET friend_id=username_canonical');
    a = await login('social_a'); b = await login('social_b'); c = await login('social_c');
  }, 15000);
  async function friend() {
    const sent = await post('/api/v1/social/requests', { requestId: randomUUID(), friendId: 'SOCIAL_B' });
    expect(sent.statusCode).toBe(200);
    const pending = friendshipSchema.parse(sent.json().data);
    const accepted = await post(`/api/v1/social/friends/${aid}`, { requestId: randomUUID(), expectedRevision: pending.revision, action: 'accept' }, b);
    expect(accepted.statusCode).toBe(200);
  }
  async function room(password?: string, seatCount = 2) {
    const result = await post('/api/v1/rooms', { requestId: randomUUID(), name: '好友私桌', gameId: 'color-match', version: '1.0.0', options: {}, seatCount, visibility: 'private', ...(password ? { password } : {}) });
    expect(result.statusCode).toBe(200);
    return { id: String(result.json().data.roomId), revision: Number(result.json().data.room.roomRevision), inviteCode: String(result.json().data.inviteCode) };
  }
  async function invite(roomId: string, revision: number) {
    const input = { requestId: randomUUID(), friendAccountId: bid, expectedRoomRevision: revision };
    const response = await post(`/api/v1/rooms/${roomId}/friend-invitations`, input);
    expect(response.statusCode).toBe(200);
    return { input, value: friendInviteSchema.parse(response.json().data) };
  }
  it('requires session, exact Origin, CSRF and strict inputs; exact search excludes secrets', async () => {
    expect((await app.inject({ url: '/api/v1/social' })).statusCode).toBe(401);
    const payload = { requestId: randomUUID(), friendId: 'social_b' };
    expect((await post('/api/v1/social/requests', payload, { ...a, origin: 'https://evil.example' })).statusCode).toBe(403);
    expect((await post('/api/v1/social/requests', payload, { ...a, 'x-csrf-token': '' })).statusCode).toBe(403);
    expect((await post('/api/v1/social/requests', { ...payload, accountId: cid })).statusCode).toBe(400);
    expect((await post('/api/v1/social/requests', { ...payload, friendId: 'social_a' })).statusCode).toBe(403);
    const found = await read('/api/v1/social/search?friendId=SOCIAL_B');
    expect(found.statusCode).toBe(200);
    expect(found.json().data).toEqual({ id: bid, friendId: 'social_b', displayName: '桌友 B', avatar: 'dice' });
    expect(found.headers['cache-control']).toBe('no-store');
    expect(found.body).not.toMatch(/password|username|bio|token|csrf/);
    expect((await read('/api/v1/social/search?friendId=social')).json().data).toBeNull();
  });
  it('changes unique public IDs without changing login, friends or internal account identity', async () => {
    await friend();
    const input = { requestId: randomUUID(), expectedRevision: 1, friendId: 'NEW_NAME' };
    const write = (payload: unknown) => app.inject({ method: 'PUT', url: '/api/v1/social/id', headers: a, payload });
    expect((await write(input)).json().data).toEqual({ friendId: 'new_name', revision: 2 });
    expect((await write(input)).json().data).toEqual({ friendId: 'new_name', revision: 2 });
    expect((await write({ ...input, friendId: 'other_name' })).statusCode).toBe(409);
    expect((await write({ ...input, requestId: randomUUID() })).statusCode).toBe(409);
    expect((await write({ requestId: randomUUID(), friendId: 'social_b', expectedRevision: 2 })).statusCode).toBe(409);
    expect((await read('/api/v1/auth/me')).json().data.account.id).toBe(aid);
    expect((await overview(b)).friends[0]!.person.friendId).toBe('new_name');
    expect((await read('/api/v1/social/search?friendId=social_a')).json().data).toBeNull();
    expect(await login('social_a')).toBeDefined();
    expect((await db.query('SELECT social_revision FROM accounts WHERE id=$1', [aid])).rows[0].social_revision).toBe(2);
  });
  it('serializes opposing requests, restricts responses and replays successful commands before revision', async () => {
    const input = { requestId: randomUUID(), friendId: 'social_b' };
    const results = await Promise.all([post('/api/v1/social/requests', input), post('/api/v1/social/requests', { requestId: randomUUID(), friendId: 'social_a' }, b)]);
    expect(results.map(item => item.statusCode)).toEqual([200, 200]);
    expect((await db.query('SELECT * FROM friendships')).rowCount).toBe(1);
    const row = (await db.query('SELECT requested_by,revision FROM friendships')).rows[0];
    const sender = row.requested_by === aid ? a : b;
    const recipient = row.requested_by === aid ? b : a;
    const senderId = String(row.requested_by);
    const peerId = senderId === aid ? bid : aid;
    const command = { requestId: randomUUID(), expectedRevision: Number(row.revision), action: 'accept' };
    expect((await post(`/api/v1/social/friends/${peerId}`, command, sender)).statusCode).toBe(403);
    expect((await post(`/api/v1/social/friends/${senderId}`, command, c)).statusCode).toBe(403);
    expect((await post(`/api/v1/social/friends/${senderId}`, command, recipient)).statusCode).toBe(200);
    expect((await post(`/api/v1/social/friends/${senderId}`, command, recipient)).statusCode).toBe(200);
    expect((await post(`/api/v1/social/friends/${senderId}`, { ...command, requestId: randomUUID() }, recipient)).statusCode).toBe(409);
    expect((await overview()).friends).toHaveLength(1);
  });
  it('supports reject and cancel, and prevents immediate repeated requests', async () => {
    await post('/api/v1/social/requests', { requestId: randomUUID(), friendId: 'social_b' });
    expect((await post(`/api/v1/social/friends/${bid}`, { requestId: randomUUID(), expectedRevision: 1, action: 'cancel' }, b)).statusCode).toBe(403);
    expect((await post(`/api/v1/social/friends/${aid}`, { requestId: randomUUID(), expectedRevision: 1, action: 'reject' }, b)).statusCode).toBe(200);
    expect((await post('/api/v1/social/requests', { requestId: randomUUID(), friendId: 'social_b' })).statusCode).toBe(429);
    await post('/api/v1/social/requests', { requestId: randomUUID(), friendId: 'social_c' });
    expect((await post(`/api/v1/social/friends/${cid}`, { requestId: randomUUID(), expectedRevision: 1, action: 'cancel' })).statusCode).toBe(200);
    expect((await overview()).requests).toHaveLength(0);
  });
  it('keeps messages private, deduplicates concurrent sends and read watermarks are monotonic', async () => {
    const path = `/api/v1/social/friends/${bid}/messages`;
    expect((await post(path, { requestId: randomUUID(), text: 'before friendship' })).statusCode).toBe(403);
    await friend();
    const input = { requestId: randomUUID(), text: '<script>alert(1)</script> 好友私聊' };
    const [first, duplicate] = await Promise.all([post(path, input), post(path, input)]);
    expect(first.statusCode).toBe(200); expect(duplicate.json().data).toEqual(first.json().data);
    const message = socialMessageSchema.parse(first.json().data);
    expect((await post(path, { ...input, text: 'changed' })).statusCode).toBe(409);
    expect((await post(path, { requestId: randomUUID(), text: 'x'.repeat(2001) })).statusCode).toBe(400);
    expect((await read(path, c)).statusCode).toBe(403);
    expect((await overview(b)).friends[0]!.unread).toBe(1);
    const later = socialMessageSchema.parse((await post(path, { requestId: randomUUID(), text: 'second' })).json().data);
    const readPath = `/api/v1/social/friends/${aid}/read`;
    expect((await post(readPath, { requestId: randomUUID(), messageId: later.id }, b)).statusCode).toBe(200);
    expect((await post(readPath, { requestId: randomUUID(), messageId: message.id }, b)).statusCode).toBe(200);
    expect((await overview(b)).friends[0]!.unread).toBe(0);
    expect((await read(path)).headers['cache-control']).toBe('no-store');
    const removed = await post(`/api/v1/social/friends/${bid}`, { requestId: randomUUID(), expectedRevision: 2, action: 'remove' });
    expect(removed.statusCode).toBe(200);
    expect((await read(path)).statusCode).toBe(403);
    expect((await post(path, { requestId: randomUUID(), text: 'after delete' })).statusCode).toBe(403);
    expect((await db.query('SELECT * FROM direct_messages')).rowCount).toBe(2);
  });
  it('paginates only the current conversation and rejects other conversation cursors/read markers', async () => {
    await friend();
    for (let i = 0; i < 32; i++) await post(`/api/v1/social/friends/${bid}/messages`, { requestId: randomUUID(), text: `message ${i}` });
    const latest = messagePageSchema.parse((await read(`/api/v1/social/friends/${bid}/messages`)).json().data);
    expect(latest.items).toHaveLength(30); expect(latest.nextCursor).not.toBeNull();
    const older = messagePageSchema.parse((await read(`/api/v1/social/friends/${bid}/messages?before=${latest.nextCursor}`)).json().data);
    expect(older.items.map(item => item.text)).toEqual(['message 0', 'message 1']);
    const recovered = messagePageSchema.parse((await read(`/api/v1/social/friends/${bid}/messages?after=${older.items[0]!.id}`)).json().data);
    expect(recovered.items).toHaveLength(30);
    expect(recovered.items[0]!.text).toBe('message 1');
    expect(recovered.items.at(-1)!.text).toBe('message 30');
    const remaining = messagePageSchema.parse((await read(`/api/v1/social/friends/${bid}/messages?after=${recovered.nextCursor}`)).json().data);
    expect(remaining.items.map(item => item.text)).toEqual(['message 31']);
    await db.query("INSERT INTO friendships(account_low,account_high,requested_by,status) VALUES(LEAST($1::uuid,$2::uuid),GREATEST($1::uuid,$2::uuid),$1,'accepted')", [aid, cid]);
    const secret = socialMessageSchema.parse((await post(`/api/v1/social/friends/${cid}/messages`, { requestId: randomUUID(), text: 'other secret' })).json().data);
    expect(messagePageSchema.parse((await read(`/api/v1/social/friends/${bid}/messages?before=${secret.id}`)).json().data).items).toHaveLength(0);
    expect((await post(`/api/v1/social/friends/${bid}/read`, { requestId: randomUUID(), messageId: secret.id })).statusCode).toBe(403);
  });
  it('joins password/private rooms atomically and preserves duplicate outcomes', async () => {
    await friend();
    const table = await room('private password');
    const invitation = await invite(table.id, table.revision);
    expect((await post(`/api/v1/rooms/${table.id}/friend-invitations`, invitation.input)).json().data).toEqual(invitation.value);
    const path = `/api/v1/social/invitations/${invitation.value.id}`;
    const input = { requestId: randomUUID(), action: 'accept', password: 'wrong' };
    expect((await post(path, input, c)).statusCode).toBe(404);
    expect((await post(path, input, b)).statusCode).toBe(403);
    expect((await db.query('SELECT status FROM friend_room_invitations')).rows[0].status).toBe('pending');
    expect((await db.query('SELECT * FROM room_members WHERE room_id=$1', [table.id])).rowCount).toBe(1);
    expect((await db.query('SELECT * FROM social_command_receipts WHERE request_id=$1', [input.requestId])).rowCount).toBe(0);
    const command = { ...input, password: 'private password' };
    const results = await Promise.all([post(path, command, b), post(path, command, b)]);
    expect(results.map(item => item.statusCode)).toEqual([200, 200]);
    const snapshot = (await read(`/api/v1/rooms/${table.id}`, b)).json().data;
    expect(snapshot.members).toHaveLength(2); expect(snapshot.roomRevision).toBe(table.revision + 1);
    expect(snapshot.seats.filter((seat: { ownerAccountId: string }) => seat.ownerAccountId === bid)).toHaveLength(0);
    expect((await db.query('SELECT input_hash,result FROM social_command_receipts')).rows.map(row => JSON.stringify(row)).join('')).not.toContain('private password');
    expect((await post(path, { ...command, requestId: randomUUID() }, b)).statusCode).toBe(409);
  });
  it('rejects stale/full/expired invitations and revokes pending invites when friendship is removed', async () => {
    await friend();
    const table = await room();
    expect((await post(`/api/v1/rooms/${table.id}/friend-invitations`, { requestId: randomUUID(), friendAccountId: bid, expectedRoomRevision: table.revision + 1 })).statusCode).toBe(409);
    const invitation = await invite(table.id, table.revision);
    expect((await post('/api/v1/rooms/join', { requestId: randomUUID(), inviteCode: table.inviteCode }, c)).statusCode).toBe(200);
    const path = `/api/v1/social/invitations/${invitation.value.id}`;
    expect((await post(path, { requestId: randomUUID(), action: 'accept' }, b)).statusCode).toBe(409);
    await db.query("UPDATE friend_room_invitations SET expires_at=now()-interval '1 second'");
    expect((await overview(b)).invitations[0]!.available).toBe(false);
    expect((await post(path, { requestId: randomUUID(), action: 'accept' }, b)).statusCode).toBe(404);
    await post(`/api/v1/social/friends/${bid}`, { requestId: randomUUID(), expectedRevision: 2, action: 'remove' });
    expect((await db.query('SELECT status FROM friend_room_invitations')).rows[0].status).toBe('rejected');
    expect((await post(path, { requestId: randomUUID(), action: 'accept' }, b)).statusCode).toBe(409);
  });
  it('rejects closed rooms and disabled sessions', async () => {
    await friend();
    const table = await room(); const invitation = await invite(table.id, table.revision);
    await post(`/api/v1/rooms/${table.id}/close`, { requestId: randomUUID(), expectedRoomRevision: table.revision });
    expect((await post(`/api/v1/social/invitations/${invitation.value.id}`, { requestId: randomUUID(), action: 'accept' }, b)).statusCode).toBe(404);
    await db.query("UPDATE accounts SET status='disabled' WHERE id=$1", [bid]);
    expect((await read('/api/v1/social', b)).statusCode).toBe(401);
    expect((await read('/api/v1/social/search?friendId=social_b')).json().data).toBeNull();
    expect((await post(`/api/v1/social/friends/${bid}/messages`, { requestId: randomUUID(), text: 'disabled' })).statusCode).toBe(403);
  });
  it('rolls back membership, ready, revision and invitation if receipt persistence fails', async () => {
    await friend();
    const table = await room(); const invitation = await invite(table.id, table.revision);
    await db.query('UPDATE seats SET ready=true WHERE room_id=$1 AND owner_account_id IS NOT NULL', [table.id]);
    const input = { requestId: randomUUID(), action: 'accept' };
    await db.query(`CREATE FUNCTION fail_social_receipt_test() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'test storage failure'; END; $$`);
    await db.query('CREATE TRIGGER fail_social_receipt_test BEFORE INSERT ON social_command_receipts FOR EACH ROW EXECUTE FUNCTION fail_social_receipt_test()');
    try {
      expect((await post(`/api/v1/social/invitations/${invitation.value.id}`, input, b)).statusCode).toBe(500);
      expect((await db.query('SELECT * FROM room_members WHERE room_id=$1', [table.id])).rowCount).toBe(1);
      expect((await db.query('SELECT room_revision FROM rooms WHERE id=$1', [table.id])).rows[0].room_revision).toBe(table.revision);
      expect((await db.query('SELECT ready FROM seats WHERE room_id=$1 AND owner_account_id IS NOT NULL', [table.id])).rows.every(row => row.ready)).toBe(true);
      expect((await db.query('SELECT status FROM friend_room_invitations WHERE id=$1', [invitation.value.id])).rows[0].status).toBe('pending');
    } finally {
      await db.query('DROP TRIGGER fail_social_receipt_test ON social_command_receipts');
      await db.query('DROP FUNCTION fail_social_receipt_test()');
    }
    expect((await post(`/api/v1/social/invitations/${invitation.value.id}`, input, b)).statusCode).toBe(200);
  });
  it('does not overfill the last seat when a friend invitation races an ordinary code join', async () => {
    await friend(); const table = await room(); const invitation = await invite(table.id, table.revision);
    const results = await Promise.all([
      post(`/api/v1/social/invitations/${invitation.value.id}`, { requestId: randomUUID(), action: 'accept' }, b),
      post('/api/v1/rooms/join', { requestId: randomUUID(), inviteCode: table.inviteCode }, c),
    ]);
    expect(results.filter(item => item.statusCode === 200)).toHaveLength(1);
    expect((await db.query('SELECT * FROM room_members WHERE room_id=$1', [table.id])).rowCount).toBe(2);
    expect((await db.query('SELECT room_revision FROM rooms WHERE id=$1', [table.id])).rows[0].room_revision).toBe(table.revision + 1);
  });
});
