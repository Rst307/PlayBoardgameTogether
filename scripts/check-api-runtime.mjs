import { createRegistry } from '../apps/api/dist/registry/index.js';

const registry = createRegistry(false);
if (!registry.get('demo.counter-room', '1.0.0') || !registry.hasResourcePack('demo.counter-room', '1.0.0')) {
  throw new Error('Production API registry cannot load the room game and its resources');
}
console.log('production API loads compiled game modules and resources');
