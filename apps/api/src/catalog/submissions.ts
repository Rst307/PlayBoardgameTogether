import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import {
  gameSubmissionInputSchema, gameSubmissionReviewSchema, gameSubmissionSchema,
  gameSubmissionPageSchema, type GameSubmissionInput, type GameSubmissionReview,
} from '@boardgame/protocol';
import type { AuthContext } from '../auth.js';
import type { Database } from '../db/index.js';
import { AppError } from '../errors.js';

type SubmissionRow = {
  id: string; input: unknown; status: string; revision: number;
  review_note: string | null; reviewed_by: string | null; review_input: unknown;
  created_at: Date; reviewed_at: Date | null;
};
function dto(row: SubmissionRow) {
  const fields = gameSubmissionInputSchema.parse(row.input);
  return gameSubmissionSchema.parse({
    gameId: fields.gameId, version: fields.version, name: fields.name,
    description: fields.description, repositoryUrl: fields.repositoryUrl,
    id: row.id, status: row.status, revision: row.revision,
    reviewNote: row.review_note, createdAt: row.created_at.toISOString(),
    reviewedAt: row.reviewed_at?.toISOString() ?? null,
  });
}
const sameInput = (stored: unknown, input: GameSubmissionInput) =>
  JSON.stringify(gameSubmissionInputSchema.parse(stored)) === JSON.stringify(input);

export class GameSubmissionService {
  constructor(private readonly db: Database) {}

  private async lockIdentity(client: pg.PoolClient, current: AuthContext, administrator = false) {
    // Account -> session lock order also used by account disable/password reset.
    const account = await client.query<{ role: string }>(
      "SELECT role FROM accounts WHERE id=$1 AND status='active' FOR UPDATE", [current.account.id],
    );
    const session = await client.query(
      `SELECT 1 FROM sessions WHERE id=$1 AND account_id=$2 AND token_hash=$3
       AND revoked_at IS NULL AND expires_at>clock_timestamp() FOR SHARE`,
      [current.sessionId, current.account.id, current.tokenHash],
    );
    if (!account.rowCount || !session.rowCount) throw new AppError('UNAUTHENTICATED', '会话已失效', 401);
    if (administrator && account.rows[0]?.role !== 'administrator') {
      throw new AppError('FORBIDDEN', '需要管理员权限', 403);
    }
  }

  async submit(current: AuthContext, input: GameSubmissionInput) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      // A dedicated transaction lock makes global/per-account limits durable across API instances.
      await client.query('SELECT pg_advisory_xact_lock(73418, 1)');
      await this.lockIdentity(client, current);
      const previous = await client.query<SubmissionRow>(
        'SELECT * FROM game_submissions WHERE account_id=$1 AND request_id=$2',
        [current.account.id, input.requestId],
      );
      if (previous.rows[0]) {
        if (!sameInput(previous.rows[0].input, input)) {
          throw new AppError('REQUEST_ID_CONFLICT', '同一请求 ID 不能用于不同申请', 409);
        }
        const result = dto(previous.rows[0]);
        await client.query('COMMIT');
        return result;
      }
      const counts = await client.query<{ total: number; owned: number; pending: number; recent: number }>(`
        SELECT count(*)::int AS total,
          count(*) FILTER (WHERE account_id=$1)::int AS owned,
          count(*) FILTER (WHERE account_id=$1 AND status='pending')::int AS pending,
          count(*) FILTER (WHERE account_id=$1 AND created_at>clock_timestamp()-interval '24 hours')::int AS recent
        FROM game_submissions`, [current.account.id]);
      const count = counts.rows[0]!;
      if (count.total >= 10000 || count.owned >= 100 || count.pending >= 3 || count.recent >= 5) {
        throw new AppError('RATE_LIMITED', '申请配额已满，请等待审核或联系维护者', 429, true);
      }
      const inserted = await client.query<SubmissionRow>(
        'INSERT INTO game_submissions(id,account_id,request_id,input) VALUES($1,$2,$3,$4) RETURNING *',
        [randomUUID(), current.account.id, input.requestId, JSON.stringify(input)],
      );
      const result = dto(inserted.rows[0]!);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  async get(accountId: string, id: string, administrator = false) {
    const result = await this.db.query<SubmissionRow>(
      'SELECT * FROM game_submissions WHERE id=$1 AND ($3 OR account_id=$2)', [id, accountId, administrator],
    );
    if (!result.rows[0]) throw new AppError('GAME_NOT_FOUND', '申请不存在或不可访问', 404);
    return dto(result.rows[0]);
  }

  async list(accountId: string, before?: string, administrator = false) {
    // Cursor lookup and page use one statement/snapshot and the same ownership filter.
    const result = await this.db.query<SubmissionRow>(`
      SELECT * FROM game_submissions
      WHERE ($2 OR account_id=$1) AND ($3::uuid IS NULL OR (created_at,id) < (
        SELECT created_at,id FROM game_submissions WHERE id=$3 AND ($2 OR account_id=$1)
      )) ORDER BY created_at DESC,id DESC LIMIT 21`, [accountId, administrator, before ?? null]);
    return gameSubmissionPageSchema.parse({
      items: result.rows.slice(0, 20).map(dto),
      nextCursor: result.rows.length > 20 ? result.rows[19]!.id : null,
    });
  }

  async review(current: AuthContext, id: string, input: GameSubmissionReview) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      await this.lockIdentity(client, current, true);
      const result = await client.query<SubmissionRow>('SELECT * FROM game_submissions WHERE id=$1 FOR UPDATE', [id]);
      const row = result.rows[0];
      if (!row) throw new AppError('GAME_NOT_FOUND', '申请不存在或不可访问', 404);
      if (row.review_input) {
        const previous = gameSubmissionReviewSchema.parse(row.review_input);
        if (row.reviewed_by === current.account.id && previous.requestId === input.requestId) {
          if (JSON.stringify(previous) !== JSON.stringify(input)) {
            throw new AppError('REQUEST_ID_CONFLICT', '同一请求 ID 不能用于不同审核', 409);
          }
          const saved = dto(row);
          await client.query('COMMIT');
          return saved;
        }
      }
      if (row.status !== 'pending' || row.revision !== input.expectedRevision) {
        throw new AppError('STATE_CONFLICT', '申请已被审核，请重新读取', 409);
      }
      const updated = await client.query<SubmissionRow>(`
        UPDATE game_submissions SET status=$2,revision=revision+1,review_note=$3,
          reviewed_by=$4,review_input=$5,reviewed_at=now() WHERE id=$1 RETURNING *`,
      [id, input.status, input.reviewNote, current.account.id, JSON.stringify(input)]);
      const saved = dto(updated.rows[0]!);
      await client.query('COMMIT');
      return saved;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
}
