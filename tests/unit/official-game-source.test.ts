import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  GitHubOfficialGameSource,
  compareGameVersions,
} from '../../apps/api/src/catalog/official-source.js';

const repository = 'PlayBoardgameTogether/playboard-game-uno';
const bytes = Buffer.from('verified zip bytes');
const hash = createHash('sha256').update(bytes).digest('hex');
const release = (archive: string, version: string, prerelease = false) => {
  const tag_name = `${archive}-v${version}`;
  const prefix = `https://github.com/${repository}/releases/download/${tag_name}/`;
  return {
    tag_name,
    draft: false,
    prerelease,
    assets: [
      { name: 'release.json', browser_download_url: `${prefix}release.json` },
      {
        name: `${archive}-${version}.zip`,
        browser_download_url: `${prefix}${archive}-${version}.zip`,
      },
    ],
  };
};
function sourceFixture(tamper = false) {
  const transport = vi.fn<typeof fetch>(async (address) => {
    const url = String(address);
    if (url.includes('catalog.json'))
      return Response.json({
        encoding: 'base64',
        content: Buffer.from(
          JSON.stringify({
            platform: 'PlayBoardgameTogether/PlayBoardgameTogether',
            games: {
              uno: {
                repository: 'playboard-game-uno',
                assets: [
                  { id: 'online.uno', archive: 'uno' },
                  { id: 'online.uno-no-mercy', archive: 'uno-no-mercy' },
                ],
              },
              builtin: {
                repository: 'playboard-game-azul',
                kind: 'builtin',
                assets: [{ id: 'azul', archive: 'azul' }],
              },
            },
          }),
        ).toString('base64'),
      });
    if (url.includes('/releases?'))
      return Response.json([
        release('uno', '1.9.0'),
        { tag_name: 'unrelated-release-notes', draft: false, prerelease: false, assets: [] },
        release('uno', '1.11.0'),
        release('uno', '3.0.0', true),
        release('uno-no-mercy', '1.0.0'),
      ]);
    const match = /\/(uno(?:-no-mercy)?)-v([\d.]+)\/release.json$/.exec(url);
    if (match)
      return Response.json({
        repository,
        packages: [
          {
            gameId: `online.${match[1]}`,
            version: match[2],
            tag: `${match[1]}-v${match[2]}`,
            filename: `${match[1]}-${match[2]}.zip`,
            sha256: hash,
          },
        ],
      });
    return new Response(tamper ? 'changed bytes' : bytes);
  });
  return { source: new GitHubOfficialGameSource(transport), transport };
}
describe('official game release source', () => {
  it('discovers both UNO tags, chooses numeric latest stable and excludes builtins', async () => {
    const { source, transport } = sourceFixture();
    const items = await source.discover(new AbortController().signal);
    expect(items.map((item) => [item.gameId, item.version])).toEqual([
      ['online.uno', '1.11.0'],
      ['online.uno-no-mercy', '1.0.0'],
    ]);
    expect(await source.download(items[0]!, new AbortController().signal)).toEqual(bytes);
    expect(transport.mock.calls.some(([url]) => String(url).includes('playboard-game-azul'))).toBe(
      false,
    );
    expect(compareGameVersions('1.10.0', '1.9.9')).toBeGreaterThan(0);
  });
  it('rejects altered packages and cross-repository metadata before installation', async () => {
    const { source } = sourceFixture(true);
    const [item] = await source.discover(new AbortController().signal);
    await expect(source.download(item!, new AbortController().signal)).rejects.toThrow('校验失败');
    const { source: bad, transport } = sourceFixture();
    transport.mockResolvedValueOnce(Response.json({ platform: 'attacker/platform', games: {} }));
    await expect(bad.discover(new AbortController().signal)).rejects.toThrow();
  });
  it('blocks untrusted redirects and bounds streamed bodies without Content-Length', async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: 'http://127.0.0.1/internal' },
      }),
    );
    const source = new GitHubOfficialGameSource(transport);
    const item = {
      gameId: 'online.uno',
      version: '1.0.0',
      sha256: hash,
      url: 'https://github.com/test.zip',
    };
    await expect(source.download(item, new AbortController().signal)).rejects.toThrow('不受信任');
    expect(transport).toHaveBeenCalledTimes(1);
    const huge = new GitHubOfficialGameSource(
      vi.fn<typeof fetch>().mockResolvedValue(new Response(new Uint8Array(5 * 1024 * 1024 + 1))),
    );
    await expect(huge.download(item, new AbortController().signal)).rejects.toThrow('大小限制');
  });
});
