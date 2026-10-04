import { z } from 'zod';

export const gamePackageResultSchema = z.object({
  gameId: z.string().max(128),
  version: z.string().max(32),
  name: z.string().max(80),
  hash: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export const gamePackageRequestSchema = z.object({
  requestId: z.string().uuid(),
  expectedCatalogHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
}).strict();
export const gamePackageReviewSchema = gamePackageResultSchema.extend({
  kind: z.enum(['new', 'update', 'installed']),
  installedVersions: z.array(z.string().max(32)).max(1000),
  catalogHash: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export type GamePackageReview = z.infer<typeof gamePackageReviewSchema>;
export type GamePackageResult = z.infer<typeof gamePackageResultSchema>;
