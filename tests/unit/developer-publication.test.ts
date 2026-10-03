import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { developerResources, publicSdkFiles } from '../../apps/web/developer-publication.js';
import { documentLink } from '../../apps/web/src/pages/DeveloperMarkdown.js';

describe('public developer publication', () => {
  it('publishes exact SDK source bytes and hashes without API or game server files', async () => {
    const resources = await developerResources();
    const snapshot = JSON.parse(resources.get('/developer-sdk/sdk-sources.json')!.content) as {
      files: Record<string, { content: string; sha256: string }>;
    };
    expect(Object.keys(snapshot.files)).toEqual([...publicSdkFiles]);
    expect(snapshot.files['packages/protocol/src/admin.ts']).toBeDefined();
    for (const [path, file] of Object.entries(snapshot.files)) {
      expect(path).toMatch(/^packages\/(game-sdk|client-sdk|protocol)\/(package\.json|src\/[^/]+\.ts)$/);
      const source = await readFile(path, 'utf8');
      expect(file.content).toBe(source);
      expect(file.sha256).toBe(createHash('sha256').update(source).digest('hex'));
      expect(resources.get(`/developer-sdk/${path}`)!.content).toBe(source);
    }
    expect([...resources.keys()].some(path => path.includes('/apps/api/') || path.includes('/games/'))).toBe(false);
  });

  it('keeps every published guide and local Markdown link resolvable', async () => {
    const names = (await readdir('apps/web/public/developer-docs')).filter(name => name.endsWith('.md'));
    const full = (await developerResources()).get('/llms-full.txt')!.content;
    const index = await readFile('apps/web/public/llms.txt', 'utf8');
    for (const name of names) {
      const text = await readFile(`apps/web/public/developer-docs/${name}`, 'utf8');
      expect(full).toContain(text.replace(/^\uFEFF/, ''));
      expect(index).toContain(`/developer-docs/${name}`);
      for (const link of text.matchAll(/\]\((\/[^)]+)\)/g)) {
        const href = link[1]!;
        if (href.startsWith('/developers/')) expect(names).toContain(`${href.slice('/developers/'.length)}.md`);
        else if (href.startsWith('/developer-docs/')) expect(names).toContain(href.slice('/developer-docs/'.length));
        else if (href.startsWith('/developer-sdk/')) expect((await developerResources()).has(href)).toBe(true);
        else expect(['/developers', '/llms.txt', '/llms-full.txt']).toContain(href);
      }
    }
  });

  it('documents every implemented formal HTTP route while excluding development lab actions', async () => {
    const docs = await readFile('apps/web/public/developer-docs/api.md', 'utf8');
    const app = await readFile('apps/api/src/app.ts', 'utf8');
    for (const match of app.matchAll(/app\.(?:get|post|put|patch|delete)\('\/api\/v1([^']+)'/g)) {
      const route = match[1]!;
      if (route.startsWith('/dev/') || route.startsWith('/ws')) continue;
      expect(docs, `missing route ${route}`).toContain(route);
    }
    expect(docs).toContain('没有 POST /games');
  });

  it('rejects executable and protocol-relative links', () => {
    for (const href of ['javascript:alert(1)', 'data:text/html,test', '//other.example', 'file:///secret', 'http://other.example']) {
      expect(documentLink(href)).toBeUndefined();
    }
    for (const href of ['/developers/api', '/llms.txt', '#doc-heading-1', 'https://github.com/Rst307/PlayBoardgameTogether']) {
      expect(documentLink(href)).toBe(href);
    }
  });
});
