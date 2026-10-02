import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { PackManifest } from '@boardgame/game-sdk/assets';
import { splendorTtsCards, splendorTtsNobles } from '@boardgame/splendor/assets';
import { tokenColors } from '@boardgame/splendor/shared';
import { AssetService, assetFingerprint } from '../apps/api/src/assets/service.js';
import { validateMedia } from '../apps/api/src/assets/media.js';

const fileSchema = z.record(z.string(), z.object({
  file: z.string().regex(/^[a-z0-9.-]+\.png$/), sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict());
const actor = '00000000-0000-4000-8000-000000000007';

export async function seedSplendorAssets(service: AssetService) {
  const entry = service.contracts().find(item => item.contract.gameId === 'splendor.base');
  if (!entry) return;
  const base: PackManifest = {
    schemaVersion: 1, packId: 'splendor.original', version: '1.0.0', gameId: 'splendor.base',
    name: '原创几何 SVG', author: '桌游平台', source: 'games/splendor 原创 SVG', license: 'CC0-1.0',
    assetContract: { id: entry.contract.id, version: entry.contract.version, hash: entry.hash },
    assets: {}, sounds: {},
  };
  const publish = async (manifest: PackManifest, files: Record<string, Buffer>) => {
    const found = await service.db.query<{ id: string }>(
      'SELECT id FROM asset_versions WHERE pack_id=$1 AND version=$2', [manifest.packId, manifest.version],
    );
    if (found.rows[0]) {
      const version = await service.version(found.rows[0].id);
      if (assetFingerprint(version.manifest.assetContract) !== assetFingerprint(manifest.assetContract))
        throw new Error('Existing Splendor asset contract differs; restore its locked version');
      for (const [key, asset] of Object.entries(version.manifest.assets)) {
        const row = (await service.db.query<{ storage_key: string; hash: string }>(
          'SELECT storage_key,hash FROM asset_files WHERE id=$1', [asset.fileId],
        )).rows[0];
        if (!row) throw new Error('Missing Splendor file metadata');
        try {
          const bytes = await service.storage.get(row.storage_key);
          if (createHash('sha256').update(bytes).digest('hex') !== row.hash)
            throw new Error('Stored image hash differs');
        } catch {
          const source = files[key];
          if (!source) throw new Error(`Restore backup for ${key}`);
          const normalized = await validateMedia(source, 'image/png');
          if (normalized.hash !== row.hash) throw new Error(`Immutable image differs: ${key}; restore backup`);
          await service.storage.put(row.storage_key, normalized.bytes);
        }
      }
      console.log(`unchanged ${manifest.packId}@${manifest.version}`);
      return;
    }
    const inputHash = assetFingerprint(Object.fromEntries(Object.entries(files).map(([key, bytes]) =>
      [key, createHash('sha256').update(bytes).digest('hex')])));
    const draft = await service.create(actor, { requestId: `seed:${manifest.packId}:${inputHash}`, manifest });
    for (const [key, bytes] of Object.entries(files)) {
      const hash = createHash('sha256').update(bytes).digest('hex');
      const previous = (await service.db.query<{ id: string; status: string }>(
        'SELECT id,status FROM asset_files WHERE draft_id=$1 AND original_name=$2 AND source_hash=$3',
        [draft.id, `${key}.png`, hash],
      )).rows;
      let fileId = previous.find(file => file.status === 'validated')?.id;
      let attempt = previous.filter(file => file.status === 'failed').length;
      for (let retry = 0; !fileId && retry < 3; retry++, attempt++) {
        const file = await service.upload(actor, draft.id, `seed:${key}:${hash}:attempt:${attempt}`, `${key}.png`, 'image/png', bytes);
        if (file.status === 'validated') fileId = file.id;
        else if (retry === 2) throw new Error(`Splendor media failed: ${key}: ${file.error}`);
      }
      if (!fileId) throw new Error(`Splendor image unavailable: ${key}`);
      manifest.assets[key] = { kind: 'image', fileId };
    }
    const current = await service.draft(draft.id);
    const edited = await service.edit(actor, draft.id, {
      requestId: `seed-map:${current.revision}`, expectedDraftRevision: current.revision, manifestText: JSON.stringify(manifest),
    });
    const checked = await service.validate(draft.id, { requestId: 'seed-check', expectedDraftRevision: edited.revision });
    if (!checked.content_hash) throw new Error(JSON.stringify(checked.report));
    const result = await service.publish(actor, draft.id, {
      requestId: `seed-publish:${edited.revision}`, expectedDraftRevision: edited.revision, contentHash: assetFingerprint(manifest),
    });
    // Original is the default; the user-supplied TTS pack remains a normal selectable version.
    if (manifest.packId === 'splendor.original')
      await service.db.query('UPDATE asset_versions SET builtin=true WHERE id=$1', [result.versionId]);
    console.log(`installed ${manifest.packId}@${manifest.version}`);
  };
  await publish(base, {});
  const root = resolve(process.env.SPLENDOR_TTS_ASSET_DIR ?? '.data/extracted-assets/splendor-tts-platform');
  let text: string;
  try { text = await readFile(resolve(root, 'files.json'), 'utf8'); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || process.env.SPLENDOR_TTS_ASSET_DIR) throw error;
    console.log('TTS local files unavailable; original SVG pack installed');
    return;
  }
  const index = fileSchema.parse(JSON.parse(text) as unknown);
  const mappings = [
    ...splendorTtsCards.map(card => [card.key, `tts-${card.ttsCardId}`] as const),
    ...splendorTtsNobles.map(noble => [noble.key, `noble-${noble.ttsGuid}`] as const),
    ...[1, 2, 3].map(tier => [`card.back.${tier}`, `back-${tier}`] as const),
    ...tokenColors.map(color => [`token.${color}`, `token-${color}`] as const),
  ];
  const files: Record<string, Buffer> = {};
  for (const [key, name] of mappings) {
    const item = index[name];
    if (!item) throw new Error(`Missing TTS slot ${key}`);
    const bytes = await readFile(resolve(root, item.file));
    if (createHash('sha256').update(bytes).digest('hex') !== item.sha256)
      throw new Error(`TTS prepared file hash differs: ${name}`);
    files[key] = bytes;
  }
  await publish({ ...base, packId: 'splendor.tts-classic', name: 'TTS 经典卡面',
    author: '用户提供的 TTS 模组素材', source: 'Workshop 2023213924 · 本地缓存提取；按数值核对卡牌映射',
    license: '来源于用户提供的 TTS 模组；发行商美术权利保留，未附开放许可', assets: {},
  }, files);
}
