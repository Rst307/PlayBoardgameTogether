import { loadConfig } from './config.js'; import { createDatabase } from './db/index.js'; import { createRegistry } from './registry/index.js'; import { createApp } from './app.js';
import { installUpdateDrain } from './update-drain.js';
const config = loadConfig(); const registry = createRegistry(config.NODE_ENV === 'development'); const db = createDatabase(config.DATABASE_URL); const app = await createApp({ config, db, registry });
installUpdateDrain(app, db);
try {
  await app.listen({ host: config.API_HOST, port: config.API_PORT });
  process.send?.('update.ready');
} catch (error) {
  app.log.error({ errorType: error instanceof Error ? error.name : 'unknown' }, 'API startup failed');
  await app.close();
  process.exitCode = 1;
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, async () => { await app.close(); process.exit(0); });
// Parent IPC allows graceful shutdown on Windows as well as Linux.
process.on('message', message => {
  if (message === 'update.stop') void app.close().then(() => process.exit(0));
});
