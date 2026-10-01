import { describe, expect, it } from 'vitest';
import { createApp } from '../../apps/api/src/app.js';
import { createRegistry } from '../../apps/api/src/registry/index.js';
import { LabRunner } from '../../apps/api/src/runtime/runner.js';

describe('application shutdown', () => {
  it('releases runner matches and closes the database pool', async () => {
    const registry = createRegistry(true); const runner = new LabRunner(registry);
    runner.create('demo.test-counter', '0.1.0', { targetScore: 3 }, 1);
    let endCalls = 0; const db = { end: async () => { endCalls += 1; }, query: async () => ({ rows: [], rowCount: 0 }) } as any;
    const app = await createApp({ config: { NODE_ENV: 'development', API_HOST: '127.0.0.1', API_PORT: 3001, DATABASE_URL: 'postgresql://x:x@localhost/x', WEB_ORIGIN: 'http://127.0.0.1:5173', ENABLE_DEV_LAB: true, LOG_LEVEL: 'silent' }, db, registry, runner });
    await app.close();
    expect(runner.size).toBe(0); expect(endCalls).toBe(1);
  });
});
