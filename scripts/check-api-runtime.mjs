import { createRegistry } from '../apps/api/dist/registry/index.js';
import { PackageRuntime } from '../apps/api/dist/registry/package-runtime.js';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { DeterministicRng } from '@boardgame/game-sdk';

const registry = createRegistry(false);
if (!registry.get('demo.counter-room', '1.0.0') || !registry.hasResourcePack('demo.counter-room', '1.0.0')) {
  throw new Error('Production API registry cannot load the room game and its resources');
}
console.log('production API loads compiled game modules and resources');

const runtime = await PackageRuntime.create();
const extension = runtime.extension(await readFile(new URL('../apps/api/game-package-example/server.txt', import.meta.url), 'utf8'));
const initial = extension.setup({ seats: ['a', 'b'], options: extension.validateOptions({}), rng: new DeterministicRng(123) });
const updated = extension.applyAction(initial.state, { kind: 'seat', seatId: 'a', controllerEpoch: 0 }, { type: 'claim' }, new DeterministicRng(123));
const view = extension.getView(extension.deserialize(extension.serialize(updated.state)), { kind: 'seat', seatId: 'b' });
if (!view.canClaim || view.scores[0] < 1) throw new Error('Production package runtime cannot execute and restore the uploaded game contract');
console.log('production API runs isolated ZIP rules and restores serialized state');
