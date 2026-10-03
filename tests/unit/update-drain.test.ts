import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';
import WebSocket from 'ws';
import type { FastifyInstance, FastifyPluginCallback } from '../../apps/api/node_modules/fastify/fastify.js';
import pg from 'pg';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installUpdateDrain } from '../../apps/api/src/update-drain.js';
const requireApi = createRequire(new URL('../../apps/api/package.json', import.meta.url));
const Fastify: () => FastifyInstance = requireApi('fastify');
const websocket: FastifyPluginCallback = requireApi('@fastify/websocket');

afterEach(() => vi.restoreAllMocks());
describe('local IPC update drain', () => {
  async function fixture(busy: boolean) {
    const app = Fastify();
    await app.register(websocket);
    const db = new pg.Pool();
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ busy }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });
    const send = vi.fn();
    const ipc = Object.assign(new EventEmitter(), { send });
    installUpdateDrain(app, db, ipc);
    app.post('/start', async () => ({ started: true }));
    app.get('/ws', { websocket: true }, () => undefined);
    await app.ready();
    async function close() { await app.close(); await db.end(); }
    return { app, db, send, ipc, close };
  }
  async function drain(ipc: EventEmitter) { ipc.emit('message', 'update.drain'); await new Promise(done => setImmediate(done)); }
  it('blocks new commands after idle confirmation and resumes explicitly', async () => {
    const { app, send, ipc, close } = await fixture(false);
    try {
      await drain(ipc); expect(send).toHaveBeenCalledWith({ type: 'update.drained', idle: true });
      expect((await app.inject({ method: 'POST', url: '/start' })).statusCode).toBe(503);
      ipc.emit('message', 'update.resume');
      expect((await app.inject({ method: 'POST', url: '/start' })).statusCode).toBe(200);
    } finally { await close(); }
  });
  it('keeps serving active games and fails closed when the database is unavailable', async () => {
    const { app, db, send, ipc, close } = await fixture(true);
    try {
      await drain(ipc); expect(send).toHaveBeenLastCalledWith({ type: 'update.drained', idle: false });
      expect((await app.inject({ method: 'POST', url: '/start' })).statusCode).toBe(200);
      vi.mocked(db.query).mockRejectedValueOnce(new Error('offline'));
      await drain(ipc); expect(send).toHaveBeenLastCalledWith({ type: 'update.drained', idle: false });
      expect((await app.inject({ method: 'POST', url: '/start' })).statusCode).toBe(200);
    } finally { await close(); }
  });
  it('does not drain an in-flight request that may create a match', async () => {
    const send = vi.fn();
    let release!: () => void;
    const hold = new Promise<void>(done => { release = done; });
    const other = Fastify(); await other.register(websocket);
    const db = new pg.Pool();
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ busy: false }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });
    const ipc = Object.assign(new EventEmitter(), { send });
    installUpdateDrain(other, db, ipc);
    let admitted!: () => void;
    const entered = new Promise<void>(done => { admitted = done; });
    other.post('/start', async () => { admitted(); await hold; return {}; });
    const request = other.inject({ method: 'POST', url: '/start' });
    try {
      void request.then(() => undefined); await entered; await drain(ipc);
      expect(send).toHaveBeenLastCalledWith({ type: 'update.drained', idle: false });
    } finally { release(); await request; await other.close(); await db.end(); }
  });
  it('waits for actual WebSocket connections to close before draining', async () => {
    const { app, send, ipc, close } = await fixture(false);
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    const socket = new WebSocket(address.replace('http:', 'ws:') + '/ws');
    try {
      await new Promise<void>((done, reject) => { socket.once('open', done); socket.once('error', reject); });
      await drain(ipc);
      expect(send).toHaveBeenLastCalledWith({ type: 'update.drained', idle: false });
      const peer = [...app.websocketServer.clients][0]!;
      const serverEnded = new Promise<void>(done => peer.once('close', () => done()));
      const ended = new Promise<void>(done => socket.once('close', () => done()));
      socket.close(); await ended; await serverEnded;
      await drain(ipc);
      expect(send).toHaveBeenLastCalledWith({ type: 'update.drained', idle: true });
    } finally { socket.terminate(); await close(); }
  });
});
