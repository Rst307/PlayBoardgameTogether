import { z } from 'zod';
import { manifestSchema } from '@boardgame/game-sdk';

export const manifest = manifestSchema.parse({
  id: 'color-match', version: '1.0.0', sdkRange: '^0.1.0', contentVersion: '1.0.0',
  name: 'Color Match', description: '按颜色或数字出牌，数字 5 可指定对手摸牌。',
  players: { min: 2, max: 4 }, mode: 'rules-driven',
  capabilities: ['private-view', 'turn-based'],
  defaultAssetPack: { id: 'color-match.default', version: '1.0.0' },
  developmentOnly: false,
});

export const colors = ['red', 'blue', 'yellow', 'green'] as const;
export const cardSchema = z.object({
  id: z.string(),
  contentId: z.string().regex(/^card\.(red|blue|yellow|green)\.[1-5]$/),
  color: z.enum(colors),
  number: z.number().int().min(1).max(5),
}).strict();
export type Card = z.infer<typeof cardSchema>;
export const optionsSchema = z.object({}).strict();
export const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('play_card'), cardId: z.string().min(1) }).strict(),
  z.object({ type: z.literal('draw_card') }).strict(),
  z.object({ type: z.literal('choose_target'), targetSeatId: z.string().min(1) }).strict(),
]);
export type ColorAction = z.infer<typeof actionSchema>;
export const viewSchema = z.object({
  seats: z.array(z.string()).min(2).max(4), viewingSeatId: z.string(),
  myHand: z.array(cardSchema), handCounts: z.record(z.string(), z.number().int().nonnegative()),
  topCard: cardSchema, deckCount: z.number().int().nonnegative(),
  currentPlayerId: z.string().nullable(), phase: z.enum(['play', 'choose_target', 'finished']),
  winner: z.string().nullable(), winners: z.array(z.string()), legalCardIds: z.array(z.string()), canDraw: z.boolean(),
  targetSeatIds: z.array(z.string()),
}).strict();
export type ColorView = z.infer<typeof viewSchema>;
export type ColorEvent =
  | { type: 'card.played'; seatId: string; card: Card }
  | { type: 'card.draw'; seatId: string; count: number }
  | { type: 'target.chosen'; seatId: string; targetSeatId: string }
  | { type: 'game.win'; seatId: string };
export const publicEventSchema = z.object({
  eventId: z.string(), type: z.enum(['card.played', 'card.draw', 'target.chosen', 'game.win']),
  seatId: z.string(), card: cardSchema.optional(), count: z.number().int().nonnegative().optional(),
  targetSeatId: z.string().optional(),
}).strict();
