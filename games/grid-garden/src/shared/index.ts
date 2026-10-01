import { z } from 'zod';
import { manifestSchema } from '@boardgame/game-sdk';

export const manifest = manifestSchema.parse({
  id: 'grid-garden', version: '1.0.0', sdkRange: '^0.1.0', contentVersion: '1.0.0',
  name: 'Grid Garden', description: '三轮秘密选择 harvest 或 build，在 4×4 花园放置骨牌并争取最高分。',
  players: { min: 2, max: 4 }, mode: 'rules-driven',
  capabilities: ['private-view', 'simultaneous', 'spatial'],
  defaultAssetPack: { id: 'grid-garden.classic', version: '1.0.0' }, developmentOnly: false,
});

export const optionsSchema = z.object({}).strict();
export const choiceSchema = z.enum(['harvest', 'build']);
export const orientationSchema = z.enum(['H', 'V']);
export const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('submit_choice'), round: z.number().int().min(1).max(3), choice: choiceSchema }).strict(),
  z.object({ type: z.literal('place_domino'), round: z.number().int().min(1).max(3), x: z.number().int().min(0).max(3), y: z.number().int().min(0).max(3), orientation: orientationSchema }).strict(),
]);
export type GardenAction = z.infer<typeof actionSchema>;
export type Orientation = z.infer<typeof orientationSchema>;
export type Choice = z.infer<typeof choiceSchema>;
export type Placement = { id: string; x: number; y: number; orientation: Orientation };
export type GardenEvent =
  | { type: 'choice.submitted'; seatId: string }
  | { type: 'choices.revealed'; choices: Record<string, Choice> }
  | { type: 'energy.resolved'; energy: Record<string, number> }
  | { type: 'domino.placed'; seatId: string; placement: Placement }
  | { type: 'round.started'; round: number }
  | { type: 'match.finished'; scores: Record<string, number>; winners: string[] };

export const placementSchema = z.object({ id: z.string(), x: z.number().int().min(0).max(3), y: z.number().int().min(0).max(3), orientation: orientationSchema }).strict();
export const boardSchema = z.object({ energy: z.number().int().nonnegative(), placements: z.array(placementSchema) }).strict();
export const viewSchema = z.object({
  seats: z.array(z.string()).min(2).max(4), viewingSeatId: z.string(), round: z.number().int().min(1).max(3),
  phase: z.enum(['selecting', 'placing', 'finished']), boards: z.record(z.string(), boardSchema),
  submittedSeatIds: z.array(z.string()), revealedChoices: z.record(z.string(), choiceSchema).nullable(),
  myChoice: choiceSchema.nullable(), canBuild: z.boolean(), builders: z.array(z.string()), placedSeatIds: z.array(z.string()),
  roundResults: z.array(z.object({ round: z.number().int(), choices: z.record(z.string(), choiceSchema), energy: z.record(z.string(), z.number().int().nonnegative()) }).strict()),
  outcome: z.object({ status: z.literal('ongoing') }).strict().or(z.object({
    status: z.literal('finished'),
    scores: z.record(z.string(), z.number().int().nonnegative()),
    scoreDetails: z.record(z.string(), z.object({ occupied: z.number().int().nonnegative(), energy: z.number().int().nonnegative(), total: z.number().int().nonnegative() }).strict()),
    winners: z.array(z.string()).min(1),
  }).strict()),
  legalPlacements: z.array(z.object({ x: z.number().int(), y: z.number().int(), orientation: orientationSchema }).strict()),
}).strict();
export type GardenView = z.infer<typeof viewSchema>;

export function cellsFor(x: number, y: number, orientation: Orientation) {
  return orientation === 'H' ? [[x, y], [x + 1, y]] as const : [[x, y], [x, y + 1]] as const;
}

export function listLegalPlacements(placements: Placement[]) {
  const occupied = new Set(placements.flatMap(item => cellsFor(item.x, item.y, item.orientation).map(([x, y]) => `${x},${y}`)));
  const legal: Array<{ x: number; y: number; orientation: Orientation }> = [];
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) for (const orientation of ['H', 'V'] as const) {
    const cells = cellsFor(x, y, orientation);
    if (cells.every(([cx, cy]) => cx >= 0 && cx < 4 && cy >= 0 && cy < 4 && !occupied.has(`${cx},${cy}`))) legal.push({ x, y, orientation });
  }
  return legal;
}

export function scoreBoard(board: { energy: number; placements: Placement[] }) {
  return board.placements.length * 2 + Math.floor(board.energy / 2);
}
