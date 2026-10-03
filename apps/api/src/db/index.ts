import pg from 'pg';
import { manifestSchema, type GameManifest } from '@boardgame/game-sdk';
const { Pool } = pg;
export type Database = InstanceType<typeof Pool>;
export function createDatabase(url: string): Database { return new Pool({ connectionString: url, max: 5, connectionTimeoutMillis: 1500, idleTimeoutMillis: 10_000 }); }
function canonical(value: unknown): string { if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`; if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`; return JSON.stringify(value); }
export async function databaseStatus(db: Database, expected: GameManifest[]) {
  try {
    await db.query('SELECT 1');
    const migration = await db.query<{ exists: boolean }>("SELECT to_regclass('public.game_installations') IS NOT NULL AS exists");
    if (!migration.rows[0]?.exists) return { ready: false, reason: 'migrations-required' as const };
    for (const game of expected) { const found = await db.query<{ manifest: unknown }>('SELECT manifest FROM game_installations WHERE game_id=$1 AND game_version=$2', [game.id, game.version]); if (found.rowCount !== 1 || canonical(found.rows[0]?.manifest) !== canonical(game)) return { ready: false, reason: 'games-sync-required' as const }; }
    return { ready: true as const };
  } catch { return { ready: false as const, reason: 'database-unavailable' as const }; }
}
export async function listInstalledGames(db: Database, production: boolean) {
  const result = await db.query<{ manifest: GameManifest }>('SELECT manifest FROM game_installations WHERE enabled=true ORDER BY game_id, game_version');
  return result.rows.map(r => manifestSchema.parse(r.manifest)).filter(m => !(production && m.developmentOnly));
}
