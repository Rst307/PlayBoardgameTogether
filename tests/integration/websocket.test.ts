import { afterEach, describe, expect, it } from 'vitest';
import WebSocket, { type RawData } from 'ws';
import { createApp } from '../../apps/api/src/app.js';
import { createRegistry } from '../../apps/api/src/registry/index.js';

const openApps: Array<Awaited<ReturnType<typeof createApp>>> = [];
afterEach(async () => { await Promise.all(openApps.splice(0).map(app => app.close())); });

async function server() {
  const db = { end: async () => {}, query: async () => ({ rows: [], rowCount: 0 }) } as any;
  const app = await createApp({ config: { NODE_ENV: 'development', API_HOST: '127.0.0.1', API_PORT: 3001, DATABASE_URL: 'postgresql://x:x@localhost/x', WEB_ORIGIN: 'http://127.0.0.1:5173', ENABLE_DEV_LAB: true, LOG_LEVEL: 'silent' }, db, registry: createRegistry(true) });
  await app.listen({ host: '127.0.0.1', port: 0 }); openApps.push(app);
  const address = app.server.address(); if (!address || typeof address === 'string') throw new Error('Expected TCP address');
  return `ws://127.0.0.1:${address.port}/api/v1/ws`;
}
function nextMessage(ws: WebSocket) { return new Promise<any>((resolve, reject) => { ws.once('message', data => resolve(JSON.parse(data.toString()))); ws.once('error', reject); }); }
function nextMessages(ws: WebSocket, count: number) { return new Promise<any[]>((resolve, reject) => { const replies: any[] = []; const onMessage = (data: RawData) => { replies.push(JSON.parse(data.toString())); if (replies.length === count) { ws.off('message', onMessage); resolve(replies); } }; ws.on('message', onMessage); ws.once('error', reject); }); }
function connect(url: string, origin = 'http://127.0.0.1:5173') { const ws = new WebSocket(url, { origin }); const firstMessage = nextMessage(ws); return new Promise<{ ws: WebSocket; firstMessage: Promise<any> }>((resolve, reject) => { ws.once('open', () => resolve({ ws, firstMessage })); ws.once('error', reject); }); }

describe('WebSocket diagnostics protocol', () => {
  it('sends hello, pong, bounded validation errors, and rate limiting', async () => {
    const { ws, firstMessage } = await connect(await server());
    expect(await firstMessage).toMatchObject({ protocolVersion: 1, type: 'hello' });
    ws.send(JSON.stringify({ protocolVersion: 1, type: 'ping', requestId: 'ping-1' }));
    expect(await nextMessage(ws)).toMatchObject({ type: 'pong', requestId: 'ping-1' });
    ws.send('{bad json'); expect(await nextMessage(ws)).toMatchObject({ type: 'error', code: 'VALIDATION_ERROR' });
    const pending = nextMessages(ws, 4);
    for (let i = 0; i < 4; i++) ws.send(JSON.stringify({ protocolVersion: 1, type: 'ping', requestId: `burst-${i}` }));
    const replies = await pending;
    expect(replies.some(reply => reply.code === 'RATE_LIMITED')).toBe(true);
    ws.close();
  });
  it('rejects foreign browser origins before upgrade', async () => {
    const url = await server();
    const status = await new Promise<number>((resolve, reject) => { const ws = new WebSocket(url, { origin: 'http://evil.invalid' }); ws.once('unexpected-response', (_request, response) => resolve(response.statusCode)); ws.once('open', () => reject(new Error('foreign origin unexpectedly connected'))); ws.once('error', () => {}); });
    expect(status).toBe(403);
  });
});
