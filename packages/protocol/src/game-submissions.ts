import { z } from 'zod';

// Application data is inert text, never HTML, executable code or a download instruction.
const plainText = (max: number) => z.string().trim().min(1).max(max)
  .refine(value => !/[<>]/.test(value) && Array.from(value).every(character => {
    const code = character.charCodeAt(0);
    return code !== 127 && (code >= 32 || code === 9 || code === 10 || code === 13);
  }), '只允许纯文本');
export const gameSubmissionInputSchema = z.object({
  requestId: z.string().uuid(),
  gameId: z.string().regex(/^[a-z][a-z0-9-]{0,63}$/),
  version: z.string().regex(/^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/),
  name: plainText(80),
  description: plainText(2000),
  repositoryUrl: z.string().max(200).regex(/^https:\/\/github\.com\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9_-][A-Za-z0-9_.-]{0,99}$/),
}).strict();
export const gameSubmissionReviewSchema = z.object({
  requestId: z.string().uuid(),
  expectedRevision: z.number().int().positive(),
  status: z.enum(['reviewed', 'rejected']),
  reviewNote: plainText(1000),
}).strict();
export const gameSubmissionSchema = gameSubmissionInputSchema.omit({ requestId: true }).extend({
  id: z.string().uuid(),
  status: z.enum(['pending', 'reviewed', 'rejected']),
  revision: z.number().int().positive(),
  reviewNote: plainText(1000).nullable(),
  createdAt: z.string().datetime(),
  reviewedAt: z.string().datetime().nullable(),
}).strict();
export const gameSubmissionListQuerySchema = z.object({
  before: z.string().uuid().optional(),
}).strict();
export const gameSubmissionPageSchema = z.object({
  items: z.array(gameSubmissionSchema).max(20),
  nextCursor: z.string().uuid().nullable(),
}).strict();
export type GameSubmissionInput = z.infer<typeof gameSubmissionInputSchema>;
export type GameSubmissionReview = z.infer<typeof gameSubmissionReviewSchema>;
