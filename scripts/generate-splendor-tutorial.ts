import { writeFile } from 'node:fs/promises';
import { DeterministicRng } from '@boardgame/game-sdk';
import { splendorExtension as game } from '../games/splendor/src/server/index.js';
import type { SplendorView } from '../games/splendor/src/shared/index.js';
import { splendorTutorialReferences } from '../tests/unit/splendor-tutorial-reference.js';

// Authoring only: publish synthetic public projections, never server states or hidden decks.
function difference(before: SplendorView, after: SplendorView): Partial<SplendorView> {
  return Object.fromEntries(Object.entries(after).filter(([key, value]) =>
    JSON.stringify(value) !== JSON.stringify(before[key as keyof SplendorView])));
}
const viewer = { kind: 'seat' as const, seatId: 'tutorial.you' };
const references = splendorTutorialReferences();
const base = game.getView(references[0]!.state, viewer);
const scenes = references.map(reference => {
  let state = game.deserialize(game.serialize(reference.state));
  let previous = game.getView(state, viewer);
  const initial = difference(base, previous);
  const events: unknown[] = [];
  const moves = reference.actions.map((action, index) => {
    const next = game.applyAction(state, { ...viewer, controllerEpoch: 0 }, action, new DeterministicRng(42));
    state = game.deserialize(game.serialize(next.state));
    events.push(...game.projectEvents(next.events, viewer).map((event, eventIndex) => ({
      ...event, eventId: `${reference.id}.${index}.${eventIndex}`,
    })));
    const view = game.getView(state, viewer);
    const changes = difference(previous, view);
    previous = view;
    return { action, changes, events: structuredClone(events) };
  });
  return { id: reference.id, initial, moves };
});
await writeFile('games/splendor/src/client/tutorial-scenes.ts',
  '// Fixed synthetic public projections, stored as changes to reduce duplication.\n' +
  '// Regenerate: pnpm exec tsx scripts/generate-splendor-tutorial.ts\n' +
  'export const practiceScenes: unknown = ' + JSON.stringify({ base, scenes }, null, 2) + ';\n');
console.log('Published practice scenes:', scenes.length);
