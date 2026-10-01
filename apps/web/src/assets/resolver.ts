import {
  canonicalAssetJson,
  packManifestSchema,
  type PackManifest,
  type AssetResolverPort,
} from "@boardgame/game-sdk/assets";

export async function verifyManifest(
  raw: unknown,
  expectedHash: string,
): Promise<PackManifest> {
  const manifest = packManifestSchema.parse(raw);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalAssetJson(manifest)),
  );
  const hash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  if (hash !== expectedHash)
    throw new Error("资源清单摘要不符，已保留原绑定并使用文字桌面。");
  return manifest;
}
export class AssetResolver implements AssetResolverPort {
  constructor(readonly manifest: PackManifest) {}
  resolveImage(key: string) {
    const asset = this.manifest.assets[key];
    return asset?.kind === "image"
      ? `/api/v1/assets/files/${asset.fileId}`
      : undefined;
  }
  resolveSound(key: string) {
    const asset = this.manifest.assets[key];
    return asset?.kind === "audio"
      ? `/api/v1/assets/files/${asset.fileId}`
      : undefined;
  }
}
