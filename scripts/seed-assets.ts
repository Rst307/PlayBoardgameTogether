import { deflateSync } from "node:zlib";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { createDatabase } from "../apps/api/src/db/index.js";
import { createRegistry } from "../apps/api/src/registry/index.js";
import {
  AssetService,
  assetFingerprint,
} from "../apps/api/src/assets/service.js";
import { LocalAssetStorage } from "../apps/api/src/assets/storage.js";
import type { PackManifest } from "@boardgame/game-sdk/assets";
import { validateMedia } from "../apps/api/src/assets/media.js";
import { seedSplendorAssets } from './seed-splendor-assets.js';
import { azulWav } from './azul-audio.js';

// Original geometric art: no fonts, external images or commercial game material.
function crc(bytes: Buffer) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let i = 0; i < 8; i++)
      value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
function chunk(type: string, bytes: Buffer) {
  const data = Buffer.concat([Buffer.from(type), bytes]),
    out = Buffer.alloc(bytes.length + 12);
  out.writeUInt32BE(bytes.length);
  data.copy(out, 4);
  out.writeUInt32BE(crc(data), out.length - 4);
  return out;
}
export function demoPng(key: string, paper: boolean) {
  const board = key === "board.table" || key === "board.grid",
    grid = key === "board.grid",
    icon = key.startsWith("icon."),
    width = grid ? 512 : board ? 640 : icon ? 96 : key === "tile.domino" ? 192 : 160,
    height = grid ? 512 : board ? 360 : icon ? 96 : key === "tile.domino" ? 96 : 240;
  const colors: Record<string, number[]> = {
    red: [194, 57, 64],
    blue: [42, 104, 190],
    green: [37, 135, 99],
    yellow: [216, 163, 30],
  };
  const gardenColors: Record<string, number[]> = { energy: [198, 126, 38], harvest: [50, 139, 88], build: [42, 113, 158] };
  const color = gardenColors[key.slice("icon.".length)] ??
    Object.entries(colors).find(([name]) => key.includes(`.${name}.`))?.[1] ??
    (paper ? [99, 65, 137] : [38, 126, 141]);
  const number = Number(key.split(".").at(-1)),
    scan = Buffer.alloc(height * (width * 3 + 1));
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let rgb = paper ? [245, 234, 214] : [22, 39, 53];
      const border = x < 8 || y < 8 || x >= width - 8 || y >= height - 8;
      if (board) {
        if (
          paper
            ? (Math.floor(x / 32) + Math.floor(y / 32)) % 2 === 0
            : (x + y) % 40 < 2
        )
          rgb = paper ? [224, 206, 177] : [32, 62, 72];
      } else if (border || !paper) rgb = color;
      if (key === "tile.domino" && (border || (x < width * 0.48 && x > width * 0.46))) rgb = paper ? [74, 121, 82] : [70, 174, 137];
      if (!board && Number.isFinite(number))
        for (let dot = 0; dot < number; dot++) {
          const cx = width / 2 + (dot % 2 === 0 ? -23 : 23),
            cy = 45 + Math.floor(dot / 2) * 65;
          if (
            paper
              ? Math.abs(x - cx) + Math.abs(y - cy) < 18
              : (x - cx) ** 2 + (y - cy) ** 2 < 18 ** 2
          )
            rgb = paper ? color : [255, 248, 228];
        }
      if (
        !board &&
        !Number.isFinite(number) && !key.startsWith("icon.") && key !== "tile.domino" &&
        (paper
          ? (Math.floor(x / 18) + Math.floor(y / 18)) % 2 === 0
          : (x - y + height) % 28 < 6)
      )
        rgb = paper ? color : [104, 199, 192];
      const offset = y * (width * 3 + 1) + 1 + x * 3;
      for (let c = 0; c < 3; c++) scan[offset + c] = rgb[c]!;
    }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(scan)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
export function demoWav(frequency: number) {
  const samples = 4800,
    bytes = Buffer.alloc(44 + samples * 2);
  bytes.write("RIFF");
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(24000, 24);
  bytes.writeUInt32LE(48000, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++)
    bytes.writeInt16LE(
      Math.round(
        Math.sin((i / 24000) * frequency * 2 * Math.PI) *
          Math.sin((Math.PI * i) / samples) *
          0.16 *
          32767,
      ),
      44 + i * 2,
    );
  return bytes;
}

