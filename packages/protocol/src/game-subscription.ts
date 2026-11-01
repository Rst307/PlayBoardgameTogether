import { z } from 'zod';

export const gameSubscriptionInputSchema = z
  .object({
    requestId: z.string().uuid(),
    expectedRevision: z.number().int().nonnegative(),
    autoAdd: z.boolean(),
    autoUpdate: z.boolean(),
  })
  .strict();
export const gameSubscriptionCheckSchema = gameSubscriptionInputSchema.pick({
  requestId: true,
  expectedRevision: true,
});
export const gameSubscriptionItemSchema = z
  .object({
    gameId: z.string().max(128),
    version: z.string().max(32),
    outcome: z.enum(['added', 'updated', 'current', 'skipped', 'failed']),
    message: z.string().max(160),
  })
  .strict();
export const gameSubscriptionSchema = z
  .object({
    source: z.literal('playboard-official'),
    autoAdd: z.boolean(),
    autoUpdate: z.boolean(),
    revision: z.number().int().nonnegative(),
    intervalMinutes: z.literal(60),
    status: z.enum(['idle', 'running', 'succeeded', 'partial', 'failed', 'interrupted']),
    startedAt: z.string().datetime().nullable(),
    finishedAt: z.string().datetime().nullable(),
    nextCheckAt: z.string().datetime().nullable(),
    message: z.string().max(160),
    items: z.array(gameSubscriptionItemSchema).max(100),
  })
  .strict();
export type GameSubscription = z.infer<typeof gameSubscriptionSchema>;
export type GameSubscriptionInput = z.infer<typeof gameSubscriptionInputSchema>;
export type GameSubscriptionItem = z.infer<typeof gameSubscriptionItemSchema>;
