import type { PoolClient } from "pg";
import type { GameRegistry } from "../registry/index.js";
import { AppError } from "../errors.js";
import { assetFingerprint, assetLock } from "./service.js";
import { packManifestSchema } from "@boardgame/game-sdk/assets";

/** Caller already owns room lock. All asset reference mutations use this catalog lock. */
export async function lockAssetBinding(
  client: PoolClient,
  registry: GameRegistry,
  gameId: string,
  id: string,
  existing = false,
) {
  await assetLock(client);
  const row = (
    await client.query<{
      id: string;
      manifest: unknown;
      manifest_hash: string;
      status: string;
    }>(
      "SELECT id,manifest,manifest_hash,status FROM asset_versions WHERE id=$1",
      [id],
    )
  ).rows[0];
  if (
    !row ||
    !(row.status === "published" || (existing && row.status === "archived"))
  )
    throw new AppError("GAME_VERSION_UNAVAILABLE", "资源版本不可选择", 422);
  const manifest = packManifestSchema.parse(row.manifest),
    contract = registry.assetContracts.get(gameId);
  if (
    manifest.gameId !== gameId ||
    !contract ||
    manifest.assetContract.hash !== assetFingerprint(contract) ||
    assetFingerprint(manifest) !== row.manifest_hash
  )
    throw new AppError("GAME_VERSION_UNAVAILABLE", "资源契约或清单不兼容", 422);
  return {
    versionId: row.id,
    manifestHash: row.manifest_hash,
    contractVersion: manifest.assetContract.version,
    packId: manifest.packId,
    version: manifest.version,
  };
}

export async function defaultAssetBinding(
  client: PoolClient,
  registry: GameRegistry,
  gameId: string,
) {
  if (!registry.assetContracts.has(gameId)) return null;
  await assetLock(client);
  const row = (
    await client.query<{ id: string }>(
      "SELECT id FROM asset_versions WHERE game_id=$1 AND builtin=true AND status='published' ORDER BY published_at,id LIMIT 1",
      [gameId],
    )
  ).rows[0];
  if (!row)
    throw new AppError(
      "GAME_VERSION_UNAVAILABLE",
      "请先执行 pnpm assets:seed 安装默认资源",
      422,
    );
  return lockAssetBinding(client, registry, gameId, row.id);
}
