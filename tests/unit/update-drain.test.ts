import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';
import WebSocket from 'ws';
import type { FastifyInstance, FastifyPluginCallback } from '../../apps/api/node_modules/fastify/fastify.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installUpdateDrain } from '../../apps/api/src/update-drain.js';
const requireApi = createRequire(new URL('../../apps/api/package.json', import.meta.url));
const Fastify: () => FastifyInstance = requireApi('fastify');
const websocket: FastifyPluginCallback = requireApi('@fastify/websocket');

afterEach(() => vi.restoreAllMocks());
describe('local IPC update drain', () => {
  async function fixture(timeoutMs = 1000) {
    const app = Fastify();
    await app.register(websocket);
    const send = vi.fn();
    const ipc = Object.assign(new EventEmitter(), { send });
    installUpdateDrain(app, ipc, timeoutMs);
    app.post('/start', async () => ({ started: true }));
    app.get('/ws', { websocket: true }, () => undefined);
    await app.ready();
    async function close() { await app.close(); }
    return { app, send, ipc, close };
  }
  async function drain(ipc: EventEmitter) { ipc.emit('message', 'update.drain'); await new Promise(done => setImmediate(done)); }
  it('blocks new commands after idle confirmation and resumes explicitly', async () => {
    const { app, send, ipc, close } = await fixture();
    try {
      await drain(ipc); expect(send).toHaveBeenCalledWith({ type: 'update.drained', idle: true });
      expect((await app.inject({ method: 'POST', url: '/start' })).statusCode).toBe(503);
      ipc.emit('message', 'update.resume');
      expect((await app.inject({ method: 'POST', url: '/start' })).statusCode).toBe(200);
    } finally { await close(); }
  });
  it('waits for an admitted command to finish and rejects new polling/commands during drain', async () => {
    const send = vi.fn();
    let release!: () => void;
    const hold = new Promise<void>(done => { release = done; });
    const other = Fastify(); await other.register(websocket);
    const ipc = Object.assign(new EventEmitter(), { send });
    installUpdateDrain(other, ipc, 1000);
    let admitted!: () => void;
    const entered = new Promise<void>(done => { admitted = done; });
    other.post('/start', async () => { admitted(); await hold; return {}; });
    const request = other.inject({ method: 'POST', url: '/start' });
    try {
      void request.then(() => undefined); await entered; await drain(ipc);
      expect(send).not.toHaveBeenCalled();
      expect((await other.inject({ method: 'POST', url: '/start' })).statusCode).toBe(503);
      release();
      expect((await request).statusCode).toBe(200);
      await vi.waitFor(() => expect(send).toHaveBeenLastCalledWith({ type: 'update.drained', idle: true }));
    } finally { release(); await request; await other.close(); }
  });
  it('drains a persistent WebSocket instead of waiting forever for the user to close it', async () => {
    const { app, send, ipc, close } = await fixture();
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    const socket = new WebSocket(address.replace('http:', 'ws:') + '/ws');
    try {
      await new Promise<void>((done, reject) => { socket.once('open', done); socket.once('error', reject); });
      const ended = new Promise<number>(done => socket.once('close', code => done(code)));
      await drain(ipc);
      await vi.waitFor(() => expect(send).toHaveBeenLastCalledWith({ type: 'update.drained', idle: true }));
      expect(await ended).toBe(1012);
      expect(send).toHaveBeenLastCalledWith({ type: 'update.drained', idle: true });
    } finally { socket.terminate(); await close(); }
  });
  it('reports a bounded timeout and resumes serving without stopping an unfinished request', async () => {
    const send = vi.fn();
    const ipc = Object.assign(new EventEmitter(), { send });
    let release!: () => void;
    let entered!: () => void;
    const hold = new Promise<void>(done => { release = done; });
    const admitted = new Promise<void>(done => { entered = done; });
    const other = Fastify();
    await other.register(websocket);
    installUpdateDrain(other, ipc, 40);
    other.post('/slow', async () => { entered(); await hold; return { committed: true }; });
    const request = other.inject({ method: 'POST', url: '/slow' });
    try {
      void request.then(() => undefined);
      await admitted;
      await drain(ipc);
      await vi.waitFor(() => expect(send).toHaveBeenLastCalledWith({ type: 'update.drained', idle: false }));
      expect((await other.inject({ url: '/unknown' })).statusCode).toBe(404);
      release();
      expect((await request).json()).toEqual({ committed: true });
    } finally { release(); await request; await other.close(); }
  });
  it('closes a handshake admitted before the gate that finishes during drain', async () => {
    const app = Fastify();
    await app.register(websocket);
    const send = vi.fn();
    const ipc = Object.assign(new EventEmitter(), { send });
    installUpdateDrain(app, ipc, 1000);
    let release!: () => void;
    let entered!: () => void;
    const hold = new Promise<void>(done => { release = done; });
    const admitted = new Promise<void>(done => { entered = done; });
    app.get('/ws', {
      websocket: true,
      preValidation: async () => { entered(); await hold; },
    }, () => undefined);
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    const socket = new WebSocket(address.replace('http:', 'ws:') + '/ws');
    const ended = new Promise<number>((done, reject) => {
      socket.once('close', code => done(code));
      socket.once('error', reject);
    });
    try {
      await admitted;
      await drain(ipc);
      expect(send).not.toHaveBeenCalled();
      release();
      expect(await ended).toBe(1012);
      await vi.waitFor(() => expect(send).toHaveBeenLastCalledWith({ type: 'update.drained', idle: true }));
    } finally { release(); socket.terminate(); await app.close(); }
  });
  it('ignores an obsolete drain after explicit resume', async () => {
    const app = Fastify();
    await app.register(websocket);
    const send = vi.fn();
    const ipc = Object.assign(new EventEmitter(), { send });
    installUpdateDrain(app, ipc, 1000);
    let release!: () => void;
    let entered!: () => void;
    const hold = new Promise<void>(done => { release = done; });
    const admitted = new Promise<void>(done => { entered = done; });
    app.post('/slow', async () => { entered(); await hold; return {}; });
    const request = app.inject({ method: 'POST', url: '/slow' });
    try {
      void request.then(() => undefined);
      await admitted;
      await drain(ipc);
      ipc.emit('message', 'update.resume');
      release();
      await request;
      await new Promise(done => setTimeout(done, 40));
      expect(send).not.toHaveBeenCalled();
      expect((await app.inject({ url: '/missing' })).statusCode).toBe(404);
    } finally { release(); await request; await app.close(); }
  });
});
