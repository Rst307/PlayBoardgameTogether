import { z } from "zod";

export const assetFileSchema = z.object({
  id: z.string().uuid(),
  originalName: z.string(),
  kind: z.enum(["image", "audio"]),
  status: z.enum([
    "staged",
    "processing",
    "validated",
    "failed",
    "tombstone",
    "deleted",
  ]),
  mediaType: z.string(),
  bytes: z.number().int().nonnegative(),
  hash: z.string().nullable(),
  metadata: z.object({
    width: z.number().optional(),
    height: z.number().optional(),
    sourceWidth: z.number().optional(),
    sourceHeight: z.number().optional(),
    durationMs: z.number().optional(),
    sampleRate: z.number().optional(),
    channels: z.number().optional(),
    peak: z.number().optional(),
  }),
  error: z.string().nullable(),
});
export type AssetFile = z.infer<typeof assetFileSchema>;
export const assetVersionInfoSchema = z.object({
  id: z.string().uuid(),
  packId: z.string(),
  version: z.string(),
  gameId: z.string(),
  name: z.string(),
  status: z.enum(["published", "archived", "deleted"]),
  manifestHash: z.string(),
  builtin: z.boolean(),
  references: z.number().int().nonnegative().optional(),
});
export type AssetVersionInfo = z.infer<typeof assetVersionInfoSchema>;
export const assetBindingSchema = z
  .object({
    versionId: z.string().uuid(),
    manifestHash: z.string().regex(/^[a-f0-9]{64}$/),
    contractVersion: z.string(),
  })
  .strict();
export const presentationCueSchema = z
  .object({
    eventId: z.string().max(180),
    cueIndex: z.number().int().min(0).max(63),
    cueId: z.string().max(128),
  })
  .strict();
