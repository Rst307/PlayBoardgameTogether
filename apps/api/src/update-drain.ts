import type { FastifyInstance } from 'fastify';
import { setTimeout as delay } from 'node:timers/promises';
import type { WebSocket } from 'ws';

/** Local parent-process IPC only; no network administration endpoint. */
type UpdateIpc = {
  on(event: 'message', listener: (message: unknown) => void): unknown;
  off(event: 'message', listener: (message: unknown) => void): unknown;
  send?: (message: { type: string; idle: boolean }) => unknown;
};
export function installUpdateDrain(app: FastifyInstance, ipc: UpdateIpc = process, timeoutMs = 30_000) {
  let draining = false;
  let generation = 0;
  let activeRequests = 0;
  const admitted = new WeakSet<object>();
  app.addHook('onRequest', async (request, reply) => {
    if (draining) return reply.code(503).header('retry-after', '3').send({
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Service restarting', retryable: true },
    });
    admitted.add(request);
    activeRequests++;
    // Fastify's upgraded requests do not always run onResponse. Count the
    // handshake until its transport closes, without leaking an idle blocker.
    if (request.headers.upgrade?.toLowerCase() === 'websocket') {
      request.raw.socket.once('close', () => {
        if (admitted.delete(request)) activeRequests--;
      });
    }
  });
  app.addHook('onResponse', async request => {
    if (admitted.delete(request)) activeRequests--;
  });
  // A handshake admitted just before the gate may finish after it is closed.
  const disconnect = (socket: WebSocket) => {
    if (!draining) return;
    socket.close(1012, 'service restart');
    const timer = setTimeout(() => socket.terminate(), 1000);
    timer.unref();
    socket.once('close', () => clearTimeout(timer));
  };
  app.websocketServer.on('connection', disconnect);
  const handler = async (message: unknown) => {
    if (message === 'update.resume') { generation++; draining = false; return; }
    if (message !== 'update.drain' || draining) return;
    const attempt = ++generation;
    draining = true;
    const deadline = Date.now() + timeoutMs;
    // Matches and their command receipts remain in PostgreSQL. WS carries only
    // subscriptions/views; actions use HTTP and must finish before shutdown.
    for (const socket of app.websocketServer.clients) disconnect(socket);
    while (activeRequests > 0 && Date.now() < deadline && attempt === generation) {
      await delay(Math.min(20, Math.max(1, deadline - Date.now())));
    }
    if (attempt !== generation) return;
    const idle = activeRequests === 0;
    if (!idle) draining = false;
    ipc.send?.({ type: 'update.drained', idle });
  };
  ipc.on('message', handler);
  app.addHook('onClose', async () => {
    generation++;
    ipc.off('message', handler);
    app.websocketServer.off('connection', disconnect);
  });
}
