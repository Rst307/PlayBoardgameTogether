import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { resolve, join } from "node:path";
import { utimes } from "node:fs/promises";
import { createAccount } from "../../apps/api/src/auth.js";
import { createApp } from "../../apps/api/src/app.js";
import { createDatabase, type Database } from "../../apps/api/src/db/index.js";
import { createRegistry } from "../../apps/api/src/registry/index.js";
import { AssetService, assetLock } from "../../apps/api/src/assets/service.js";
import {
  LocalAssetStorage,
  mediaHash,
} from "../../apps/api/src/assets/storage.js";
import { demoPng, demoWav } from "../../scripts/seed-assets.js";
import type { PackManifest } from "@boardgame/game-sdk/assets";

process.loadEnvFile(".env");
const url = process.env.TEST_DATABASE_URL,
  origin = "http://127.0.0.1:5173";
type Session = { id: string; headers: Record<string, string> };
describe.skipIf(!url)("stage 7 real assets and reference transactions", () => {
  it("retries physical GC after storage failure without removing referenced shared bytes", async () => {
    const d = await draft();
    const file = await assets.upload(
      admin.id,
      d.id,
      randomUUID(),
      "gc.wav",
      "audio/wav",
      demoWav(1234.567),
    );
    expect(file.status).toBe("validated");
    const key = (
      await db.query<{ storage_key: string }>(
        "SELECT storage_key FROM asset_files WHERE id=$1",
        [file.id],
      )
    ).rows[0]!.storage_key;
    await assets.removeDraft(admin.id, d.id, {
      requestId: randomUUID(),
      expectedDraftRevision: 0,
    });
    await assets.integrity(true);
    await db.query(
      "UPDATE asset_files SET delete_after=now()-interval '1 second' WHERE id=$1",
      [file.id],
    );
    const remove = storage.delete.bind(storage);
    storage.delete = async (candidate) => {
      if (candidate === key) throw new Error("injected storage failure");
      return remove(candidate);
    };
    try {
      await expect(assets.integrity(true)).rejects.toThrow(
        "injected storage failure",
      );
    } finally {
      storage.delete = remove;
    }
    expect(
      (await db.query("SELECT status FROM asset_files WHERE id=$1", [file.id]))
        .rows[0].status,
    ).toBe("tombstone");
    expect((await assets.integrity(true)).deleted).toContain(file.id);
    await expect(storage.get(key)).rejects.toThrow();
    expect(
      (
        await assets.readFile(
          Object.values(base.manifest.assets)[0]!.fileId,
          false,
        )
      ).bytes.length,
    ).toBeGreaterThan(0);
  });
  let db: Database,
    app: Awaited<ReturnType<typeof createApp>>,
    assets: AssetService,
    admin: Session,
    user: Session,
    other: Session,
    base: Awaited<ReturnType<AssetService["version"]>>;
  const registry = createRegistry(false),
    storage = new LocalAssetStorage(resolve(process.env.TEST_ASSET_STORAGE_DIR ?? ".data/test-assets"));
  beforeAll(async () => {
    db = createDatabase(url!);
    assets = new AssetService(db, registry, storage);
    app = await createApp({
      db,
      registry,
      config: {
        NODE_ENV: "test",
        API_HOST: "127.0.0.1",
        API_PORT: 3001,
        DATABASE_URL: url!,
        WEB_ORIGIN: origin,
        ENABLE_DEV_LAB: false,
        LOG_LEVEL: "silent",
        AI_SCAN_INTERVAL_MS: 60000,
      },
    });
    base = await assets.version((await assets.versions("color-match"))[0]!.id);
  });
  afterAll(async () => {
    await app.close();
  });
  async function login(name: string): Promise<Session> {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { origin },
      payload: { username: name, password: "stage seven password" },
    });
    const data = response.json().data;
    const raw = response.headers["set-cookie"];
    return {
      id: data.account.id,
      headers: {
        origin,
        cookie: (Array.isArray(raw) ? raw : [String(raw)])
          .map((v) => v.split(";")[0])
          .join("; "),
        "x-csrf-token": data.csrfToken,
      },
    };
  }
  beforeEach(async () => {
    await db.query("TRUNCATE accounts CASCADE");
    for (const name of ["asset_admin", "asset_user", "asset_other"])
      await createAccount(db, {
        username: name,
        displayName: name,
        password: "stage seven password",
        role: name === "asset_admin" ? "administrator" : "user",
      });
    admin = await login("asset_admin");
    user = await login("asset_user");
    other = await login("asset_other");
  });
  async function draft() {
    const manifest: PackManifest = {
      ...base.manifest,
      packId: `test-${randomUUID()}`,
      name: "测试资源",
      version: "1.0.0",
    };
    const result = await assets.create(admin.id, {
      requestId: randomUUID(),
      manifest,
      copyVersionId: base.versionId,
    });
    return assets.draft(result.id);
  }
  async function publish() {
    const d = await draft();
    const ready = await assets.validate(d.id, {
      requestId: randomUUID(),
      expectedDraftRevision: 0,
    });
    const body = {
      requestId: randomUUID(),
      expectedDraftRevision: 0,
      contentHash: ready.content_hash!,
    };
    const published = await assets.publish(admin.id, d.id, body);
    return { draft: d, body, ...published };
  }
  async function createRoom() {
    const r = await app.inject({
      method: "POST",
      url: "/api/v1/rooms",
      headers: user.headers,
      payload: {
        requestId: randomUUID(),
        name: "资源房",
        gameId: "color-match",
        version: "1.0.0",
        options: {},
        seatCount: 2,
      },
    });
    expect(r.statusCode).toBe(200);
    return r.json().data.room;
  }

  it("denies management to non-admin before creating upload objects, and checks CSRF", async () => {
    const d = await draft(),
      bytes = demoPng("card.blue.2", true),
      before = await db.query("SELECT id FROM asset_files");
    const headers = {
      ...user.headers,
      "content-type": "image/png",
      "x-file-name": "test.png",
      "x-request-id": randomUUID(),
      "x-file-size": String(bytes.length),
      "x-content-sha256": mediaHash(bytes),
    };
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/api/v1/admin/assets/drafts/${d.id}/files`,
          headers,
          payload: bytes,
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          url: `/api/v1/admin/assets/drafts/${d.id}`,
          headers: user.headers,
        })
      ).statusCode,
    ).toBe(403);
    expect((await db.query("SELECT id FROM asset_files")).rowCount).toBe(
      before.rowCount,
    );
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/api/v1/admin/assets/drafts/${d.id}/publish`,
          headers: { cookie: admin.headers.cookie! },
          payload: {},
        })
      ).statusCode,
    ).toBe(403);
  });
  it("denies every management mutation to an authenticated non-administrator without side effects", async () => {
    const p = await publish();
    const d = await draft();
    const before = await db.query(`SELECT
      (SELECT count(*) FROM asset_drafts) AS drafts,
      (SELECT count(*) FROM asset_versions) AS versions,
      (SELECT count(*) FROM asset_receipts) AS receipts,
      (SELECT count(*) FROM asset_files) AS files`);
    const operations = [
      { method: "POST", path: "drafts", payload: { requestId: randomUUID(), manifest: d.manifest } },
      { method: "PATCH", path: `drafts/${d.id}`, payload: { requestId: randomUUID(), expectedDraftRevision: 0, manifestText: JSON.stringify(d.manifest) } },
      { method: "POST", path: `drafts/${d.id}/validate`, payload: { requestId: randomUUID(), expectedDraftRevision: 0 } },
      { method: "POST", path: `drafts/${p.draft.id}/publish`, payload: p.body },
      { method: "DELETE", path: `drafts/${d.id}`, payload: { requestId: randomUUID(), expectedDraftRevision: 0 } },
      { method: "POST", path: `versions/${p.versionId}/archive`, payload: { requestId: randomUUID() } },
      { method: "DELETE", path: `versions/${p.versionId}`, payload: { requestId: randomUUID() } },
    ] as const;
    for (const operation of operations) {
      const response = await app.inject({
        method: operation.method,
        url: `/api/v1/admin/assets/${operation.path}`,
        headers: user.headers,
        payload: operation.payload,
      });
      expect(response.statusCode, operation.path).toBe(403);
    }
    expect((await db.query(`SELECT
      (SELECT count(*) FROM asset_drafts) AS drafts,
      (SELECT count(*) FROM asset_versions) AS versions,
      (SELECT count(*) FROM asset_receipts) AS receipts,
      (SELECT count(*) FROM asset_files) AS files`)).rows).toEqual(before.rows);
    expect((await assets.draft(d.id)).revision).toBe(0);
    expect((await assets.version(p.versionId)).status).toBe("published");
  });

  it("reserves file and byte quotas atomically, including the last concurrent slot", async () => {
    const d = await draft();
    const reserve = (id: string, bytes = 16, requestId = randomUUID()) =>
      assets.reserveUpload(admin.id, id, requestId, "quota.png", "image/png", "a".repeat(64), bytes);
    for (let index = 0; index < 199; index++) await reserve(d.id);
    const results = await Promise.allSettled([reserve(d.id), reserve(d.id)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const files = (await db.query<{ id: string }>("SELECT id FROM asset_files WHERE draft_id=$1", [d.id])).rows;
    expect(files).toHaveLength(200);
    await db.query("UPDATE asset_files SET status='failed' WHERE id=$1", [files[0]!.id]);
    const requestId = randomUUID();
    const replacement = await reserve(d.id, 16, requestId);
    expect(await reserve(d.id, 16, requestId)).toEqual({ ...replacement, repeated: true });
    await expect(reserve(d.id)).rejects.toThrow("配额");

    const sized = await draft();
    for (let index = 0; index < 12; index++) await reserve(sized.id, 8 * 1024 * 1024);
    await reserve(sized.id, 4 * 1024 * 1024);
    await expect(reserve(sized.id)).rejects.toThrow("配额");
    expect((await db.query("SELECT sum(reserved_bytes)::int AS bytes FROM asset_files WHERE draft_id=$1", [sized.id])).rows[0].bytes).toBe(100 * 1024 * 1024);
    // These reservations intentionally have no bodies; safe recovery must release their quota.
    await db.query("UPDATE asset_files SET updated_at=now()-interval '5 minutes' WHERE draft_id=ANY($1::uuid[])", [[d.id, sized.id]]);
    await assets.recover();
    await expect(reserve(sized.id)).resolves.toMatchObject({ repeated: false });
  }, 15000);

  it("keeps written bytes unpublishable after a database activation failure and delays orphan collection", async () => {
    const d = await draft();
    let writtenKey = "";
    const put = storage.put.bind(storage);
    storage.put = async (key, bytes) => { writtenKey = key; await put(key, bytes); };
    await db.query("CREATE FUNCTION fail_asset_activation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status='validated' THEN RAISE EXCEPTION 'activation fault'; END IF; RETURN NEW; END $$");
    await db.query("CREATE TRIGGER fail_asset_activation BEFORE UPDATE ON asset_files FOR EACH ROW EXECUTE FUNCTION fail_asset_activation()");
    try {
      const file = await assets.upload(admin.id, d.id, randomUUID(), "orphan.wav", "audio/wav", demoWav(1437.246));
      expect(file.status).toBe("failed");
      expect(writtenKey).not.toBe("");
      expect((await storage.get(writtenKey)).length).toBeGreaterThan(40);
      await expect(assets.readFile(file.id, true)).rejects.toThrow();
      const withFailed = { ...d.manifest, assets: { ...d.manifest.assets, "sound.play": { kind: "audio", fileId: file.id } } };
      await expect(assets.edit(admin.id, d.id, { requestId: randomUUID(), expectedDraftRevision: 0, manifestText: JSON.stringify(withFailed) })).rejects.toThrow("文件未通过校验");
      expect((await assets.integrity(true)).orphans).toContain(writtenKey);
      expect((await storage.get(writtenKey)).length).toBeGreaterThan(40);
      const aged = new Date(Date.now() - 25 * 60 * 60 * 1000);
      await utimes(join(storage.root, writtenKey), aged, aged);
      expect((await assets.integrity(true)).deleted).toContain(writtenKey);
      await expect(storage.get(writtenKey)).rejects.toThrow();
    } finally {
      storage.put = put;
      await db.query("DROP TRIGGER fail_asset_activation ON asset_files");
      await db.query("DROP FUNCTION fail_asset_activation()");
    }
  });

  it("stores and recovers real bytes, makes upload idempotent and rejects content reuse", async () => {
    const d = await draft(),
      bytes = demoPng("card.blue.4", true),
      requestId = randomUUID();
    const headers = {
      ...admin.headers,
      "content-type": "image/png",
      "x-file-name": "%E5%9B%BE%E7%89%87.png",
      "x-request-id": requestId,
      "x-file-size": String(bytes.length),
      "x-content-sha256": mediaHash(bytes),
    };
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/admin/assets/drafts/${d.id}/files`,
      headers,
      payload: bytes,
    });
    expect(response.statusCode).toBe(200);
    const file = response.json().data;
    expect(file.status).toBe("validated");
    const repeated = await app.inject({
      method: "POST",
      url: `/api/v1/admin/assets/drafts/${d.id}/files`,
      headers,
      payload: bytes,
    });
    expect(repeated.json().data.id).toBe(file.id);
    await expect(
      assets.upload(
        admin.id,
        d.id,
        requestId,
        "different.png",
        "image/png",
        bytes,
      ),
    ).rejects.toThrow("requestId");
    const restarted = new AssetService(
      db,
      createRegistry(false),
      new LocalAssetStorage(storage.root),
    );
    expect(
      (await restarted.readFile(file.id, true)).bytes.length,
    ).toBeGreaterThan(100);
    expect(
      (
        await app.inject({
          url: `/api/v1/assets/files/${file.id}`,
          headers: user.headers,
        })
      ).statusCode,
    ).toBe(404);
    const read = await app.inject({
      url: `/api/v1/assets/files/${file.id}`,
      headers: admin.headers,
    });
    expect(read.headers["cache-control"]).toContain("private");
    expect(read.headers["x-content-type-options"]).toBe("nosniff");
    expect(
      (
        await app.inject({
          url: `/api/v1/assets/files/${file.id}`,
          headers: { "if-none-match": String(read.headers.etag) },
        })
      ).statusCode,
    ).toBe(401);
    const bad = await assets.upload(
      admin.id,
      d.id,
      randomUUID(),
      "bad.png",
      "image/png",
      Buffer.from("<html>not a png</html>"),
    );
    expect(bad.status).toBe("failed");
    expect(
      (await assets.files(d.id)).find((f) => f.id === file.id)?.status,
    ).toBe("validated");
  });
  it("invalidates reports, rejects unsafe JSON, and permits optional silence", async () => {
    const d = await draft();
    await assets.validate(d.id, {
      requestId: randomUUID(),
      expectedDraftRevision: 0,
    });
    await expect(
      assets.edit(admin.id, d.id, {
        requestId: randomUUID(),
        expectedDraftRevision: 0,
        manifestText: '{"a":1,"a":2}',
      }),
    ).rejects.toThrow();
    const manifest = {
      ...d.manifest,
      assets: { ...d.manifest.assets },
      sounds: {},
    };
    delete manifest.assets["card.red.1"];
    const edited = await assets.edit(admin.id, d.id, {
      requestId: randomUUID(),
      expectedDraftRevision: 0,
      manifestText: JSON.stringify(manifest),
    });
    expect(edited.content_hash).toBeNull();
    const invalid = await assets.validate(d.id, {
      requestId: randomUUID(),
      expectedDraftRevision: 1,
    });
    expect(invalid.report.errors.join()).toContain("card.red.1");
    await assets.edit(admin.id, d.id, {
      requestId: randomUUID(),
      expectedDraftRevision: 1,
      manifestText: JSON.stringify({ ...d.manifest, sounds: {} }),
    });
    expect(
      (
        await assets.validate(d.id, {
          requestId: randomUUID(),
          expectedDraftRevision: 2,
        })
      ).status,
    ).toBe("ready");
  });
  it("serializes edit versus publish, preserves immutable versions and recovers publish receipts", async () => {
    const d = await draft(),
      ready = await assets.validate(d.id, {
        requestId: randomUUID(),
        expectedDraftRevision: 0,
      });
    const command = {
      requestId: randomUUID(),
      expectedDraftRevision: 0,
      contentHash: ready.content_hash!,
    };
    const barrier = await db.connect();
    await barrier.query("BEGIN");
    await assetLock(barrier);
    const editing = assets.edit(admin.id, d.id, {
      requestId: randomUUID(),
      expectedDraftRevision: 0,
      manifestText: JSON.stringify({ ...d.manifest, name: "修改后" }),
    });
    const publishing = assets.publish(admin.id, d.id, command);
    await barrier.query("COMMIT");
    barrier.release();
    const results = await Promise.allSettled([editing, publishing]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const p = await publish();
    expect(await assets.publish(admin.id, p.draft.id, p.body)).toEqual({
      versionId: p.versionId,
    });
    await expect(
      db.query(
        'UPDATE asset_versions SET manifest=manifest||\'{"name":"corrupt"}\'::jsonb WHERE id=$1',
        [p.versionId],
      ),
    ).rejects.toThrow("immutable");
    await expect(
      assets.publish(admin.id, p.draft.id, {
        ...p.body,
        contentHash: "0".repeat(64),
      }),
    ).rejects.toThrow("requestId");
  });
  it("rolls back a failed publication and leaves no half version", async () => {
    const d = await draft(),
      ready = await assets.validate(d.id, {
        requestId: randomUUID(),
        expectedDraftRevision: 0,
      });
    await db.query(
      "CREATE FUNCTION fail_asset_publish() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'asset test fault'; END $$",
    );
    await db.query(
      "CREATE TRIGGER fail_asset_publish BEFORE INSERT ON asset_version_files FOR EACH ROW EXECUTE FUNCTION fail_asset_publish()",
    );
    try {
      await expect(
        assets.publish(admin.id, d.id, {
          requestId: randomUUID(),
          expectedDraftRevision: 0,
          contentHash: ready.content_hash!,
        }),
      ).rejects.toThrow("asset test fault");
      expect(
        (
          await db.query("SELECT id FROM asset_versions WHERE pack_id=$1", [
            d.manifest.packId,
          ])
        ).rowCount,
      ).toBe(0);
      expect((await assets.draft(d.id)).status).toBe("ready");
    } finally {
      await db.query("DROP TRIGGER fail_asset_publish ON asset_version_files");
      await db.query("DROP FUNCTION fail_asset_publish()");
    }
  });
  it("locks selected versions, clears readiness and blocks deletion across finished and aborted history", async () => {
    const p = await publish();
    let room = await createRoom();
    const cmd = async (
      path: string,
      extra = {},
      session = user,
      method: "POST" | "PUT" = "PUT",
    ) =>
      app.inject({
        method,
        url: `/api/v1/rooms/${room.id}/${path}`,
        headers: session.headers,
        payload: {
          requestId: randomUUID(),
          expectedRoomRevision: room.roomRevision,
          ...extra,
        },
      });
    room = (await cmd("my-ready", { ready: true })).json().data;
    expect(
      (await cmd("assets", { versionId: p.versionId }, other)).statusCode,
    ).toBe(404);
    room = (await cmd("assets", { versionId: p.versionId })).json().data;
    expect(room.seats[0].ready).toBe(false);
    await assets.archive(admin.id, p.versionId, { requestId: randomUUID() });
    expect(
      (await assets.versions("color-match")).some((v) => v.id === p.versionId),
    ).toBe(false);
    await expect(
      assets.remove(admin.id, p.versionId, { requestId: randomUUID() }),
    ).rejects.toThrow("引用");
    room = (
      await cmd(`seats/${room.seats[1].seatId}/bot`, { policyId: "basic-v1" })
    ).json().data;
    room = (await cmd("my-ready", { ready: true })).json().data;
    const started = await cmd("start", {}, user, "POST");
    expect(started.statusCode).toBe(200);
    const matchId = started.json().data.matchId;
    const view = await app.inject({
      url: `/api/v1/matches/${matchId}/view`,
      headers: user.headers,
    });
    expect(view.json().data.assetBinding.versionId).toBe(p.versionId);
    const state = (
      await db.query(
        "SELECT state,rng_state,revision FROM matches WHERE id=$1",
        [matchId],
      )
    ).rows[0];
    await publish();
    expect(
      (
        await db.query(
          "SELECT state,rng_state,revision FROM matches WHERE id=$1",
          [matchId],
        )
      ).rows[0],
    ).toEqual(state);
    await db.query("UPDATE matches SET status='finished' WHERE id=$1", [
      matchId,
    ]);
    await expect(
      assets.remove(admin.id, p.versionId, { requestId: randomUUID() }),
    ).rejects.toThrow("引用");
    await db.query("UPDATE rooms SET status='closed' WHERE id=$1", [room.id]);
    await db.query("UPDATE matches SET status='aborted' WHERE id=$1", [
      matchId,
    ]);
    await expect(
      assets.remove(admin.id, p.versionId, { requestId: randomUUID() }),
    ).rejects.toThrow("引用");
    expect(
      (
        await assets.readFile(
          Object.values(p.draft.manifest.assets)[0]!.fileId,
          false,
        )
      ).bytes.length,
    ).toBeGreaterThan(0);
  });
  it("serializes deletion against copying and protects shared files during GC retries", async () => {
    const p = await publish();
    await assets.removeDraft(admin.id, p.draft.id, {
      requestId: randomUUID(),
      expectedDraftRevision: 0,
    });
    const barrier = await db.connect();
    await barrier.query("BEGIN");
    await assetLock(barrier);
    const removal = assets.remove(admin.id, p.versionId, {
      requestId: randomUUID(),
    });
    const copying = assets.create(admin.id, {
      requestId: randomUUID(),
      manifest: { ...p.draft.manifest, packId: `copy-${randomUUID()}` },
      copyVersionId: p.versionId,
    });
    await barrier.query("COMMIT");
    barrier.release();
    const result = await Promise.allSettled([removal, copying]);
    expect(result[0].status).toBe("fulfilled");
    // If copy won the lock, its explicit draft refs protect the bytes; otherwise it is rejected.
    await assets.integrity(true);
    await assets.integrity(true);
    expect(
      (
        await assets.readFile(
          Object.values(base.manifest.assets)[0]!.fileId,
          false,
        )
      ).bytes.length,
    ).toBeGreaterThan(0);
  });
  it("fails abandoned processing jobs safely and reports missing files without changing game state", async () => {
    const d = await draft(),
      bytes = demoPng("card.green.5", true);
    const reserved = await assets.reserveUpload(
      admin.id,
      d.id,
      randomUUID(),
      "aborted.png",
      "image/png",
      mediaHash(bytes),
      bytes.length,
    );
    await db.query(
      "UPDATE asset_files SET updated_at=now()-interval '5 minutes' WHERE id=$1",
      [reserved.fileId],
    );
    await assets.recover();
    expect(
      (await assets.files(d.id)).find((file) => file.id === reserved.fileId)
        ?.status,
    ).toBe("failed");
    const file = await assets.upload(
      admin.id,
      d.id,
      randomUUID(),
      "unique.png",
      "image/png",
      bytes,
    );
    const row = (
      await db.query<{ storage_key: string }>(
        "SELECT storage_key FROM asset_files WHERE id=$1",
        [file.id],
      )
    ).rows[0]!;
    const original = await storage.get(row.storage_key);
    await storage.delete(row.storage_key);
    try {
      expect((await assets.integrity()).unreadable).toContain(file.id);
    } finally {
      await storage.put(row.storage_key, original);
    }
  });
});
