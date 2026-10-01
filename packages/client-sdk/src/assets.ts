import { z } from "zod";
import {
  packManifestSchema,
  assetContractSchema,
} from "@boardgame/game-sdk/assets";
import {
  assetFileSchema,
  assetVersionInfoSchema,
} from "@boardgame/protocol/assets";

export const draftSchema = z.object({
  id: z.string().uuid(),
  manifest: packManifestSchema,
  revision: z.number().int(),
  status: z.enum(["draft", "validating", "ready", "published"]),
  content_hash: z.string().nullable(),
  report: z.object({
    errors: z.string().array(),
    warnings: z.string().array(),
  }),
});
export type AssetDraft = z.infer<typeof draftSchema>;
export const versionSchema = z.object({
  versionId: z.string().uuid(),
  manifest: packManifestSchema,
  manifestHash: z.string(),
  status: z.string(),
  builtin: z.boolean(),
});
export type AssetVersion = z.infer<typeof versionSchema>;
type Request = (path: string, init?: RequestInit) => Promise<unknown>;
export class AssetClient {
  constructor(private request: Request) {}
  contracts() {
    return this.request("/assets/contracts").then((value) =>
      z
        .array(z.object({ contract: assetContractSchema, hash: z.string() }))
        .parse(value),
    );
  }
  versions(gameId?: string, admin = false) {
    return this.request(
      admin
        ? "/admin/assets/versions"
        : `/assets/versions${gameId ? `?gameId=${encodeURIComponent(gameId)}` : ""}`,
    ).then((value) => assetVersionInfoSchema.array().parse(value));
  }
  version(id: string) {
    return this.request(`/assets/versions/${encodeURIComponent(id)}`).then(
      (value) => versionSchema.parse(value),
    );
  }
  drafts() {
    return this.request("/admin/assets/drafts").then((value) =>
      draftSchema.array().parse(value),
    );
  }
  draft(id: string) {
    return this.request(`/admin/assets/drafts/${encodeURIComponent(id)}`).then(
      (value) => draftSchema.parse(value),
    );
  }
  files(id: string) {
    return this.request(
      `/admin/assets/drafts/${encodeURIComponent(id)}/files`,
    ).then((value) => assetFileSchema.array().parse(value));
  }
  create(body: {
    requestId: string;
    manifest: z.infer<typeof packManifestSchema>;
    copyVersionId?: string;
  }) {
    return this.request("/admin/assets/drafts", {
      method: "POST",
      body: JSON.stringify(body),
    }).then((value) => z.object({ id: z.string().uuid() }).parse(value));
  }
  edit(
    id: string,
    body: {
      requestId: string;
      expectedDraftRevision: number;
      manifestText: string;
    },
  ) {
    return this.request(`/admin/assets/drafts/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then((value) => draftSchema.parse(value));
  }
  validate(
    id: string,
    body: { requestId: string; expectedDraftRevision: number },
  ) {
    return this.request(
      `/admin/assets/drafts/${encodeURIComponent(id)}/validate`,
      { method: "POST", body: JSON.stringify(body) },
    ).then((value) => draftSchema.parse(value));
  }
  publish(
    id: string,
    body: {
      requestId: string;
      expectedDraftRevision: number;
      contentHash: string;
    },
  ) {
    return this.request(
      `/admin/assets/drafts/${encodeURIComponent(id)}/publish`,
      { method: "POST", body: JSON.stringify(body) },
    ).then((value) => z.object({ versionId: z.string().uuid() }).parse(value));
  }
  async archive(id: string) {
    await this.request(
      `/admin/assets/versions/${encodeURIComponent(id)}/archive`,
      {
        method: "POST",
        body: JSON.stringify({ requestId: crypto.randomUUID() }),
      },
    );
  }
  async remove(id: string) {
    await this.request(`/admin/assets/versions/${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: JSON.stringify({ requestId: crypto.randomUUID() }),
    });
  }
  async removeDraft(id: string, revision: number) {
    await this.request(`/admin/assets/drafts/${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: JSON.stringify({
        requestId: crypto.randomUUID(),
        expectedDraftRevision: revision,
      }),
    });
  }
  async upload(
    id: string,
    file: File,
    signal: AbortSignal,
    requestId = crypto.randomUUID(),
  ) {
    if (file.size > 8 * 1024 * 1024) throw new Error("文件超过 8 MiB");
    const digest = await crypto.subtle.digest(
      "SHA-256",
      await file.arrayBuffer(),
    );
    const hash = Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    return this.request(
      `/admin/assets/drafts/${encodeURIComponent(id)}/files`,
      {
        method: "POST",
        body: file,
        signal,
        headers: {
          "content-type": file.type === "audio/x-wav" ? "audio/wav" : file.type,
          "x-file-name": encodeURIComponent(file.name),
          "x-request-id": requestId,
          "x-content-sha256": hash,
          "x-file-size": String(file.size),
        },
      },
    ).then((value) => assetFileSchema.parse(value));
  }
}
