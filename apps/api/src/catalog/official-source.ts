import { createHash } from 'node:crypto';
import { z } from 'zod';
import { GAME_PACKAGE_MAX_ZIP_BYTES } from '@boardgame/protocol';

const organization = 'PlayBoardgameTogether';
const versionSchema = z.string().regex(/^\d{1,9}\.\d{1,9}\.\d{1,9}$/);
const assetSchema = z.object({
  name: z.string().max(160),
  browser_download_url: z.string().url(),
});
const releaseSchema = z.object({
  tag_name: z.string().max(160),
  draft: z.boolean(),
  prerelease: z.boolean(),
  assets: z.array(assetSchema).max(100),
});
const catalogSchema = z.object({
  platform: z.literal('PlayBoardgameTogether/PlayBoardgameTogether'),
  games: z.record(
    z.string().max(80),
    z.object({
      repository: z
        .string()
        .regex(/^playboard-game-[a-z0-9-]+$/)
        .max(100),
      kind: z.enum(['builtin']).optional(),
      assets: z
        .array(
          z.object({
            id: z
              .string()
              .regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/)
              .max(128),
            archive: z
              .string()
              .regex(/^[a-z0-9-]+$/)
              .max(80),
          }),
        )
        .min(1)
        .max(10),
    }),
  ),
});
const manifestSchema = z.object({
  repository: z.string(),
  packages: z
    .array(
      z.object({
        gameId: z.string().max(128),
        version: versionSchema,
        filename: z.string().max(160),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
        tag: z.string().max(160),
      }),
    )
    .min(1)
    .max(10),
});

export type OfficialPackage = {
  gameId: string;
  version: string;
  sha256: string;
  url: string;
};
export interface OfficialGameSource {
  discover(signal: AbortSignal): Promise<OfficialPackage[]>;
  download(item: OfficialPackage, signal: AbortSignal): Promise<Buffer>;
}
export function compareGameVersions(a: string, b: string) {
  const left = versionSchema.parse(a).split('.').map(Number);
  const right = versionSchema.parse(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i]! - right[i]!;
  return 0;
}

// No credentials, configurable URLs, archive extraction, or shell commands.
// Validate every redirect before sending another request; bound streamed bodies too.
export class GitHubOfficialGameSource implements OfficialGameSource {
  constructor(private readonly transport: typeof fetch = fetch) {}