export async function seedAssets(service: AssetService) {
  const actor = "00000000-0000-4000-8000-000000000007";
  for (const { contract, hash } of service.contracts().filter(entry => entry.contract.gameId !== 'splendor.base'))
    for (const paper of [false, true]) {
      const packId = `${contract.gameId}.${paper ? "paper" : "classic"}`;
      const existing = await service.db.query<{ id: string }>(
        "SELECT id FROM asset_versions WHERE pack_id=$1 AND version=$2",
        [packId, "1.0.0"],
      );
      if (existing.rowCount) {
        const version = await service.version(existing.rows[0]!.id);
        for (const [index, slot] of contract.slots.entries()) {
          const fileId = version.manifest.assets[slot.key]?.fileId;
          if (!fileId) throw new Error("Built-in mapping is incomplete");
          const row = (
            await service.db.query<{ storage_key: string; hash: string }>(
              "SELECT storage_key,hash FROM asset_files WHERE id=$1",
              [fileId],
            )
          ).rows[0];
          if (!row) throw new Error("Built-in file metadata missing");
          try {
            await service.storage.get(row.storage_key);
          } catch {
            const bytes =
              slot.kind === "image"
                ? demoPng(slot.key, paper)
                : contract.gameId === 'azul.base' ? azulWav(slot.key) : demoWav((paper ? 330 : 520) + index * 19);
            const restored = await validateMedia(
              bytes,
              slot.kind === "image" ? "image/png" : "audio/wav",
            );
            if (restored.hash !== row.hash)
              throw new Error(
                "Built-in bytes differ from saved hash; restore original backup",
              );
            await service.storage.put(row.storage_key, restored.bytes);
          }
        }
        console.log(`unchanged ${packId}@1.0.0`);
        continue;
      }
      let manifest: PackManifest = {
        schemaVersion: 1,
        packId,
        version: "1.0.0",
        gameId: contract.gameId,
        name: paper ? "纸张几何" : "深海几何",
        author: "桌游平台",
        source: "scripts/seed-assets.ts 原创几何 PNG 与正弦衰减 WAV",
        license: "CC0-1.0",
        assetContract: { id: contract.id, version: contract.version, hash },
        assets: {},
        sounds: {},
      };
      const draft = await service.create(actor, {
        requestId: `seed:${packId}`,
        manifest,
      });
      for (const [index, slot] of contract.slots.entries()) {
        const bytes =
          slot.kind === "image"
            ? demoPng(slot.key, paper)
            : contract.gameId === 'azul.base' ? azulWav(slot.key) : demoWav((paper ? 330 : 520) + index * 19);
        const file = await service.upload(
          actor,
          draft.id,
          `seed:${packId}:${slot.key}:${createHash("sha256").update(bytes).digest("hex")}:v2`,
          `${slot.key}.${slot.kind === "image" ? "png" : "wav"}`,
          slot.kind === "image" ? "image/png" : "audio/wav",
          bytes,
        );
        if (file.status !== "validated")
          throw new Error(`Seed media failed: ${slot.key}: ${file.error}`);
        manifest.assets[slot.key] = { kind: slot.kind, fileId: file.id };
      }
      manifest = {
        ...manifest,
        sounds: Object.fromEntries(
          contract.cues.map((cue, index) => {
            const soundSlots = contract.slots.filter((slot) => slot.kind === "audio");
            const slot = soundSlots[index];
            return [cue.id, { assetKey: slot?.key ?? soundSlots[0]?.key ?? "", gain: 0.7, cooldownMs: 200 }];
          }),
        ),
      };
      await service.edit(actor, draft.id, {
        requestId: "seed-map",
        expectedDraftRevision: 0,
        manifestText: JSON.stringify(manifest),
      });
      const checked = await service.validate(draft.id, {
        requestId: "seed-check",
        expectedDraftRevision: 1,
      });
      if (!checked.content_hash)
        throw new Error(JSON.stringify(checked.report));
      const published = await service.publish(actor, draft.id, {
        requestId: "seed-publish",
        expectedDraftRevision: 1,
        contentHash: assetFingerprint(manifest),
      });
      await service.db.query(
        "UPDATE asset_versions SET builtin=true WHERE id=$1",
        [published.versionId],
      );
      console.log(`installed ${packId}@1.0.0`);
    }
  await seedSplendorAssets(service);
}
if (process.argv[1]?.endsWith("seed-assets.ts")) {
  const test = process.argv.includes("--test"),
    url = test ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;
  if (!url || (test && url === process.env.DATABASE_URL))
    throw new Error("独立数据库配置缺失");
  const db = createDatabase(url);
  const root =
    process.env[test ? "TEST_ASSET_STORAGE_DIR" : "ASSET_STORAGE_DIR"] ??
    resolve(test ? ".data/test-assets" : ".data/assets");
  try {
    await seedAssets(
      new AssetService(db, createRegistry(false), new LocalAssetStorage(root)),
    );
  } finally {
    await db.end();
  }
}
