import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { z } from "zod";
import {
  assetContractSchema,
  canonicalAssetJson,
  packManifestSchema,
  parseAssetJson,
  type PackManifest,
} from "@boardgame/game-sdk/assets";
import {
  assetFileSchema,
  assetVersionInfoSchema,
} from "@boardgame/protocol/assets";
import type { Database } from "../db/index.js";
import type { GameRegistry } from "../registry/index.js";
import { AppError } from "../errors.js";
import { type AssetStorage, mediaHash } from "./storage.js";
import { validateMedia } from "./media.js";

const commandSchema = z
  .object({ requestId: z.string().min(1).max(128) })
  .strict();
const revisionSchema = commandSchema.extend({
  expectedDraftRevision: z.number().int().nonnegative(),
});
type DraftRow = {
  id: string;
  manifest: PackManifest;
  revision: number;
  status: string;
  content_hash: string | null;
  report: { errors: string[]; warnings: string[] };
};
type FileRow = {
  id: string;
  draft_id: string | null;
  original_name: string;
  kind: "image" | "audio";
  status: string;
  storage_key: string | null;
  media_type: string;
  hash: string | null;
  bytes: number;
  metadata: Record<string, number>;
  error: string | null;
};
export const assetFingerprint = (value: unknown) =>
  mediaHash(canonicalAssetJson(value));
export const assetLock = (client: PoolClient) =>
  client.query(
    "SELECT pg_advisory_xact_lock(hashtextextended('assets:catalog',0))",
  );
const conflict = (message: string) =>
  new AppError("STATE_CONFLICT", message, 409);
const missing = () =>
  new AppError("GAME_VERSION_UNAVAILABLE", "资源不存在或不可访问", 404);
const fileDto = (row: FileRow) =>
  assetFileSchema.parse({
    id: row.id,
    originalName: row.original_name,
    kind: row.kind,
    status: row.status,
    mediaType: row.media_type,
    bytes: row.bytes,
    hash: row.hash,
    metadata: row.metadata,
    error: row.error,
  });

