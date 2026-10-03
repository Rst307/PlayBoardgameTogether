import type { ScoreStep } from '../shared/index.js';

export interface ScoreImpact {
  label: string;
  points: number;
  cells: ScoreStep['cells'];
}
export const scoreTiming = { landing: 450, impact: 1100, hold: 1000, reduced: 180 };

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
