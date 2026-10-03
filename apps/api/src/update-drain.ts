import type { FastifyInstance } from 'fastify';
import type { Database } from './db/index.js';

/** Local parent-process IPC only; no network administration endpoint. */
type UpdateIpc = {
  on(event: 'message', listener: (message: unknown) => void): unknown;
  off(event: 'message', listener: (message: unknown) => void): unknown;
  send?: (message: { type: string; idle: boolean }) => unknown;
};
export function installUpdateDrain(app: FastifyInstance, db: Database, ipc: UpdateIpc = process) {
  let draining = false;
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
  let checking = false;
  const handler = async (message: unknown) => {
    if (message === 'update.resume') { draining = false; return; }
    if (message !== 'update.drain' || checking) return;
    checking = true;
    draining = true;
    try {
      // Gate before inspection: a new start/action cannot race the idle check.
      const result = await db.query<{ busy: boolean }>(
        "SELECT EXISTS(SELECT 1 FROM matches WHERE status='active') AS busy",
      );
      const idle = result.rows[0]?.busy === false && activeRequests === 0 && app.websocketServer.clients.size === 0;
      if (!idle) draining = false;
      ipc.send?.({ type: 'update.drained', idle });
    } catch {
      draining = false;
      ipc.send?.({ type: 'update.drained', idle: false });
    } finally { checking = false; }
  };
  ipc.on('message', handler);
  app.addHook('onClose', async () => { ipc.off('message', handler); });
}
