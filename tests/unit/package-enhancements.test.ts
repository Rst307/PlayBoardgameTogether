import { Worker } from 'node:worker_threads';
import { packageImageSchema } from '../../apps/api/src/catalog/package-art.js';
import { publicImageUrlSchema } from '../../packages/protocol/src/game-presentation.js';
import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import { zipSync } from 'fflate';
import { DeterministicRng } from '../../packages/game-sdk/src/index.js';
import { PackageRuntime } from '../../apps/api/src/registry/package-runtime.js';
import { readGamePackage } from '../../apps/api/src/catalog/game-package.js';
import { gamePackageFiles } from '../fixtures/game-package.js';
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/l8AAAAASUVORK5CYII=';
let runtime: PackageRuntime;
beforeAll(async () => { runtime = await PackageRuntime.create(); });
describe('uploaded game AI and artwork regression', () => {
    it('preserves optional AI context from the package inside QuickJS', async () => {
        const files = await gamePackageFiles();
        const source = files['server.js'].toString() + '\ngame.getDecisionContext = (state, viewer) => game.getView(state, viewer).canClaim ? { decisionKey: "claim", legalActions: [{type:"claim"}] } : null;';
        const extension = runtime.extension(source);
        expect(typeof extension.getDecisionContext).toBe('function');
        const state = extension.setup({ seats: ['a', 'b'], options: {}, rng: new DeterministicRng(123) }).state;
        expect(extension.getDecisionContext!(state, { kind: 'seat', seatId: 'a' })).toEqual({ decisionKey: 'claim', legalActions: [{ type: 'claim' }] });
        expect(extension.getDecisionContext!(state, { kind: 'seat', seatId: 'b' })).toBeNull();
    });
    it('accepts embedded PNG artwork within the existing three-file archive', async () => {
        const files = await gamePackageFiles();
        files['game.json'] = Buffer.from(JSON.stringify({ format: 'boardgame-package-v1', rules: 'public rules', presentation: { icon: png, cover: png, background: png } }));
        expect(readGamePackage(Buffer.from(zipSync(files)))).toHaveProperty('presentation.cover', png);
    });
    it('UNO provides legal private-view decisions rather than rejecting AI', async () => {
        const source = await readFile(new URL('../../game-packages/uno/server.txt', import.meta.url), 'utf8');
        const extension = runtime.extension(source);
        expect(typeof extension.getDecisionContext).toBe('function');
        const state = extension.setup({ seats: ['a', 'b'], options: {}, rng: new DeterministicRng(123) }).state;
        const decision = extension.getDecisionContext!(state, { kind: 'seat', seatId: 'a' })!;
        expect(decision.legalActions.length).toBeGreaterThan(0);
        for (const action of decision.legalActions)
            expect(() => extension.validateAction(state, { kind: 'seat', seatId: 'a', controllerEpoch: 0 }, action)).not.toThrow();
    });
});
it('generic basic worker runs in plain Node without importing TypeScript or game State', async () => {
    const worker = new Worker(new URL('../../apps/api/src/ai-policy-worker.mjs', import.meta.url), { execArgv: [] });
    try {
        const response = new Promise<unknown>((resolve, reject) => {
            worker.once('message', resolve);
            worker.once('error', reject);
        });
        worker.postMessage({ gameId: 'online.uno', policyId: 'basic-v1', view: {}, legalActions: [{ type: 'draw' }] });
        expect(await response).toEqual({ ok: true, action: { type: 'draw' } });
    }
    finally {
        await worker.terminate();
    }
});
it('rejects invalid/oversized/non-PNG artwork and restricts public package image paths', () => {
    for (const data of ['data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', 'https://example.com/image.png',
        'data:image/png;base64,AA==', png.slice(0, -4), png + 'garbage'])
        expect(packageImageSchema.safeParse(data).success).toBe(false);
    const bytes = Buffer.from(png.split(',')[1]!, 'base64');
    bytes.writeUInt32BE(50000, 16);
    expect(packageImageSchema.safeParse('data:image/png;base64,' + bytes.toString('base64')).success).toBe(false);
    expect(publicImageUrlSchema.safeParse('/api/v1/game-packages/online.uno/versions/1.1.0/art/cover.png').success).toBe(true);
    for (const path of ['/api/v1/game-packages/../desktop', '/api/v1/game-packages/online.uno/versions/1.1.0/art/cover.png?secret=x',
        '/api/v1/game-packages/online.uno/versions/1.1.0/art/server.js'])
        expect(publicImageUrlSchema.safeParse(path).success).toBe(false);
});
it('keeps old packages without AI unchanged and rejects malformed decision contexts', async () => {
    const files = await gamePackageFiles();
    const source = files['server.js'].toString();
    expect(runtime.extension(source).getDecisionContext).toBeUndefined();
    for (const result of ['{decisionKey:"",legalActions:[{type:"claim"}]}', '{decisionKey:"claim",legalActions:[]}',
        '{decisionKey:"claim",legalActions:[{type:"claim"}],state:{secret:true}}']) {
        const extension = runtime.extension(source + '\ngame.getDecisionContext=()=>(' + result + ');');
        expect(() => extension.getDecisionContext!({}, { kind: 'seat', seatId: 'a' })).toThrow();
    }
});
