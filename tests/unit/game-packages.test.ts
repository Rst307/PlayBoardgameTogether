import { beforeAll, describe, expect, it } from 'vitest';
import { DeterministicRng } from '../../packages/game-sdk/src/index.js';
import { readGamePackage } from '../../apps/api/src/catalog/game-package.js';
import { PackageRuntime } from '../../apps/api/src/registry/package-runtime.js';
import { gamePackageFiles, gamePackageZip, zipSync, strToU8 } from '../fixtures/game-package.js';

describe('bounded online game packages', () => {
  let runtime: PackageRuntime;
  beforeAll(async () => { runtime = await PackageRuntime.create(); });
  it('accepts the playable fixed-file package and rejects malformed and unsafe archives', async () => {
    const bytes = await gamePackageZip();
    expect(readGamePackage(bytes).format).toBe('boardgame-package-v1');
    const files = await gamePackageFiles();
    for (const bad of [Buffer.from('not a zip'), bytes.subarray(0, bytes.length - 1),
      Buffer.from(zipSync({ ...files, '../escape.js': strToU8('x') })),
      Buffer.from(zipSync({ ...files, 'client.html': strToU8('x'.repeat(2 * 1024 * 1024)) })),
      Buffer.from(zipSync({ ...files, 'game.json': strToU8('{"format":"wrong"}') })),
      Buffer.alloc(5 * 1024 * 1024 + 1)]) expect(() => readGamePackage(bad)).toThrow();
  });
  it('runs deterministic transitions and does not advance RNG for failed rules', async () => {
    const { server } = readGamePackage(await gamePackageZip());
    const extension = runtime.extension(server);
    const rng = new DeterministicRng(123), clone = rng.clone();
    const initial = extension.setup({ seats: ['a', 'b'], options: {}, rng });
    const actor = { kind: 'seat' as const, seatId: 'a', controllerEpoch: 0 };
    const action = extension.parseAction({ type: 'claim' });
    const first = extension.applyAction(initial.state, actor, action, rng);
    expect(first).toEqual(extension.applyAction(initial.state, actor, action, clone));
    expect(rng.snapshot()).toEqual(clone.snapshot());
    expect(extension.deserialize(extension.serialize(first.state))).toEqual(first.state);
    expect(extension.getView(first.state, { kind: 'seat', seatId: 'b' })).toMatchObject({ canClaim: true });
    const broken = runtime.extension(server + '\ngame.applyAction = (s,a,c,rng) => { rng.nextInt(1,3); throw new Error("fail"); };');
    const before = rng.snapshot();
    expect(() => broken.applyAction(initial.state, actor, action, rng)).toThrow();
    expect(rng.snapshot()).toEqual(before);
  });
  it('blocks host APIs and non-deterministic globals and terminates infinite loops', async () => {
    const { server } = readGamePackage(await gamePackageZip());
    for (const access of ['process.env', 'require("node:fs")', 'fetch("https://example.com")', 'new Date()', 'Math.random()', 'Function("return process")()']) {
      const extension = runtime.extension(server + `\ngame.validateOptions = () => ${access};`);
      expect(() => extension.validateOptions({})).toThrow();
    }
    const started = Date.now();
    expect(() => runtime.extension('while(true) {}')).toThrow();
    expect(Date.now() - started).toBeLessThan(2000);
    const memory = runtime.extension(server + '\ngame.validateOptions = () => "x".repeat(32 * 1024 * 1024);');
    expect(() => memory.validateOptions({})).toThrow();
  });
  it('projects private events inside the rule VM before returning data', async () => {
    const { server } = readGamePackage(await gamePackageZip());
    const extension = runtime.extension(server + '\ngame.projectEvents = (events, viewer) => events.filter(event => event.seat === viewer.seatId).map(event => ({type:event.type,secret:event.secret}));');
    expect(extension.projectEvents([{ type: 'private', seat: 'a', secret: 'alice' }, { type: 'private', seat: 'b', secret: 'bob' }], { kind: 'seat', seatId: 'a' })).toEqual([{ type: 'private', secret: 'alice' }]);
  });
});
