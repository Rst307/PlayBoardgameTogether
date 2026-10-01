import { createApp } from '../../apps/api/src/app.js';
import { createDatabase } from '../../apps/api/src/db/index.js';
import { createRegistry } from '../../apps/api/src/registry/index.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) throw new Error('TEST_DATABASE_URL is required');
const phase = process.env.MATCH_CRASH_PHASE;
const crash = () => process.exit(86);
const db = createDatabase(databaseUrl);
const app = await createApp({
  config: {
    NODE_ENV: 'test', API_HOST: '127.0.0.1', API_PORT: 3001,
    DATABASE_URL: databaseUrl, WEB_ORIGIN: 'http://127.0.0.1:5173',
    ENABLE_DEV_LAB: false, LOG_LEVEL: 'silent',
  },
  db,
  registry: createRegistry(false),
  testMatchFaults: {
    beforeCommit: phase === 'before' ? crash : undefined,
    afterCommit: phase === 'after' ? crash : undefined,
  },
});
await app.listen({ host: '127.0.0.1', port: 0 });
const address = app.server.address();
if (!address || typeof address === 'string') throw new Error('Server address unavailable');
process.send?.({ port: address.port });
