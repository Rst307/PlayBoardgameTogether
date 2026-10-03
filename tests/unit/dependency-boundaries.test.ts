import { describe, expect, it } from 'vitest';
import { forbiddenImport, sourceImports } from '../../scripts/dependency-boundaries.js';

describe('dependency boundaries', () => {
  it('reads actual syntax including multiline dynamic imports, reexports and type imports', () => {
    expect(sourceImports(`
      // import 'pg';
      const example = "import 'node:fs'";
      import type { View } from './shared.js';
      export { state } from './server.js';
      const page = import (
        /* chunk */ '@boardgame/splendor/server'
      );
      type Secret = import('node:fs/promises').FileHandle;
      const db = require('pg');
      import crypto = require('node:crypto');
    `, 'example.ts')).toEqual([
      './shared.js', './server.js', '@boardgame/splendor/server', 'node:fs/promises', 'pg', 'node:crypto',
    ]);
  });

  it('blocks node subpaths, backend packages and normalized relative API/server paths in browser sources', () => {
    const file = 'apps/web/src/app/routes.tsx';
    for (const specifier of ['node:fs/promises', 'fs/promises', 'pg/lib/client', 'fastify',
      '@boardgame/splendor/server', '../../../api/src/auth.js', '../../../../games/splendor/src/client/../server/index.js']) {
      expect(forbiddenImport('browser', file, specifier), specifier).toBe(true);
    }
    expect(forbiddenImport('browser', file, '@boardgame/splendor/client')).toBe(false);
    expect(forbiddenImport('browser', file, '../pages/LoginPage.js')).toBe(false);
  });

  it('keeps protocol, rules SDK and shared game rules independent from UI and platform', () => {
    expect(forbiddenImport('protocol', 'packages/protocol/src/index.ts', '@boardgame/splendor/shared')).toBe(true);
    expect(forbiddenImport('sdk', 'packages/game-sdk/src/index.ts', 'react/jsx-runtime')).toBe(true);
    expect(forbiddenImport('shared', 'games/splendor/src/shared/index.ts', '../client/index.js')).toBe(true);
    expect(forbiddenImport('shared', 'games/splendor/src/shared/index.ts', '@boardgame/client-sdk')).toBe(true);
    expect(forbiddenImport('shared', 'games/splendor/src/shared/index.ts', '@boardgame/game-sdk/assets')).toBe(false);
    expect(forbiddenImport('shared', 'games/splendor/src/shared/index.ts', '@boardgame/game-sdk-unrelated')).toBe(true);
    expect(forbiddenImport('sdk', 'packages/game-sdk/src/index.ts', '@boardgame/game-sdk/assets')).toBe(false);
    expect(forbiddenImport('sdk', 'packages/game-sdk/src/index.ts', 'zod')).toBe(false);
  });

  it('allows existing server resource loading and typed client transport without leaking rules', () => {
    expect(forbiddenImport('server', 'games/splendor/src/server/index.ts', 'node:fs')).toBe(false);
    expect(forbiddenImport('server', 'games/splendor/src/server/index.ts', '../shared/index.js')).toBe(false);
    expect(forbiddenImport('server', 'games/splendor/src/server/index.ts', 'pg')).toBe(true);
    expect(forbiddenImport('client-sdk', 'packages/client-sdk/src/index.ts', '@boardgame/protocol')).toBe(false);
    expect(forbiddenImport('client-sdk', 'packages/client-sdk/src/index.ts', '@boardgame/splendor/shared')).toBe(true);
  });
});
