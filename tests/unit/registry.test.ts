import { describe, expect, it } from 'vitest';
import { counterAssetManifest, testCounterExtension } from '@boardgame/test-counter/server';
import { GameRegistry, createRegistry } from '../../apps/api/src/registry/index.js';

describe('GameRegistry', () => {
  it('provides version-specific public rules for every registered game',()=>{
    const registry=createRegistry(true);
    for(const manifest of registry.manifests())expect(registry.rules.get(`${manifest.id}@${manifest.version}`)?.length).toBeGreaterThan(100);
    expect(registry.rules.get('color-match@1.0.0')).toContain('数字 5');
    expect(registry.rules.get('color-match@1.0.0')).toContain('choiceId');
    expect(registry.rules.get('color-match@9.9.9')).toBeUndefined();
  });
  it('rejects duplicate identity and incompatible SDK ranges', () => {
    const duplicate = new GameRegistry();
    duplicate.register(testCounterExtension);
    expect(() => duplicate.register(testCounterExtension)).toThrow(/Duplicate/);

    const incompatible = new GameRegistry();
    expect(() => incompatible.register({
      ...testCounterExtension,
      manifest: { ...testCounterExtension.manifest, id: 'demo.incompatible', sdkRange: '^9.0.0' },
    })).toThrow(/Incompatible/);
  });
  it('requires a matching parsed default resource manifest',()=>{
    const registry=new GameRegistry();
    expect(()=>registry.register(testCounterExtension,{...counterAssetManifest,version:'9.0.0'})).toThrow(/resource pack mismatch/);
    registry.register(testCounterExtension,counterAssetManifest);
    expect(registry.hasResourcePack(testCounterExtension.manifest.id,testCounterExtension.manifest.version)).toBe(true);
  });
});
