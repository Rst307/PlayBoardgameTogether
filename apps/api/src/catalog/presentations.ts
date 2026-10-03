import { gamePresentationSchema, type GamePresentationInput } from '@boardgame/protocol';
import type { Database } from '../db/index.js';
import { AppError } from '../errors.js';

export class GamePresentationService {
  constructor(private readonly db: Database) {}

  async list(production: boolean) {
    const result = await this.db.query(`
      SELECT g.game_id AS "gameId", g.game_version AS version,
             coalesce(p.revision, 0) AS revision,
             coalesce(p.icon_url, CASE WHEN gp.presentation ? 'icon' THEN '/api/v1/game-packages/' || g.game_id || '/versions/' || g.game_version || '/art/icon.png' END) AS "iconUrl",
             coalesce(p.cover_url, CASE WHEN gp.presentation ? 'cover' THEN '/api/v1/game-packages/' || g.game_id || '/versions/' || g.game_version || '/art/cover.png' END) AS "coverUrl",
             coalesce(p.background_url, CASE WHEN gp.presentation ? 'background' THEN '/api/v1/game-packages/' || g.game_id || '/versions/' || g.game_version || '/art/background.png' END) AS "backgroundUrl"
      FROM game_installations g LEFT JOIN game_presentations p
        ON p.game_id = g.game_id AND p.game_version = g.game_version
      LEFT JOIN game_packages gp ON gp.game_id = g.game_id AND gp.game_version = g.game_version
      WHERE g.enabled AND (NOT $1 OR NOT (g.manifest->>'developmentOnly')::boolean)
      ORDER BY g.game_id, g.game_version`, [production]);
    return gamePresentationSchema.array().parse(result.rows);
  }

  async save(accountId: string, gameId: string, version: string, input: GamePresentationInput) {
    const connection = await this.db.connect();
    try {
      await connection.query('BEGIN');
      // Lock the installed version to serialize first saves as well as updates.
      const game = await connection.query(
        'SELECT 1 FROM game_installations WHERE game_id=$1 AND game_version=$2 AND enabled FOR UPDATE',
        [gameId, version],
      );
      if (!game.rowCount) throw new AppError('GAME_NOT_FOUND', '游戏版本未启用', 404);
      const previous = await connection.query<{ revision: number }>(
        'SELECT revision FROM game_presentations WHERE game_id=$1 AND game_version=$2', [gameId, version],
      );
      if ((previous.rows[0]?.revision ?? 0) !== input.expectedRevision) {
        throw new AppError('STATE_CONFLICT', '展示配置已被修改，请重新加载后再保存。', 409);
      }
      const result = await connection.query(`
        INSERT INTO game_presentations (game_id, game_version, icon_url, cover_url, background_url, revision, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (game_id, game_version) DO UPDATE SET
          icon_url=excluded.icon_url, cover_url=excluded.cover_url, background_url=excluded.background_url,
          revision=excluded.revision, updated_by=excluded.updated_by, updated_at=now()
        RETURNING game_id AS "gameId", game_version AS version, revision,
          icon_url AS "iconUrl", cover_url AS "coverUrl", background_url AS "backgroundUrl"`,
      [gameId, version, input.iconUrl, input.coverUrl, input.backgroundUrl, input.expectedRevision + 1, accountId]);
      const saved = gamePresentationSchema.parse(result.rows[0]);
      await connection.query('COMMIT');
      return saved;
    } catch (cause) {
      await connection.query('ROLLBACK');
      throw cause;
    } finally { connection.release(); }
  }
}