  private async bytes(address: string, limit: number, signal: AbortSignal): Promise<Buffer> {
    const timeout = AbortSignal.any([signal, AbortSignal.timeout(20000)]);
    let url = new URL(address);
    for (let redirects = 0; redirects <= 4; redirects++) {
      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        url.port ||
        ![
          'api.github.com',
          'raw.githubusercontent.com',
          'github.com',
          'release-assets.githubusercontent.com',
          'objects.githubusercontent.com',
        ].includes(url.hostname)
      ) {
        throw new Error('订阅下载地址不受信任');
      }
      const response = await this.transport(url, {
        signal: timeout,
        redirect: 'manual',
        headers: {
          'user-agent': 'PlayBoard-Game-Subscription',
          accept:
            url.hostname === 'api.github.com'
              ? 'application/vnd.github+json'
              : 'application/octet-stream',
        },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel();
        const location = response.headers.get('location');
        if (!location) throw new Error('订阅下载重定向无效');
        url = new URL(location, url);
        continue;
      }
      if (!response.ok || !response.body) {
        await response.body?.cancel();
        throw new Error('官方目录或发布包暂时无法读取，请稍后重试');
      }
      if (Number(response.headers.get('content-length')) > limit) {
        await response.body.cancel();
        throw new Error('订阅文件超过大小限制');
      }
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let length = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.byteLength;
          if (length > limit) throw new Error('订阅文件超过大小限制');
          chunks.push(value);
        }
      } finally {
        await reader.cancel();
      }
      return Buffer.concat(chunks);
    }
    throw new Error('订阅下载重定向次数过多');
  }
  private async json(url: string, signal: AbortSignal): Promise<unknown> {
    return JSON.parse((await this.bytes(url, 512 * 1024, signal)).toString('utf8')) as unknown;
  }
  async discover(signal: AbortSignal) {
    const file = z
      .object({ encoding: z.literal('base64'), content: z.string().max(256 * 1024) })
      .parse(
        await this.json(
          `https://api.github.com/repos/${organization}/PlayBoardgameTogether/contents/scripts/game-repositories/catalog.json?ref=main`,
          signal,
        ),
      );
    const catalog = catalogSchema.parse(
      JSON.parse(Buffer.from(file.content, 'base64').toString('utf8')) as unknown,
    );
    const games = Object.values(catalog.games).filter((game) => game.kind !== 'builtin');
    if (games.length > 30) throw new Error('官方目录超过订阅数量限制');
    const result = new Map<string, OfficialPackage>();
    for (const game of games) {
      const repository = `${organization}/${game.repository}`;
      // Include separate UNO variant tags; /latest alone loses one variant.
      const releases = z
        .array(releaseSchema)
        .max(100)
        .parse(
          await this.json(
            `https://api.github.com/repos/${repository}/releases?per_page=100`,
            signal,
          ),
        );
      const found = new Set<string>();
      const stable = releases
        .filter(
          (release) =>
            !release.draft &&
            !release.prerelease &&
            game.assets.some(
              (asset) =>
                release.tag_name.startsWith(`${asset.archive}-v`) &&
                versionSchema.safeParse(release.tag_name.slice(asset.archive.length + 2)).success,
            ),
        )
        .sort((a, b) => {
          const av = /-v(\d+\.\d+\.\d+)$/.exec(a.tag_name)?.[1];
          const bv = /-v(\d+\.\d+\.\d+)$/.exec(b.tag_name)?.[1];
          return av &&
            bv &&
            versionSchema.safeParse(av).success &&
            versionSchema.safeParse(bv).success
            ? compareGameVersions(bv, av)
            : 0;
        });
      for (const release of stable) {
        if (release.draft || release.prerelease) continue;
        const candidate = game.assets.find(
          (asset) =>
            release.tag_name.startsWith(`${asset.archive}-v`) &&
            versionSchema.safeParse(release.tag_name.slice(asset.archive.length + 2)).success,
        );
        if (!candidate || found.has(candidate.id)) continue;
        const descriptor = release.assets.find((asset) => asset.name === 'release.json');
        if (!descriptor) throw new Error('官方发布缺少校验清单');
        const prefix = `https://github.com/${repository}/releases/download/${encodeURIComponent(release.tag_name)}/`;
        if (descriptor.browser_download_url !== `${prefix}release.json`)
          throw new Error('官方发布地址不匹配');
        const manifest = manifestSchema.parse(
          await this.json(descriptor.browser_download_url, signal),
        );
        if (manifest.repository !== repository) throw new Error('官方发布仓库不匹配');
        const entry = manifest.packages.find(
          (item) => item.gameId === candidate.id && item.tag === release.tag_name,
        );
        if (
          !entry ||
          entry.tag !== `${candidate.archive}-v${entry.version}` ||
          entry.filename !== `${candidate.archive}-${entry.version}.zip`
        )
          throw new Error('官方发布清单不匹配');
        const zip = release.assets.find((asset) => asset.name === entry.filename);
        if (!zip || zip.browser_download_url !== `${prefix}${entry.filename}`)
          throw new Error('官方安装包缺失');
        result.set(candidate.id, {
          gameId: entry.gameId,
          version: entry.version,
          sha256: entry.sha256,
          url: zip.browser_download_url,
        });
        found.add(candidate.id);
      }
    }
    if (result.size > 100) throw new Error('官方目录超过订阅数量限制');
    return [...result.values()];
  }
  async download(item: OfficialPackage, signal: AbortSignal) {
    const bytes = await this.bytes(item.url, GAME_PACKAGE_MAX_ZIP_BYTES, signal);
    if (createHash('sha256').update(bytes).digest('hex') !== item.sha256)
      throw new Error('官方安装包校验失败');
    return bytes;
  }
}
