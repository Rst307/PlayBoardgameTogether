import { z } from 'zod';
import { actionSchema, type AzulView, type Player, type ScoreStep } from '../shared/index.js';

const draftedEventSchema = actionSchema.omit({ type: true }).extend({
  type: z.literal('tiles.drafted'), eventId: z.string(), seatId: z.string(),
  count: z.number().int().min(1).max(100),
});

/** Recreate only the public floor just before automatic round settlement. */
export function settlementFloors(before: AzulView, rawDraft: unknown): Record<string, Player['floor']> {
  const floors = Object.fromEntries(before.seats.map(id => [id, [...before.players[id]!.floor]]));
  const parsed = draftedEventSchema.safeParse(rawDraft);
  if (!parsed.success) return floors;
  const draft = parsed.data;
  const player = before.players[draft.seatId];
  const floor = floors[draft.seatId];
  if (!player || !floor) return floors;
  // A snapshot may already contain this draft. Never append its tiles twice.
  const source = draft.source === -1 ? before.center : before.factories[draft.source] ?? [];
  if (source.filter(color => color === draft.color).length !== draft.count) return floors;
  if (draft.source === -1 && before.firstAvailable && floor.length < 7) floor.push('first');
  const placed = draft.row < 0 ? 0 : Math.min(draft.count, draft.row + 1 - player.lines[draft.row]!.count);
  floor.push(...Array<Player['floor'][number]>(Math.min(draft.count - placed, 7 - floor.length)).fill(draft.color));
  return floors;
}

export interface ScoreImpact {
  label: string;
  points: number;
  cells: ScoreStep['cells'];
}
export const scoreTiming = { landing: 160, impact: 180, hold: 220, reduced: 60, eventWait: 700 };

/** A single growing number keeps multi-line and multi-bonus combos readable. */
export function comboPoints(impacts: ScoreImpact[], revealed: number): number {
  return impacts.slice(0, revealed).reduce((sum, hit) => sum + hit.points, 0);
}

export function comboTier(points: number): 'normal' | 'strong' | 'mega' {
  return points >= 10 ? 'mega' : points >= 6 ? 'strong' : 'normal';
}

/** Presentation only. Every sequence must sum to the server's projected delta. */
export function scoreImpacts(step: ScoreStep): ScoreImpact[] {
  if (step.kind === 'tile') {
    const horizontal = step.cells.filter(cell => cell.row === step.row);
    const vertical = step.cells.filter(cell => cell.col === step.col);
    const lines: ScoreImpact[] = [];
    if (horizontal.length > 1) lines.push({ label: '横向连线', points: horizontal.length, cells: horizontal });
    if (vertical.length > 1) lines.push({ label: '纵向连线', points: vertical.length, cells: vertical });
    if (lines.length && lines.reduce((sum, hit) => sum + hit.points, 0) === step.points) return lines;
  }
  if (step.kind === 'bonus') {
    const count = Number(/×(\d+)$/.exec(step.label)?.[1] ?? 1);
    if (count > 1 && count <= 5 && step.points > 0 && step.points % count === 0) {
      return Array.from({ length: count }, (_, index) => ({
        label: `${step.label.replace(/\s*×\d+$/, '')} ${index + 1}/${count}`,
        points: step.points / count, cells: [],
      }));
    }
  }
  return [{ label: step.label, points: step.points, cells: step.cells }];
}

export function impactScore(step: ScoreStep, impacts: ScoreImpact[], revealed: number): number {
  if (revealed >= impacts.length) return step.total;
  return Math.max(0, step.from + impacts.slice(0, revealed).reduce((sum, hit) => sum + hit.points, 0));
}
