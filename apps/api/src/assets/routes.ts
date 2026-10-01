import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import type { AuthService } from "../auth.js";
import { AppError } from "../errors.js";
import type { AssetService } from "./service.js";

export async function registerAssetRoutes(
  app: FastifyInstance,
  auth: AuthService,
  assets: AssetService,
) {
  const ok = (request: FastifyRequest, data: unknown) => ({
    ok: true,
    data,
    traceId: request.id,
  });
  const identity = async (
    request: FastifyRequest,
    write = false,
    admin = false,
  ) => {
    if (write) auth.assertOrigin(request);
    const session = await auth.authenticate(request);
    if (!session) throw new AppError("UNAUTHENTICATED", "请先登录", 401);
    if (write) auth.assertCsrf(request, session);
    if (admin && session.account.role !== "administrator")
      throw new AppError("FORBIDDEN", "需要管理员权限", 403);
    return session;
  };
  const id = (request: FastifyRequest) =>
    z.object({ id: z.string().uuid() }).parse(request.params).id;
  const uploads = new Map<string, number[]>();
  const receiving = new Set<string>();
  const recovery = setInterval(() => {
    void assets.recover().catch(() => undefined);
  }, 60000);
  recovery.unref();
  app.addHook("onReady", async () => {
    await assets.recover().catch(() => undefined);
  });
  app.addHook("onClose", async () => {
    clearInterval(recovery);
  });
  app.addHook("onResponse", async (request) => {
    receiving.delete(request.id);
  });
  app.addHook("onRequestAbort", async (request) => {
    receiving.delete(request.id);
  });
  app.addContentTypeParser(
    ["image/png", "image/jpeg", "image/webp", "audio/wav", "audio/mpeg"],
    { parseAs: "buffer", bodyLimit: 8 * 1024 * 1024 },
    (_request, body, done) => done(null, body),
  );
  app.get("/api/v1/assets/contracts", async (request) => {
    await identity(request);
    return ok(request, assets.contracts());
  });
  app.get("/api/v1/assets/versions", async (request) => {
    await identity(request);
    const query = z
      .object({ gameId: z.string().max(128).optional() })
      .parse(request.query);
    return ok(request, await assets.versions(query.gameId));
  });
  app.get("/api/v1/assets/versions/:id", async (request) => {
    await identity(request);
    return ok(request, await assets.version(id(request)));
  });
  app.get("/api/v1/assets/files/:id", async (request, reply) => {
    const current = await identity(request);
    const file = await assets.readFile(
      id(request),
      current.account.role === "administrator",
    );
    reply
      .type(file.mediaType)
      .header("x-content-type-options", "nosniff")
      .header("cache-control", "private, max-age=0, must-revalidate")
      .header("etag", `"${file.hash}"`)
      .header("content-length", file.bytes.length);
    if (request.headers["if-none-match"] === `"${file.hash}"`)
      return reply.code(304).send();
    return reply.send(file.bytes);
  });
  app.get("/api/v1/admin/assets/versions", async (request) => {
    await identity(request, false, true);
    return ok(request, await assets.versions(undefined, true));
  });
  app.get("/api/v1/admin/assets/drafts", async (request) => {
    await identity(request, false, true);
    return ok(request, await assets.listDrafts());
  });
  app.post(
    "/api/v1/admin/assets/drafts",
    { bodyLimit: 300 * 1024 },
    async (request) => {
      const current = await identity(request, true, true);
      return ok(request, await assets.create(current.account.id, request.body));
    },
  );
  app.get("/api/v1/admin/assets/drafts/:id", async (request) => {
    await identity(request, false, true);
    return ok(request, await assets.draft(id(request)));
  });
  app.get("/api/v1/admin/assets/drafts/:id/files", async (request) => {
    await identity(request, false, true);
    return ok(request, await assets.files(id(request)));
  });
  app.patch(
    "/api/v1/admin/assets/drafts/:id",
    { bodyLimit: 600 * 1024 },
    async (request) => {
      const current = await identity(request, true, true);
      return ok(
        request,
        await assets.edit(current.account.id, id(request), request.body),
      );
    },
  );
  app.post("/api/v1/admin/assets/drafts/:id/validate", async (request) => {
    await identity(request, true, true);
    return ok(request, await assets.validate(id(request), request.body));
  });
  app.post("/api/v1/admin/assets/drafts/:id/publish", async (request) => {
    const current = await identity(request, true, true);
    return ok(
      request,
      await assets.publish(current.account.id, id(request), request.body),
    );
  });
  app.delete("/api/v1/admin/assets/drafts/:id", async (request) => {
    const current = await identity(request, true, true);
    return ok(
      request,
      await assets.removeDraft(current.account.id, id(request), request.body),
    );
  });
  app.post("/api/v1/admin/assets/versions/:id/archive", async (request) => {
    const current = await identity(request, true, true);
    return ok(
      request,
      await assets.archive(current.account.id, id(request), request.body),
    );
  });
  app.delete("/api/v1/admin/assets/versions/:id", async (request) => {
    const current = await identity(request, true, true);
    return ok(
      request,
      await assets.remove(current.account.id, id(request), request.body),
    );
  });
  app.post(
    "/api/v1/admin/assets/drafts/:id/files",
    {
      bodyLimit: 8 * 1024 * 1024,
      onRequest: async (request) => {
        const current = await identity(request, true, true);
        if (receiving.size >= 4)
          throw new AppError("RATE_LIMITED", "上传处理中，请稍后重试", 429);
        const times = (uploads.get(current.account.id) ?? []).filter(
          (at) => at > Date.now() - 60_000,
        );
        if (times.length >= 60)
          throw new AppError("RATE_LIMITED", "上传过于频繁", 429);
        times.push(Date.now());
        uploads.set(current.account.id, times);
        if (uploads.size > 1000)
          for (const [key, value] of uploads)
            if (value.at(-1)! < Date.now() - 60_000) uploads.delete(key);
        const requestId = z
          .string()
          .min(1)
          .max(128)
          .parse(request.headers["x-request-id"]);
        let name: string;
        try {
          name = decodeURIComponent(
            z.string().max(1000).parse(request.headers["x-file-name"]),
          );
        } catch {
          throw new AppError("VALIDATION_ERROR", "文件名无效", 400);
        }
        const size = Number(request.headers["x-file-size"]),
          mime = String(request.headers["content-type"]).split(";")[0]!;
        if (
          request.headers["content-length"] &&
          Number(request.headers["content-length"]) !== size
        )
          throw new AppError("VALIDATION_ERROR", "文件长度不符", 400);
        await assets.reserveUpload(
          current.account.id,
          id(request),
          requestId,
          name,
          mime,
          String(request.headers["x-content-sha256"]),
          size,
        );
        receiving.add(request.id);
      },
    },
    async (request) => {
      const current = await identity(request, true, true);
      if (!Buffer.isBuffer(request.body))
        throw new AppError("VALIDATION_ERROR", "需要原始媒体字节", 400);
      const requestId = z
        .string()
        .min(1)
        .max(128)
        .parse(request.headers["x-request-id"]);
      let name: string;
      try {
        name = decodeURIComponent(
          z.string().max(1000).parse(request.headers["x-file-name"]),
        );
      } catch {
        throw new AppError("VALIDATION_ERROR", "文件名无效", 400);
      }
      return ok(
        request,
        await assets.upload(
          current.account.id,
          id(request),
          requestId,
          name,
          String(request.headers["content-type"]).split(";")[0]!,
          request.body,
        ),
      );
    },
  );
}
