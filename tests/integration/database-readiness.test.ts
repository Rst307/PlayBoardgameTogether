import { describe, expect, it } from 'vitest';
import { databaseStatus } from '../../apps/api/src/db/index.js';
import { createRegistry } from '../../apps/api/src/registry/index.js';

describe('database readiness', () => {
  it('distinguishes unavailable, missing migrations, missing sync, and recovery', async () => {
    let state: 'down' | 'unmigrated' | 'unsynced' | 'ready' = 'down';
    const db = { query: async (sql: string, params?: unknown[]) => {
      if (state === 'down') throw new Error('connection refused');
      if (sql === 'SELECT 1') return { rows: [{ '?column?': 1 }], rowCount: 1 };
      if (sql.includes('to_regclass')) return { rows: [{ exists: state !== 'unmigrated' }], rowCount: 1 };
      if (sql.includes('game_installations')) { const expected=manifests.find(m=>m.id===params?.[0]&&m.version===params?.[1]); return { rows: state === 'ready'&&expected ? [{ manifest: expected }] : [], rowCount: state === 'ready'&&expected ? 1 : 0 }; }
      throw new Error(`unexpected query: ${sql}`);
    } } as any;
    const manifests = createRegistry(true).manifests();
    expect(await databaseStatus(db, manifests)).toEqual({ ready: false, reason: 'database-unavailable' });
    state = 'unmigrated'; expect(await databaseStatus(db, manifests)).toEqual({ ready: false, reason: 'migrations-required' });
    state = 'unsynced'; expect(await databaseStatus(db, manifests)).toEqual({ ready: false, reason: 'games-sync-required' });
    state = 'ready'; expect(await databaseStatus(db, manifests)).toEqual({ ready: true });
  });
});
