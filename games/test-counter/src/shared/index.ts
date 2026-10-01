import { z } from 'zod';

export const manifest = {
  id: 'demo.test-counter', version: '0.1.0', sdkRange: '^0.1.0', contentVersion: '0.1.0', name: '计数测试游戏', description: '用于验证扩展契约、服务端规则和私密玩家视图。',
  players: { min: 2, max: 2 }, mode: 'rules-driven', capabilities: ['private-view', 'turn-based'], defaultAssetPack: { id: 'demo.counter-assets', version: '0.1.0' }, developmentOnly: true,
} as const;
export const roomManifest = {
  ...manifest,
  id: 'demo.counter-room',
  version: '1.0.0',
  contentVersion: '1.0.0',
  name: '计数房间演示',
  description: '用于正式账户房间开局和私密初始视图验证。',
  developmentOnly: false,
} as const;
export const optionsSchema = z.object({ targetScore: z.number().int().min(2).max(10).default(3) }).strict();
export const actionSchema = z.object({ type: z.literal('add'), payload: z.object({ value: z.union([z.literal(1), z.literal(2)]) }).strict() }).strict();
export const viewSchema = z.object({ seats: z.tuple([z.string(), z.string()]), scores: z.record(z.string(), z.number().int().nonnegative()), activeSeatId: z.string().nullable(), targetScore: z.number().int(), viewingSeatId: z.string(), myHint: z.number().int(), outcome: z.object({ status: z.literal('ongoing') }).strict().or(z.object({ status: z.literal('finished'), winners: z.array(z.string()), scores: z.record(z.string(), z.number()) }).strict()) }).strict();
export type CounterOptions = z.infer<typeof optionsSchema>;
export type CounterAction = z.infer<typeof actionSchema>;
export type CounterView = z.infer<typeof viewSchema>;
export type PublicCounterEvent = { eventId?: string; type: 'counter.started' | 'hint.assigned' | 'counter.added' | 'counter.finished'; seatId?: string; value?: number; scores?: Record<string, number> };
