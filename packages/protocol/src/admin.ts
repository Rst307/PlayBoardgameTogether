import { z } from 'zod';

export const adminAccountSchema = z
  .object({
    id: z.string().uuid(),
    username: z.string(),
    displayName: z.string(),
    role: z.enum(['user', 'administrator']),
    status: z.enum(['active', 'disabled']),
    revision: z.number().int().positive(),
    createdAt: z.string().datetime(),
  })
  .strict();
export const adminAccountPageSchema = z
  .object({
    items: adminAccountSchema.array().max(20),
    nextCursor: z.string().uuid().nullable(),
  })
  .strict();
export const adminAccountQuerySchema = z
  .object({
    before: z.string().uuid().optional(),
    search: z.string().trim().max(32).default(''),
  })
  .strict();
const command = {
  requestId: z.string().uuid(),
  expectedRevision: z.number().int().positive(),
};
export const adminAccountCommandSchema = z
  .object({ ...command, status: z.enum(['active', 'disabled']) })
  .strict();
export const adminGameCommandSchema = z
  .object({ ...command, enabled: z.boolean() })
  .strict();
export const adminGameSchema = z
  .object({
    id: z.string(),
    version: z.string(),
    name: z.string(),
    enabled: z.boolean(),
    revision: z.number().int().positive(),
    available: z.boolean(),
    developmentOnly: z.boolean(),
  })
  .strict();
export const adminOverviewSchema = z
  .object({
    accounts: z.number().int().nonnegative(),
    disabledAccounts: z.number().int().nonnegative(),
    openRooms: z.number().int().nonnegative(),
    activeMatches: z.number().int().nonnegative(),
    installedGames: z.number().int().nonnegative(),
    enabledGames: z.number().int().nonnegative(),
    pendingSubmissions: z.number().int().nonnegative(),
  })
  .strict();
export type AdminAccount = z.infer<typeof adminAccountSchema>;
export type AdminGame = z.infer<typeof adminGameSchema>;
export type AdminAccountCommand = z.infer<typeof adminAccountCommandSchema>;
export type AdminGameCommand = z.infer<typeof adminGameCommandSchema>;
