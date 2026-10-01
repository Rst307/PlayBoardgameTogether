import { z } from 'zod';
import { manifestSchema } from '@boardgame/game-sdk';

export const colors = ['white', 'blue', 'green', 'red', 'black'] as const;
export const tokenColors = [...colors, 'gold'] as const;
export const colorSchema = z.enum(colors);
export const tokenSchema = z.enum(tokenColors);
export type Color = z.infer<typeof colorSchema>;
export type Token = z.infer<typeof tokenSchema>;
export const names: Record<Token, string> = {
  white: '钻石', blue: '蓝宝石', green: '祖母绿', red: '红宝石', black: '缟玛瑙', gold: '黄金',
};
export const gemCountsSchema = z.object({
  white: z.number().int().nonnegative().max(7),
  blue: z.number().int().nonnegative().max(7),
  green: z.number().int().nonnegative().max(7),
  red: z.number().int().nonnegative().max(7),
  black: z.number().int().nonnegative().max(7),
}).strict();
export const tokensSchema = gemCountsSchema.extend({ gold: z.number().int().nonnegative().max(5) }).strict();
export type Gems = z.infer<typeof gemCountsSchema>;
export type Tokens = z.infer<typeof tokensSchema>;
export const emptyGems = (): Gems => ({ white: 0, blue: 0, green: 0, red: 0, black: 0 });
export const emptyTokens = (): Tokens => ({ ...emptyGems(), gold: 0 });
export const countTokens = (tokens: Tokens) => tokenColors.reduce((sum, color) => sum + tokens[color], 0);
export const manifest = manifestSchema.parse({
  id: 'splendor.base', version: '1.0.0', sdkRange: '^0.1.0', contentVersion: '1.0.0',
  name: '璀璨宝石', description: '收集宝石，建立商会，赢得贵族青睐。2–4 人经典引擎构筑桌游，15 声望触发最终轮。',
  players: { min: 2, max: 4 }, mode: 'rules-driven', capabilities: ['private-view', 'turn-based'],
  defaultAssetPack: { id: 'splendor.original', version: '1.0.0' }, developmentOnly: false,
});
export const optionsSchema = z.object({}).strict();
export const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('take'), colors: z.array(colorSchema).min(1).max(3) }).strict(),
  z.object({ type: z.literal('reserve'), cardId: z.string().min(1) }).strict(),
  z.object({ type: z.literal('reserve_deck'), tier: z.number().int().min(1).max(3) }).strict(),
  z.object({ type: z.literal('buy'), cardId: z.string().min(1), payment: tokensSchema }).strict(),
  z.object({ type: z.literal('return'), color: tokenSchema }).strict(),
  z.object({ type: z.literal('noble'), nobleId: z.string().min(1) }).strict(),
  z.object({ type: z.literal('pass') }).strict(),
]);
export type SplendorAction = z.infer<typeof actionSchema>;
export const cardSchema = z.object({
  id: z.string(), tier: z.number().int().min(1).max(3), bonus: colorSchema,
  points: z.number().int().min(0).max(5), cost: gemCountsSchema,
}).strict();
export type Card = z.infer<typeof cardSchema>;
export const nobleSchema = z.object({ id: z.string(), name: z.string(), points: z.literal(3), requirement: gemCountsSchema }).strict();
export type Noble = z.infer<typeof nobleSchema>;
export const playerSchema = z.object({
  tokens: tokensSchema, purchased: z.array(cardSchema), nobles: z.array(nobleSchema),
  reservedCount: z.number().int().min(0).max(3), bonuses: z.object({
    white: z.number().int().nonnegative(), blue: z.number().int().nonnegative(),
    green: z.number().int().nonnegative(), red: z.number().int().nonnegative(),
    black: z.number().int().nonnegative(),
  }).strict(), score: z.number().int().nonnegative(),
}).strict();
export const outcomeSchema = z.object({ status: z.literal('ongoing') }).strict().or(z.object({
  status: z.literal('finished'), scores: z.record(z.string(), z.number().int().nonnegative()),
  winners: z.array(z.string()).min(1), reason: z.enum(['prestige', 'stalemate']),
}).strict());
export const viewSchema = z.object({
  seats: z.array(z.string()).min(2).max(4), viewingSeatId: z.string(),
  currentSeatId: z.string(), turn: z.number().int().nonnegative(),
  phase: z.enum(['action', 'return', 'noble', 'finished']), finalRound: z.boolean(),
  bank: tokensSchema, market: z.array(z.array(cardSchema)).length(3),
  deckCounts: z.array(z.number().int().nonnegative()).length(3),
  nobles: z.array(nobleSchema), players: z.record(z.string(), playerSchema),
  myReserved: z.array(cardSchema).max(3), legalActions: z.array(actionSchema),
  outcome: outcomeSchema,
}).strict();
export type SplendorView = z.infer<typeof viewSchema>;

export function bonuses(cards: Card[]): Gems {
  const result = emptyGems();
  for (const card of cards) result[card.bonus]++;
  return result;
}
export function paymentFor(card: Card, discount: Gems, tokens: Tokens): Tokens | null {
  const payment = emptyTokens();
  for (const color of colors) {
    const need = Math.max(0, card.cost[color] - discount[color]);
    payment[color] = Math.min(need, tokens[color]);
    payment.gold += need - payment[color];
  }
  return payment.gold <= tokens.gold ? payment : null;
}
