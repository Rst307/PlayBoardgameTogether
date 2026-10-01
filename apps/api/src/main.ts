import { loadConfig } from './config.js'; import { createDatabase } from './db/index.js'; import { createRegistry } from './registry/index.js'; import { createApp } from './app.js';
const config = loadConfig(); const registry = createRegistry(config.NODE_ENV === 'development'); const db = createDatabase(config.DATABASE_URL); const app = await createApp({ config, db, registry });
try { await app.listen({ host: config.API_HOST, port: config.API_PORT }); } catch (error) { app.log.error({ errorType: error instanceof Error ? error.name : 'unknown' }, 'API startup failed'); process.exitCode = 1; }
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, async () => { await app.close(); process.exit(0); });
