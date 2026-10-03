import { writeFile } from 'node:fs/promises';
import { DeterministicRng } from '@boardgame/game-sdk';
import { azulExtension as game } from '../games/azul/src/server/index.js';
import type { AzulView } from '../games/azul/src/shared/index.js';
import { azulTutorialReferences } from '../tests/unit/azul-tutorial-reference.js';

// Authoring only: publish fixed public projections, never bag/discard or an authoritative State.
function difference(before: AzulView, after: AzulView): Partial<AzulView> {
  return Object.fromEntries(Object.entries(after).filter(([key, value]) =>
    JSON.stringify(value) !== JSON.stringify(before[key as keyof AzulView])));
}
const viewer = { kind: 'seat' as const, seatId: 'tutorial.you' };
const references = azulTutorialReferences();
const base = game.getView(references[0]!.state, viewer);
const scenes = references.map(reference => {
  const before = game.getView(reference.state, viewer);
  const result = game.applyAction(reference.state, { ...viewer, controllerEpoch: 0 }, reference.action, new DeterministicRng(42));
  const state = game.deserialize(game.serialize(result.state));
  return {
    id: reference.id, initial: difference(base, before), action: reference.action,
    changes: difference(before, game.getView(state, viewer)),
    events: game.projectEvents(result.events, viewer).map((event, index) => ({
      ...event, eventId: `tutorial.azul.${reference.id}.${index}`,
    })),
  };
});
await writeFile('games/azul/src/client/tutorial-scenes.ts',
  '// Synthetic public projections. Regenerate: pnpm exec tsx scripts/generate-azul-tutorial.ts\n' +
  'export const practiceScenes: unknown = ' + JSON.stringify({ base, scenes }, null, 2) + ';\n');
console.log('Published Azul practice scenes:', scenes.length);
