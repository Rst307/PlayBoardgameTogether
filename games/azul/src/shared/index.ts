import { z } from 'zod';
import { manifestSchema } from '@boardgame/game-sdk';

export const colors = ['blue', 'yellow', 'red', 'black', 'white'] as const;
export const names = { blue: '钴蓝', yellow: '琥珀', red: '朱红', black: '墨玉', white: '霜白' };
export const symbols = { blue: '✦', yellow: '◆', red: '✿', black: '✧', white: '❖' };
export const colorSchema = z.enum(colors);
export type Color = z.infer<typeof colorSchema>;
export const manifest = manifestSchema.parse({
  id: 'azul.base', version: '1.0.0', sdkRange: '^0.1.0', contentVersion: '1.0.0',
  name: '花砖物语', description: '挑选彩色花砖，完成图案行，在马赛克墙上连接得分。2–4 人经典彩墙玩法。',
  players: { min: 2, max: 4 }, mode: 'rules-driven', capabilities: ['turn-based', 'spatial'],
  defaultAssetPack: { id: 'azul.original', version: '1.0.0' }, developmentOnly: false,
});
export const optionsSchema = z.object({}).strict();
export const actionSchema = z.object({
  type: z.literal('draft'), source: z.number().int().min(-1).max(8),
  color: colorSchema, row: z.number().int().min(-1).max(4),
}).strict();
export type AzulAction = z.infer<typeof actionSchema>;
export const playerSchema = z.object({
  score: z.number().int().nonnegative(),
  lines: z.array(z.object({ color: colorSchema.nullable(), count: z.number().int().min(0).max(5) }).strict()).length(5),
  wall: z.array(z.array(z.boolean()).length(5)).length(5),
  floor: z.array(colorSchema.or(z.literal('first'))).max(7),
}).strict();
export type Player = z.infer<typeof playerSchema>;
const cellSchema = z.object({ row: z.number().int().min(0).max(4), col: z.number().int().min(0).max(4) }).strict();
export const scoreStepSchema = z.object({
  seatId: z.string(), kind: z.enum(['tile', 'floor', 'bonus']),
  row: z.number().int().min(-1).max(4), col: z.number().int().min(-1).max(4),
  color: colorSchema.nullable(), points: z.number().int(), from: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(), cells: z.array(cellSchema).max(10), label: z.string().max(80),
}).strict();
export type ScoreStep = z.infer<typeof scoreStepSchema>;
export const outcomeSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ongoing') }).strict(),
  z.object({ status: z.literal('finished'), scores: z.record(z.string(), z.number().int().nonnegative()), winners: z.array(z.string()).min(1).max(4) }).strict(),
]);
export const scoreEventSchema = z.object({
  type: z.literal('round.scored'), eventId: z.string(), round: z.number().int().positive(),
  steps: z.array(scoreStepSchema).max(44),
});
export const viewSchema = z.object({
  seats: z.array(z.string()).min(2).max(4), viewingSeatId: z.string(),
  currentSeatId: z.string(), round: z.number().int().positive(), phase: z.enum(['drafting', 'finished']),
  factories: z.array(z.array(colorSchema).max(4)).min(5).max(9), center: z.array(colorSchema).max(100),
  firstAvailable: z.boolean(), nextStarter: z.string().nullable(), bagCount: z.number().int().min(0).max(100),
  players: z.record(z.string(), playerSchema), legalActions: z.array(actionSchema).max(300),
  lastRound: z.array(scoreStepSchema).max(44), outcome: outcomeSchema,
}).strict();
export type AzulView = z.infer<typeof viewSchema>;
export function wallColor(row: number, col: number): Color { return colors[(col - row + 5) % 5]!; }
export function wallColumn(row: number, color: Color) { return (colors.indexOf(color) + row) % 5; }
export const floorPenalties = [1, 1, 2, 2, 2, 3, 3];

// Scoring geometry is public; authority remains in the server extension.
export function connection(wall: boolean[][], row: number, col: number) {
  const horizontal = [{ row, col }], vertical = [{ row, col }];
  for (const direction of [-1, 1]) {
    for (let c = col + direction; c >= 0 && c < 5 && wall[row]![c]; c += direction) horizontal.push({ row, col: c });
    for (let r = row + direction; r >= 0 && r < 5 && wall[r]![col]; r += direction) vertical.push({ row: r, col });
  }
  const points = horizontal.length === 1 && vertical.length === 1 ? 1
    : (horizontal.length > 1 ? horizontal.length : 0) + (vertical.length > 1 ? vertical.length : 0);
  const cells = [...horizontal, ...vertical.slice(1)];
  return { points, cells };
}
export function completedRows(player: Player) { return player.wall.filter(row => row.every(Boolean)).length; }
