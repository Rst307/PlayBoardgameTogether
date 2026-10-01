import { z } from "zod";

export const assetKeySchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9.-]{0,127}$/)
  .refine((key) => !["constructor", "prototype", "__proto__"].includes(key));
export const assetVersionSchema = z
  .string()
  .regex(/^\d{1,6}\.\d{1,6}\.\d{1,6}$/);
export const assetContractSchema = z
  .object({
    id: assetKeySchema,
    version: assetVersionSchema,
    gameId: assetKeySchema,
    slots: z
      .array(
        z
          .object({
            key: assetKeySchema,
            kind: z.enum(["image", "audio"]),
            required: z.boolean(),
            label: z.string().min(1).max(80),
            aspectRatio: z.number().positive().max(100).optional(),
          })
          .strict(),
      )
      .max(200),
    cues: z
      .array(
        z
          .object({
            id: assetKeySchema,
            audience: z.enum(["projected-public", "self"]),
            group: assetKeySchema,
            priority: z.number().int().min(0).max(10),
          })
          .strict(),
      )
      .max(64),
  })
  .strict();
export type AssetContract = z.infer<typeof assetContractSchema>;
export const packManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    packId: assetKeySchema,
    version: assetVersionSchema,
    gameId: assetKeySchema,
    name: z.string().trim().min(1).max(80),
    author: z.string().min(1).max(120),
    source: z.string().min(1).max(500),
    license: z.string().min(1).max(500),
    assetContract: z
      .object({
        id: assetKeySchema,
        version: assetVersionSchema,
        hash: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .strict(),
    assets: z
      .record(
        assetKeySchema,
        z
          .object({
            kind: z.enum(["image", "audio"]),
            fileId: z.string().uuid(),
          })
          .strict(),
      )
      .refine((value) => Object.keys(value).length <= 200),
    sounds: z
      .record(
        assetKeySchema,
        z
          .object({
            assetKey: assetKeySchema,
            gain: z.number().min(0).max(1),
            cooldownMs: z.number().int().min(0).max(60000),
          })
          .strict(),
      )
      .refine((value) => Object.keys(value).length <= 64),
  })
  .strict();
export type PackManifest = z.infer<typeof packManifestSchema>;

/** Stable across server, browser and JSONB key ordering. */
export function canonicalAssetJson(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map(canonicalAssetJson).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(
        ([key, item]) => `${JSON.stringify(key)}:${canonicalAssetJson(item)}`,
      )
      .join(",")}}`;
  return JSON.stringify(value);
}

/** JSON.parse alone silently accepts duplicate keys; inspect tokens before parsing. */
export function parseAssetJson(text: string): unknown {
  if (new TextEncoder().encode(text).length > 256 * 1024)
    throw new Error("映射文件超过 256 KiB");
  let offset = 0;
  const ws = () => {
    while (/\s/.test(text[offset] ?? "") && offset < text.length) offset++;
  };
  const string = (): string => {
    const start = offset++;
    while (offset < text.length) {
      if (text[offset] === "\\") {
        offset += 2;
        continue;
      }
      if (text[offset++] === '"')
        return JSON.parse(text.slice(start, offset)) as string;
    }
    throw new Error("JSON 字符串不完整");
  };
  const value = (depth: number): void => {
    if (depth > 12) throw new Error("JSON 嵌套过深");
    ws();
    if (text[offset] === "{") {
      offset++;
      ws();
      const keys = new Set<string>();
      if (text[offset] === "}") {
        offset++;
        return;
      }
      while (offset < text.length) {
        ws();
        if (text[offset] !== '"') throw new Error("JSON 字段无效");
        const key = string();
        if (
          keys.has(key) ||
          ["__proto__", "constructor", "prototype"].includes(key)
        )
          throw new Error("重复或危险 JSON 字段");
        keys.add(key);
        ws();
        if (text[offset++] !== ":") throw new Error("JSON 缺少冒号");
        value(depth + 1);
        ws();
        const next = text[offset++];
        if (next === "}") return;
        if (next !== ",") throw new Error("JSON 对象无效");
      }
    } else if (text[offset] === "[") {
      offset++;
      ws();
      if (text[offset] === "]") {
        offset++;
        return;
      }
      while (offset < text.length) {
        value(depth + 1);
        ws();
        const next = text[offset++];
        if (next === "]") return;
        if (next !== ",") throw new Error("JSON 数组无效");
      }
    } else if (text[offset] === '"') {
      string();
      return;
    } else {
      const token =
        /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(
          text.slice(offset),
        );
      if (!token) throw new Error("JSON 值无效");
      offset += token[0].length;
      return;
    }
    throw new Error("JSON 不完整");
  };
  value(0);
  ws();
  if (offset !== text.length) throw new Error("JSON 尾部无效");
  return JSON.parse(text) as unknown;
}

export type PresentationCue = {
  eventId: string;
  cueIndex: number;
  cueId: string;
};
export interface AssetResolverPort {
  resolveImage(key: string): string | undefined;
}