export class AssetService {
  constructor(
    readonly db: Database,
    readonly registry: GameRegistry,
    readonly storage: AssetStorage,
  ) {}
  async transaction<T>(action: (client: PoolClient) => Promise<T>) {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      await assetLock(client);
      const value = await action(client);
      await client.query("COMMIT");
      return value;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
  private async receipt(
    client: PoolClient,
    actor: string,
    operation: string,
    requestId: string,
    body: unknown,
  ) {
    const row = (
      await client.query<{ request_hash: string; result: unknown }>(
        "SELECT request_hash,result FROM asset_receipts WHERE actor_id=$1 AND operation=$2 AND request_id=$3",
        [actor, operation, requestId],
      )
    ).rows[0];
    if (row && row.request_hash !== assetFingerprint(body))
      throw new AppError(
        "REQUEST_ID_CONFLICT",
        "requestId 已用于不同内容",
        409,
      );
    return row;
  }
  private saveReceipt(
    client: PoolClient,
    actor: string,
    operation: string,
    requestId: string,
    body: unknown,
    result: unknown,
  ) {
    return client.query(
      "INSERT INTO asset_receipts(actor_id,operation,request_id,request_hash,result) VALUES($1,$2,$3,$4,$5)",
      [actor, operation, requestId, assetFingerprint(body), result],
    );
  }
  contracts() {
    return [...this.registry.assetContracts.values()].map((contract) => ({
      contract,
      hash: assetFingerprint(contract),
    }));
  }
  contract(manifest: PackManifest) {
    const contract = this.registry.assetContracts.get(manifest.gameId);
    if (
      !contract ||
      contract.id !== manifest.assetContract.id ||
      contract.version !== manifest.assetContract.version ||
      assetFingerprint(contract) !== manifest.assetContract.hash
    )
      throw conflict("资源契约不兼容");
    return assetContractSchema.parse(contract);
  }
  async draft(id: string, client: Database | PoolClient = this.db) {
    const row = (
      await client.query<DraftRow>(
        "SELECT id,manifest,revision,status,content_hash,report FROM asset_drafts WHERE id=$1",
        [id],
      )
    ).rows[0];
    if (!row) throw missing();
    return row;
  }
  async listDrafts() {
    return (
      await this.db.query<DraftRow>(
        "SELECT id,manifest,revision,status,content_hash,report FROM asset_drafts ORDER BY created_at DESC LIMIT 100",
      )
    ).rows;
  }
  async files(id: string) {
    await this.draft(id);
    return (
      await this.db.query<FileRow>(
        `SELECT DISTINCT f.* FROM asset_files f LEFT JOIN asset_draft_files r ON r.file_id=f.id
      WHERE f.draft_id=$1 OR r.draft_id=$1 ORDER BY f.id`,
        [id],
      )
    ).rows.map(fileDto);
  }
  async create(actor: string, raw: unknown) {
    const body = commandSchema
      .extend({
        manifest: packManifestSchema,
        copyVersionId: z.string().uuid().optional(),
      })
      .parse(raw);
    this.contract(body.manifest);
    return this.transaction(async (client) => {
      const old = await this.receipt(
        client,
        actor,
        "create",
        body.requestId,
        body,
      );
      if (old) return z.object({ id: z.string().uuid() }).parse(old.result);
      let manifest = body.manifest;
      if (body.copyVersionId) {
        const version = await this.version(body.copyVersionId, true, client);
        if (
          version.manifest.gameId !== manifest.gameId ||
          canonicalAssetJson(version.manifest.assetContract) !==
            canonicalAssetJson(manifest.assetContract)
        )
          throw conflict("复制来源契约不兼容");
        manifest = {
          ...manifest,
          assets: version.manifest.assets,
          sounds: version.manifest.sounds,
        };
      }
      await this.checkFileRefs(client, manifest);
      const id = randomUUID();
      await client.query(
        "INSERT INTO asset_drafts(id,manifest) VALUES($1,$2)",
        [id, manifest],
      );
      await this.replaceDraftRefs(client, id, manifest);
      await this.saveReceipt(client, actor, "create", body.requestId, body, {
        id,
      });
      return { id };
    });
  }
  private async checkFileRefs(client: PoolClient, manifest: PackManifest) {
    const ids = [
      ...new Set(Object.values(manifest.assets).map((asset) => asset.fileId)),
    ];
    if (!ids.length) return;
    const valid = await client.query(
      "SELECT id FROM asset_files WHERE id=ANY($1::uuid[]) AND status='validated'",
      [ids],
    );
    if (valid.rowCount !== ids.length)
      throw conflict("文件未通过校验或已待删除");
  }
  private async replaceDraftRefs(
    client: PoolClient,
    id: string,
    manifest: PackManifest,
  ) {
    await client.query("DELETE FROM asset_draft_files WHERE draft_id=$1", [id]);
    for (const fileId of new Set(
      Object.values(manifest.assets).map((asset) => asset.fileId),
    ))
      await client.query(
        "INSERT INTO asset_draft_files(draft_id,file_id) VALUES($1,$2)",
        [id, fileId],
      );
  }
  async edit(actor: string, id: string, raw: unknown) {
    const body = revisionSchema
      .extend({ manifestText: z.string().max(256 * 1024) })
      .parse(raw);
    let manifest: PackManifest;
    try {
      manifest = packManifestSchema.parse(parseAssetJson(body.manifestText));
    } catch {
      throw new AppError(
        "VALIDATION_ERROR",
        "映射 JSON 含无效、重复、危险或未知字段",
        400,
      );
    }
    this.contract(manifest);
    return this.transaction(async (client) => {
      const old = await this.receipt(
        client,
        actor,
        `edit:${id}`,
        body.requestId,
        body,
      );
      if (old) return this.draft(id, client);
      const draft = await this.draft(id, client);
      this.assertEditable(draft, body.expectedDraftRevision);
      await this.checkFileRefs(client, manifest);
      await client.query(
        "UPDATE asset_drafts SET manifest=$2,revision=revision+1,status='draft',content_hash=NULL,report=$3,updated_at=now() WHERE id=$1",
        [id, manifest, { errors: [], warnings: [] }],
      );
      await this.replaceDraftRefs(client, id, manifest);
      await this.saveReceipt(
        client,
        actor,
        `edit:${id}`,
        body.requestId,
        body,
        { id },
      );
      return this.draft(id, client);
    });
  }
  private assertEditable(draft: DraftRow, revision: number) {
    if (draft.status === "published")
      throw conflict("已发布草稿不可修改，请复制新版本");
    if (draft.revision !== revision) throw conflict("草稿已变化，请刷新");
  }
  async reserveUpload(
    actor: string,
    id: string,
    requestId: string,
    name: string,
    mime: string,
    hash: string,
    byteCount: number,
  ) {
    commandSchema.parse({ requestId });
    z.string().min(1).max(180).parse(name);
    z.string()
      .regex(/^[a-f0-9]{64}$/)
      .parse(hash);
    if (
      ![
        "image/png",
        "image/jpeg",
        "image/webp",
        "audio/mpeg",
        "audio/wav",
      ].includes(mime) ||
      !Number.isInteger(byteCount) ||
      byteCount < 16 ||
      byteCount > (mime.startsWith("image/") ? 8 : 5) * 1024 * 1024
    )
      throw new AppError("VALIDATION_ERROR", "文件类型或大小不允许", 400);
    const body = { name, mime, hash, bytes: byteCount };
    return this.transaction(async (client) => {
      const old = await this.receipt(
        client,
        actor,
        `upload:${id}`,
        requestId,
        body,
      );
      if (old)
        return {
          ...z.object({ fileId: z.string().uuid() }).parse(old.result),
          repeated: true,
        };
      const draft = await this.draft(id, client);
      if (draft.status === "published") throw conflict("已发布草稿不可上传");
      const usage = (
        await client.query<{ count: string; bytes: string }>(
          `SELECT count(*),coalesce(sum(reserved_bytes),0) AS bytes FROM asset_files
        WHERE draft_id=$1 AND status NOT IN ('failed','deleted','tombstone')`,
          [id],
        )
      ).rows[0]!;
      if (
        Number(usage.count) >= 200 ||
        Number(usage.bytes) + byteCount > 100 * 1024 * 1024
      )
        throw conflict("资源包文件数或 100 MiB 配额不足");
      const fileId = randomUUID();
      await client.query(
        "INSERT INTO asset_files(id,draft_id,original_name,kind,status,media_type,source_hash,bytes,reserved_bytes) VALUES($1,$2,$3,$4,'staged',$5,$6,0,$7)",
        [
          fileId,
          id,
          name,
          mime.startsWith("image/") ? "image" : "audio",
          mime,
          body.hash,
          byteCount,
        ],
      );
      await this.saveReceipt(client, actor, `upload:${id}`, requestId, body, {
        fileId,
      });
      return { fileId, repeated: false };
    });
  }
  async upload(
    actor: string,
    id: string,
    requestId: string,
    name: string,
    mime: string,
    bytes: Buffer,
  ) {
    const reserved = await this.reserveUpload(
      actor,
      id,
      requestId,
      name,
      mime,
      mediaHash(bytes),
      bytes.length,
    );
    const claimed = await this.db.query(
      "UPDATE asset_files SET status='processing',updated_at=now() WHERE id=$1 AND status='staged' RETURNING id",
      [reserved.fileId],
    );
    if (claimed.rowCount) {
      try {
        const media = await validateMedia(bytes, mime);
        const key = `${media.hash}.${media.kind === "image" ? "png" : "wav"}`;
        await this.storage.put(key, media.bytes);
        await this.transaction(async (client) => {
          await client.query(
            "UPDATE asset_files SET status='validated',storage_key=$2,media_type=$3,hash=$4,bytes=$5,metadata=$6,updated_at=now() WHERE id=$1 AND status='processing'",
            [
              reserved.fileId,
              key,
              media.mediaType,
              media.hash,
              media.bytes.length,
              media.metadata,
            ],
          );
        });
      } catch (error) {
        await this.db.query(
          "UPDATE asset_files SET status='failed',error=$2,updated_at=now() WHERE id=$1 AND status='processing'",
          [
            reserved.fileId,
            error instanceof AppError
              ? error.message
              : "媒体处理未完成，请重新上传",
          ],
        );
      }
    }
    return fileDto(
      (
        await this.db.query<FileRow>("SELECT * FROM asset_files WHERE id=$1", [
          reserved.fileId,
        ])
      ).rows[0]!,
    );
  }
  private async report(
    client: Database | PoolClient,
    draft: DraftRow,
    inspectBytes = true,
  ) {
    const manifest = packManifestSchema.parse(draft.manifest),
      contract = this.contract(manifest);
    const errors: string[] = [],
      warnings: string[] = [];
    const files = (
      await client.query<FileRow>(
        "SELECT * FROM asset_files WHERE id=ANY($1::uuid[])",
        [Object.values(manifest.assets).map((a) => a.fileId)],
      )
    ).rows;
    let total = 0;
    for (const slot of contract.slots) {
      const entry = manifest.assets[slot.key];
      if (!entry) {
        if (slot.required) errors.push(`${slot.key}: 缺少必需映射`);
        continue;
      }
      const file = files.find((file) => file.id === entry.fileId);
      if (
        !file ||
        file.status !== "validated" ||
        file.kind !== slot.kind ||
        entry.kind !== slot.kind
      ) {
        errors.push(`${slot.key}: 文件状态或类型不符`);
        continue;
      }
      total += file.bytes;
      if (inspectBytes)
        try {
          const bytes = await this.storage.get(file.storage_key!);
          if (mediaHash(bytes) !== file.hash)
            errors.push(`${slot.key}: 文件摘要错误`);
        } catch {
          errors.push(`${slot.key}: 文件不可读`);
        }
      if (
        slot.aspectRatio &&
        file.metadata.width &&
        file.metadata.height &&
        Math.abs(
          file.metadata.width / file.metadata.height - slot.aspectRatio,
        ) > 0.1
      )
        warnings.push(`${slot.key}: 比例与建议值不同`);
      if ((file.metadata.peak ?? 0) > 0.9)
        warnings.push(`${slot.key}: 音频峰值较高，建议降低增益`);
    }
    if (total > 100 * 1024 * 1024) errors.push("映射总字节超过 100 MiB");
    for (const key of Object.keys(manifest.assets))
      if (!contract.slots.some((slot) => slot.key === key))
        errors.push(`${key}: 未声明槽位`);
    for (const [cue, sound] of Object.entries(manifest.sounds)) {
      if (
        !contract.cues.some((item) => item.id === cue) ||
        manifest.assets[sound.assetKey]?.kind !== "audio"
      )
        errors.push(`${cue}: 未授权 cue 或无效声音映射`);
    }
    if (
      (
        await client.query(
          "SELECT 1 FROM asset_versions WHERE pack_id=$1 AND version=$2",
          [manifest.packId, manifest.version],
        )
      ).rowCount
    )
      errors.push("包版本已使用，不可覆盖");
    return { errors, warnings };
  }
  async validate(id: string, raw: unknown) {
    const body = revisionSchema.parse(raw);
    const candidate = await this.transaction(async (client) => {
      const draft = await this.draft(id, client);
      this.assertEditable(draft, body.expectedDraftRevision);
      await client.query(
        "UPDATE asset_drafts SET status='validating',updated_at=now() WHERE id=$1",
        [id],
      );
      return draft;
    });
    // Disk verification runs outside the catalog transaction. Draft refs protect these files.
    const report = await this.report(this.db, candidate);
    return this.transaction(async (client) => {
      const draft = await this.draft(id, client);
      this.assertEditable(draft, body.expectedDraftRevision);
      if (
        assetFingerprint(draft.manifest) !==
        assetFingerprint(candidate.manifest)
      )
        throw conflict("草稿已变化");
      const hash = report.errors.length
        ? null
        : assetFingerprint(draft.manifest);
      await client.query(
        "UPDATE asset_drafts SET status=$2,report=$3,content_hash=$4 WHERE id=$1",
        [id, hash ? "ready" : "draft", report, hash],
      );
      return this.draft(id, client);
    });
  }
  async publish(actor: string, id: string, raw: unknown) {
    const body = revisionSchema
      .extend({ contentHash: z.string().regex(/^[a-f0-9]{64}$/) })
      .parse(raw);
    return this.transaction(async (client) => {
      const old = await this.receipt(
        client,
        actor,
        `publish:${id}`,
        body.requestId,
        body,
      );
      if (old)
        return z.object({ versionId: z.string().uuid() }).parse(old.result);
      const draft = await this.draft(id, client);
      this.assertEditable(draft, body.expectedDraftRevision);
      if (
        draft.status !== "ready" ||
        draft.content_hash !== body.contentHash ||
        assetFingerprint(draft.manifest) !== body.contentHash
      )
        throw conflict("必须发布精确已校验的草稿版本");
      const report = await this.report(client, draft, false);
      if (report.errors.length)
        throw conflict(report.errors.join("；").slice(0, 600));
      await this.checkFileRefs(client, draft.manifest);
      const versionId = randomUUID(),
        m = draft.manifest;
      await client.query(
        "INSERT INTO asset_versions(id,pack_id,version,game_id,manifest,manifest_hash,contract_hash,status) VALUES($1,$2,$3,$4,$5,$6,$7,'published')",
        [
          versionId,
          m.packId,
          m.version,
          m.gameId,
          m,
          body.contentHash,
          m.assetContract.hash,
        ],
      );
      for (const fileId of new Set(
        Object.values(m.assets).map((a) => a.fileId),
      ))
        await client.query(
          "INSERT INTO asset_version_files(version_id,file_id) VALUES($1,$2)",
          [versionId, fileId],
        );
      await client.query(
        "UPDATE asset_drafts SET status='published' WHERE id=$1",
        [id],
      );
      await this.saveReceipt(
        client,
        actor,
        `publish:${id}`,
        body.requestId,
        body,
        { versionId },
      );
      return { versionId };
    });
  }
  async version(
    id: string,
    admin = false,
    client: Database | PoolClient = this.db,
  ) {
    const row = (
      await client.query<{
        id: string;
        manifest: PackManifest;
        manifest_hash: string;
        status: string;
        builtin: boolean;
      }>(
        "SELECT id,manifest,manifest_hash,status,builtin FROM asset_versions WHERE id=$1 AND status<>'deleted'",
        [id],
      )
    ).rows[0];
    if (!row || (!admin && !["published", "archived"].includes(row.status)))
      throw missing();
    return {
      versionId: row.id,
      manifest: packManifestSchema.parse(row.manifest),
      manifestHash: row.manifest_hash,
      status: row.status,
      builtin: row.builtin,
    };
  }
  async versions(gameId?: string, admin = false) {
    const rows = await this.db.query<{
      id: string;
      pack_id: string;
      version: string;
      game_id: string;
      manifest: PackManifest;
      status: string;
      manifest_hash: string;
      builtin: boolean;
      refs: string;
    }>(
      `SELECT v.*,
      ((SELECT count(*) FROM rooms WHERE asset_version_id=v.id AND status<>'closed')+(SELECT count(*) FROM matches WHERE asset_version_id=v.id)) AS refs
      FROM asset_versions v WHERE ($1::text IS NULL OR game_id=$1) AND (status='published' OR $2 AND status='archived') ORDER BY published_at,pack_id`,
      [gameId ?? null, admin],
    );
    return rows.rows
      .filter(
        (row) =>
          admin ||
          (this.registry.assetContracts.get(row.game_id) &&
            assetFingerprint(this.registry.assetContracts.get(row.game_id)) ===
              row.manifest.assetContract.hash),
      )
      .map((row) =>
        assetVersionInfoSchema.parse({
          id: row.id,
          packId: row.pack_id,
          version: row.version,
          gameId: row.game_id,
          name: row.manifest.name,
          status: row.status,
          manifestHash: row.manifest_hash,
          builtin: row.builtin,
          ...(admin ? { references: Number(row.refs) } : {}),
        }),
      );
  }
  async archive(actor: string, id: string, raw: unknown) {
    const body = commandSchema.parse(raw);
    return this.transaction(async (client) => {
      const old = await this.receipt(
        client,
        actor,
        `archive:${id}`,
        body.requestId,
        body,
      );
      if (old) return { archived: true };
      const version = await this.version(id, true, client);
      if (version.builtin) throw conflict("内置默认包不可归档");
      await client.query(
        "UPDATE asset_versions SET status='archived' WHERE id=$1",
        [id],
      );
      await this.saveReceipt(
        client,
        actor,
        `archive:${id}`,
        body.requestId,
        body,
        { archived: true },
      );
      return { archived: true };
    });
  }
  async remove(actor: string, id: string, raw: unknown) {
    const body = commandSchema.parse(raw);
    return this.transaction(async (client) => {
      const old = await this.receipt(
        client,
        actor,
        `delete:${id}`,
        body.requestId,
        body,
      );
      if (old) return { deleted: true };
      const version = await this.version(id, true, client);
      if (version.builtin) throw conflict("内置包不可删除");
      const refs = await client.query(
        "SELECT 1 FROM rooms WHERE asset_version_id=$1 AND status<>'closed' UNION ALL SELECT 1 FROM matches WHERE asset_version_id=$1 LIMIT 1",
        [id],
      );
      if (refs.rowCount) throw conflict("版本被房间或保留对局引用，只能归档");
      await client.query(
        "UPDATE asset_versions SET status='deleted' WHERE id=$1",
        [id],
      );
      await client.query(
        "DELETE FROM asset_version_files WHERE version_id=$1",
        [id],
      );
      await this.saveReceipt(
        client,
        actor,
        `delete:${id}`,
        body.requestId,
        body,
        { deleted: true },
      );
      return { deleted: true };
    });
  }
  async removeDraft(actor: string, id: string, raw: unknown) {
    const body = revisionSchema.parse(raw);
    return this.transaction(async (client) => {
      const old = await this.receipt(
        client,
        actor,
        `delete-draft:${id}`,
        body.requestId,
        body,
      );
      if (old) return { deleted: true };
      const draft = await this.draft(id, client);
      if (draft.revision !== body.expectedDraftRevision)
        throw conflict("草稿已变化");
      if (
        (
          await client.query(
            "SELECT 1 FROM asset_files WHERE draft_id=$1 AND status IN ('staged','processing')",
            [id],
          )
        ).rowCount
      )
        throw conflict("文件仍在处理");
      await client.query("DELETE FROM asset_drafts WHERE id=$1", [id]);
      await this.saveReceipt(
        client,
        actor,
        `delete-draft:${id}`,
        body.requestId,
        body,
        { deleted: true },
      );
      return { deleted: true };
    });
  }
  async readFile(id: string, admin: boolean) {
    const row = (
      await this.db.query<FileRow>(
        `SELECT f.* FROM asset_files f WHERE f.id=$1 AND f.status='validated' AND ($2 OR EXISTS(
      SELECT 1 FROM asset_version_files r JOIN asset_versions v ON v.id=r.version_id WHERE r.file_id=f.id AND v.status IN ('published','archived')))`,
        [id, admin],
      )
    ).rows[0];
    if (!row) throw missing();
    const bytes = await this.storage.get(row.storage_key!).catch(() => {
      throw new AppError("SERVICE_UNAVAILABLE", "资源文件暂不可用", 503);
    });
    if (mediaHash(bytes) !== row.hash)
      throw new AppError("SERVICE_UNAVAILABLE", "资源文件完整性错误", 503);
    return { bytes, hash: row.hash!, mediaType: row.media_type };
  }
  async recover() {
    await this.db.query(
      "UPDATE asset_drafts SET status='draft',content_hash=NULL,report='{\"errors\":[\"校验中断，请重新校验\"],\"warnings\":[]}'::jsonb WHERE status='validating' AND updated_at<now()-interval '2 minutes'",
    );
    // A processing job older than its bounded execution time is never promoted to validated.
    await this.db.query(
      "UPDATE asset_files SET status='failed',error='处理已中断，请重新上传',updated_at=now() WHERE status IN ('processing','staged') AND updated_at<now()-interval '2 minutes'",
    );
  }
  async integrity(gc = false) {
    return this.transaction(async (client) => {
      const files = (await client.query<FileRow>("SELECT * FROM asset_files"))
        .rows;
      const unreadable: string[] = [],
        mismatched: string[] = [],
        orphans: string[] = [],
        deleted: string[] = [];
      for (const file of files.filter((f) => f.status === "validated")) {
        try {
          const bytes = await this.storage.get(file.storage_key!);
          if (mediaHash(bytes) !== file.hash) mismatched.push(file.id);
        } catch {
          unreadable.push(file.id);
        }
      }
      if (gc) {
        await client.query(`UPDATE asset_files f SET status='tombstone',delete_after=now()+interval '24 hours'
          WHERE status IN ('validated','failed') AND draft_id IS NULL AND NOT EXISTS(SELECT 1 FROM asset_version_files WHERE file_id=f.id)
          AND NOT EXISTS(SELECT 1 FROM asset_draft_files WHERE file_id=f.id)`);
        const pending = (
          await client.query<FileRow>(
            "SELECT * FROM asset_files WHERE status='tombstone' AND delete_after<now() FOR UPDATE",
          )
        ).rows;
        for (const file of pending) {
          const refs = await client.query(
            "SELECT 1 FROM asset_version_files WHERE file_id=$1 UNION ALL SELECT 1 FROM asset_draft_files WHERE file_id=$1",
            [file.id],
          );
          if (refs.rowCount) continue;
          const shared = await client.query(
            "SELECT 1 FROM asset_files WHERE storage_key=$1 AND id<>$2 AND status NOT IN ('deleted','tombstone')",
            [file.storage_key, file.id],
          );
          if (file.storage_key && !shared.rowCount)
            await this.storage.delete(file.storage_key);
          await client.query(
            "UPDATE asset_files SET status='deleted',storage_key=NULL WHERE id=$1",
            [file.id],
          );
          deleted.push(file.id);
        }
      }
      const keys = await this.storage.list();
      for (const key of keys)
        if (!files.some((f) => f.storage_key === key)) {
          orphans.push(key);
          if (
            gc &&
            (await this.storage.stat(key)).modified <
              Date.now() - 24 * 60 * 60 * 1000
          ) {
            await this.storage.delete(key);
            deleted.push(key);
          }
        }
      return {
        unreadable,
        mismatched,
        orphans,
        deleted,
        files: files.map((f) => ({ id: f.id, hash: f.hash, status: f.status })),
      };
    });
  }
}
