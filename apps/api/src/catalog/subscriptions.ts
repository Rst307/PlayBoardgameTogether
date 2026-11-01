import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import {
  gameSubscriptionSchema,
  type GameSubscriptionInput,
  type GameSubscriptionItem,
} from '@boardgame/protocol';
import type { Database } from '../db/index.js';
import { AppError } from '../errors.js';
import type { GamePackageService } from './package-service.js';
import {
  compareGameVersions,
  GitHubOfficialGameSource,
  type OfficialGameSource,
} from './official-source.js';

type SettingsRow = {
  auto_add: boolean;
  auto_update: boolean;
  revision: number;
  authorized_by: string | null;
  next_check_at: Date | null;
  started_at: Date | null;
  finished_at: Date | null;
  status: string;
  message: string;
  items: unknown;
};
export class GameSubscriptionService {
  private timer?: ReturnType<typeof setInterval>;
  private active: Promise<void> | undefined;
  private readonly stop = new AbortController();
  constructor(
    private readonly db: Database,
    private readonly packages: GamePackageService,
    private readonly source: OfficialGameSource = new GitHubOfficialGameSource(),
  ) {}

  async status(client: Pick<Database, 'query'> = this.db) {
    const { rows } = await client.query<SettingsRow & { running: boolean }>(
      `SELECT s.*, EXISTS(SELECT 1 FROM pg_locks WHERE locktype='advisory'
        AND classid=73418 AND objid=7 AND objsubid=2 AND granted
        AND database=(SELECT oid FROM pg_database WHERE datname=current_database())) AS running
       FROM game_subscription s WHERE singleton=true`,
    );
    const row = rows[0]!;
    return gameSubscriptionSchema.parse({
      source: 'playboard-official',
      autoAdd: row.auto_add,
      autoUpdate: row.auto_update,
      revision: row.revision,
      intervalMinutes: 60,
      status: row.status === 'running' && !row.running ? 'interrupted' : row.status,
      startedAt: row.started_at?.toISOString() ?? null,
      finishedAt: row.finished_at?.toISOString() ?? null,
      nextCheckAt:
        row.auto_add || row.auto_update ? (row.next_check_at?.toISOString() ?? null) : null,
      message: row.message,
      items: row.items,
    });
  }
  // Called only inside the existing administrator command transaction.
  async save(client: pg.PoolClient, accountId: string, input: GameSubscriptionInput) {
    const updated = await client.query(
      `UPDATE game_subscription
      SET auto_add=$1,auto_update=$2,revision=revision+1,authorized_by=$3,
          next_check_at=CASE WHEN $1 OR $2 THEN clock_timestamp() ELSE NULL END
      WHERE singleton=true AND revision=$4 RETURNING revision`,
      [input.autoAdd, input.autoUpdate, accountId, input.expectedRevision],
    );
    if (!updated.rowCount)
      throw new AppError('STATE_CONFLICT', '订阅设置已变化，请刷新后重试', 409);
    return this.status(client);
  }
  async requestCheck(client: pg.PoolClient, expectedRevision: number) {
    const settings = await client.query<SettingsRow>(
      'SELECT * FROM game_subscription WHERE singleton=true FOR UPDATE',
    );
    const row = settings.rows[0]!;
    if (row.revision !== expectedRevision)
      throw new AppError('STATE_CONFLICT', '订阅设置已变化，请刷新后重试', 409);
    if (!row.auto_add && !row.auto_update)
      throw new AppError('STATE_CONFLICT', '请先启用并保存游戏订阅', 409);
    const updated = await client.query(`UPDATE game_subscription
      SET next_check_at=clock_timestamp(),requested_at=clock_timestamp()
      WHERE singleton=true AND (requested_at IS NULL OR requested_at<clock_timestamp()-interval '60 seconds') RETURNING singleton`);
    if (!updated.rowCount) throw new AppError('RATE_LIMITED', '每分钟最多手动同步一次', 429, true);
    return this.status(client);
  }
  start() {
    this.wake();
    this.timer = setInterval(() => this.wake(), 60000);
    this.timer.unref();
  }
  wake() {
    if (this.active || this.stop.signal.aborted) return;
    this.active = this.runDue()
      .catch(() => {
        // No source URLs, response bodies, credentials, or package code in logs.
      })
      .finally(() => {
        this.active = undefined;
      });
  }
  async close() {
    clearInterval(this.timer);
    this.stop.abort();
    await this.active;
  }
  async runDue() {
    const client = await this.db.connect();
    let locked = false;
    let started = false;
    const items: GameSubscriptionItem[] = [];
    const signal = AbortSignal.any([this.stop.signal, AbortSignal.timeout(240000)]);
    try {
      const lock = await client.query<{ locked: boolean }>(
        'SELECT pg_try_advisory_lock(73418,7) AS locked',
      );
      locked = lock.rows[0]!.locked;
      if (!locked) return;
      const claimed = await client.query<SettingsRow>(`UPDATE game_subscription SET
        status='running',started_at=clock_timestamp(),finished_at=NULL,message='',items='[]',
        next_check_at=clock_timestamp()+interval '60 minutes'
        WHERE singleton=true AND (auto_add OR auto_update) AND next_check_at<=clock_timestamp()
        RETURNING *`);
      const settings = claimed.rows[0];
      if (!settings) return;
      started = true;
      const authorized = await client.query(
        "SELECT 1 FROM accounts WHERE id=$1 AND role='administrator' AND status='active'",
        [settings.authorized_by],
      );
      if (!authorized.rowCount)
        throw new AppError('FORBIDDEN', '订阅授权管理员已失效，请重新保存设置', 403);
      const candidates = await this.source.discover(signal);
      for (const candidate of candidates) {
        signal.throwIfAborted();
        const item = { gameId: candidate.gameId, version: candidate.version };
        try {
          const installed = await client.query<{
            game_version: string;
            enabled: boolean;
            online: boolean;
          }>(
            `SELECT i.game_version,i.enabled,p.game_id IS NOT NULL AS online FROM game_installations i
             LEFT JOIN game_packages p USING(game_id,game_version) WHERE i.game_id=$1`,
            [candidate.gameId],
          );
          const versions = installed.rows;
          if (versions.some((row) => !row.online)) {
            items.push({ ...item, outcome: 'skipped', message: '内置游戏随平台更新' });
          } else if (versions.length && !versions.some((row) => row.enabled)) {
            items.push({ ...item, outcome: 'skipped', message: '保留管理员下架状态' });
          } else if (
            versions.some((row) => compareGameVersions(row.game_version, candidate.version) >= 0)
          ) {
            items.push({ ...item, outcome: 'current', message: '已安装相同或更高版本' });
          } else if (versions.length ? !settings.auto_update : !settings.auto_add) {
            items.push({
              ...item,
              outcome: 'skipped',
              message: versions.length ? '未启用自动更新' : '未启用自动添加',
            });
          } else {
            const bytes = await this.source.download(candidate, signal);
            const review = await this.packages.review(bytes);
            if (
              review.gameId !== candidate.gameId ||
              review.version !== candidate.version ||
              review.hash !== candidate.sha256
            ) {
              throw new AppError('VALIDATION_ERROR', '安装包身份或摘要与官方清单不符', 400);
            }
            signal.throwIfAborted();
            await this.packages.installSubscribed(
              settings.revision,
              randomUUID(),
              bytes,
              review.catalogHash,
            );
            items.push({
              ...item,
              outcome: versions.length ? 'updated' : 'added',
              message: versions.length ? '新版已上架，旧对局保留原版本' : '已安装并上架',
            });
          }
        } catch (error) {
          items.push({
            ...item,
            outcome: 'failed',
            message:
              error instanceof AppError
                ? error.message.slice(0, 160)
                : '下载、校验或安装失败，原版本保留',
          });
        }
      }
      const failures = items.filter((item) => item.outcome === 'failed').length;
      await client.query(
        `UPDATE game_subscription SET status=$1,finished_at=clock_timestamp(),message=$2,items=$3 WHERE singleton=true`,
        [
          failures ? 'partial' : 'succeeded',
          candidates.length
            ? failures
              ? '部分游戏同步失败，可查看详情并重试'
              : '官方游戏目录同步完成'
            : '官方目录暂无可安装的正式发布包',
          JSON.stringify(items),
        ],
      );
    } catch (error) {
      if (started)
        await client.query(
          `UPDATE game_subscription SET status='failed',finished_at=clock_timestamp(),message=$1,items=$2 WHERE singleton=true`,
          [
            error instanceof AppError
              ? error.message.slice(0, 160)
              : '无法完成官方目录同步，原有游戏保留，请稍后重试',
            JSON.stringify(items),
          ],
        );
    } finally {
      try {
        if (locked) await client.query('SELECT pg_advisory_unlock(73418,7)');
      } finally {
        client.release();
      }
    }
  }
}
