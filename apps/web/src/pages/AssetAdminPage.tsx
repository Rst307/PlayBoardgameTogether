import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AssetDraft } from "@boardgame/client-sdk";
import type { AssetFile, AssetVersionInfo } from "@boardgame/protocol/assets";
import {
  type AssetContract,
  type PackManifest,
  parseAssetJson,
  packManifestSchema,
} from "@boardgame/game-sdk/assets";
import { api, command } from "../platform.js";
import { AssetResolver } from "../assets/resolver.js";
import { AudioManager } from "../assets/audio-manager.js";
import { assetPreviews } from "../game-registry.js";
import { AdminLayout } from './admin/AdminLayout.js';

export function AssetAdminPage() {
  return (
    <AdminLayout
      path="/admin/assets"
      title="图片与短音效"
      description="上传、映射、校验，再发布一个不可变版本。"
    >
      <AssetWorkspace />
    </AdminLayout>
  );
}

function AssetWorkspace() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<AssetDraft[]>([]),
    [versions, setVersions] = useState<AssetVersionInfo[]>([]);
  const [contracts, setContracts] = useState<
    Array<{ contract: AssetContract; hash: string }>
  >([]);
  const [draft, setDraft] = useState<AssetDraft>(),
    [manifest, setManifest] = useState<PackManifest>(),
    [files, setFiles] = useState<AssetFile[]>([]);
  const [json, setJson] = useState(""),
    [uploadStatus, setUploadStatus] = useState(""),
    [preview, setPreview] = useState<ReactNode>(),
    [previewRevision, setPreviewRevision] = useState<number>();
  const [previewVolume, setPreviewVolume] = useState(0.3);
  const upload = useRef<AbortController | undefined>(undefined),
    audio = useRef(new AudioManager());
  const contract = contracts.find(
    (item) => item.contract.gameId === manifest?.gameId,
  )?.contract;
  async function reload() {
    const [ds, vs] = await Promise.all([
      api.assets.drafts(),
      api.assets.versions(undefined, true),
    ]);
    setDrafts(ds);
    setVersions(vs);
  }
  function select(value: AssetDraft) {
    setDraft(value);
    setManifest(value.manifest);
    setJson(JSON.stringify(value.manifest, null, 2));
    setPreview(undefined);
    setPreviewRevision(undefined);
    audio.current.clear();
  }
  async function open(id: string) {
    const [value, fs] = await Promise.all([
      api.assets.draft(id),
      api.assets.files(id),
    ]);
    select(value);
    setFiles(fs);
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let disposed = false;
    void api.assets.contracts()
      .then(async (contracts) => {
        if (disposed) return;
        setContracts(contracts);
        await reload();
      })
      .catch((cause) => {
        if (!disposed)
          setError(cause instanceof Error ? cause.message : "读取失败");
      });
    const manager = audio.current;
    const hide = () => {
      if (document.hidden) manager.invalidate();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      disposed = true;
      upload.current?.abort();
      manager.dispose();
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  const change = (value: PackManifest) => {
    setManifest(value);
    setJson(JSON.stringify(value, null, 2));
    setPreview(undefined);
    setPreviewRevision(undefined);
    audio.current.invalidate();
  };
  async function create(form: HTMLFormElement) {
    const data = new FormData(form),
      game = contracts.find(
        (item) => item.contract.gameId === String(data.get("gameId")),
      );
    if (!game) throw new Error("请选择游戏");
    const copy = String(data.get("copy") ?? "");
    const manifest: PackManifest = {
      schemaVersion: 1,
      packId: String(data.get("packId")),
      version: String(data.get("version")),
      gameId: game.contract.gameId,
      name: String(data.get("name")),
      author: String(data.get("author")),
      source: String(data.get("source")),
      license: String(data.get("license")),
      assetContract: {
        id: game.contract.id,
        version: game.contract.version,
        hash: game.hash,
      },
      assets: {},
      sounds: {},
    };
    const made = await api.assets.create({
      requestId: command(),
      manifest,
      ...(copy ? { copyVersionId: copy } : {}),
    });
    await reload();
    await open(made.id);
  }
  async function save() {
    if (!draft || !manifest) return;
    const saved = await api.assets.edit(draft.id, {
      requestId: command(),
      expectedDraftRevision: draft.revision,
      manifestText: JSON.stringify(manifest),
    });
    select(saved);
    await reload();
  }
  async function uploadFiles(list: FileList) {
    if (!draft) return;
    const controller = new AbortController();
    upload.current = controller;
    let done = 0;
    try {
      for (const file of Array.from(list)) {
        if (controller.signal.aborted) break;
        setUploadStatus(
          `正在上传并校验 ${file.name}（${done}/${list.length}）`,
        );
        await api.assets.upload(draft.id, file, controller.signal);
        done++;
        setFiles(await api.assets.files(draft.id));
      }
      setUploadStatus(
        controller.signal.aborted
          ? "上传已取消，请刷新文件状态确认服务端结果。"
          : `已处理 ${done} 个文件；请检查各文件状态。`,
      );
    } catch (cause) {
      setUploadStatus(
        controller.signal.aborted
          ? "上传已取消，请刷新文件状态。"
          : "上传失败，已成功文件仍保留。",
      );
      throw cause;
    } finally {
      upload.current = undefined;
    }
  }
  async function showPreview() {
    if (!draft || !manifest) return;
    const loader = assetPreviews[manifest.gameId];
    if (!loader) throw new Error("该游戏尚未声明固定预览");
    setPreview((await loader())(new AssetResolver(manifest)));
    setPreviewRevision(draft.revision);
  }
  const unsaved =
    !!draft &&
    !!manifest &&
    JSON.stringify(draft.manifest) !== JSON.stringify(manifest);
  return (
    <>
      {error && (
        <p className="error-notice" role="alert">
          {error}
        </p>
      )}
          <section className="panel">
            <h2>已发布资源</h2>
            <div className="asset-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>资源包</th>
                    <th>状态</th>
                    <th>引用</th>
                    <th>管理</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((version) => (
                    <tr key={version.id}>
                      <td>
                        {version.name}
                        <br />
                        {version.packId}@{version.version}
                      </td>
                      <td>{version.status}</td>
                      <td>{version.references ?? 0}</td>
                      <td>
                        {!version.builtin && (
                          <>
                            <button
                              disabled={busy || version.status === "archived"}
                              onClick={() =>
                                void run(async () => {
                                  await api.assets.archive(version.id);
                                  await reload();
                                })
                              }
                            >
                              归档
                            </button>
                            <button
                              className="danger"
                              disabled={busy || (version.references ?? 0) > 0}
                              onClick={() => {
                                if (
                                  confirm(
                                    `删除 ${version.packId}@${version.version}？引用数 ${version.references ?? 0}。字节将在延迟清理后删除。`,
                                  )
                                )
                                  void run(async () => {
                                    await api.assets.remove(version.id);
                                    await reload();
                                  });
                              }}
                            >
                              删除
                            </button>
                            {(version.references ?? 0) > 0 && (
                              <span>保留对局或房间引用中，只能归档</span>
                            )}
                          </>
                        )}
                        {version.builtin && "内置 · 不可删除"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <details className="panel">
            <summary>创建资源草稿</summary>
            <form
              className="asset-form"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                void run(() => create(form));
              }}
            >
              <label>
                游戏
                <select name="gameId">
                  {contracts.map((item) => (
                    <option key={item.contract.gameId}>
                      {item.contract.gameId}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                包 ID
                <input
                  name="packId"
                  required
                  pattern="[a-z0-9][a-z0-9.-]*"
                  maxLength={128}
                  placeholder="my-color-theme"
                />
              </label>
              <label>
                版本
                <input name="version" required defaultValue="1.0.0" />
              </label>
              <label>
                显示名称
                <input name="name" required maxLength={80} />
              </label>
              <label>
                作者
                <input name="author" required maxLength={120} />
              </label>
              <label>
                来源
                <input name="source" required maxLength={500} />
              </label>
              <label>
                许可
                <input
                  name="license"
                  required
                  maxLength={500}
                  defaultValue="CC0-1.0"
                />
              </label>
              <label>
                复制现有映射
                <select name="copy">
                  <option value="">空白映射</option>
                  {versions.map((version) => (
                    <option value={version.id} key={version.id}>
                      {version.name} · {version.version}
                    </option>
                  ))}
                </select>
              </label>
              <button disabled={busy}>创建草稿</button>
            </form>
          </details>
          <section className="panel">
            <h2>草稿</h2>
            <div className="asset-draft-list">
              {drafts.map((item) => (
                <button
                  className="secondary"
                  key={item.id}
                  disabled={busy}
                  onClick={() => void run(() => open(item.id))}
                >
                  {item.manifest.name} · {item.manifest.version} · {item.status}
                </button>
              ))}
            </div>
          </section>
          {draft && manifest && (
            <section className="panel asset-editor">
              <h2>
                {manifest.name} · {manifest.version}
              </h2>
              <p>
                {manifest.packId} · 契约 {manifest.assetContract.id}@
                {manifest.assetContract.version} · 草稿 {draft.revision}
              </p>
              <p>
                {files.length} 个可用/上传记录 ·{" "}
                {Math.round(
                  files.reduce((sum, file) => sum + file.bytes, 0) / 1024,
                )}{" "}
                KiB
              </p>
              <label>
                上传图片或短音效
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,audio/mpeg,audio/wav"
                  disabled={busy || draft.status === "published"}
                  onChange={(event) => {
                    if (event.target.files) {
                      const list = event.target.files;
                      void run(() => uploadFiles(list));
                    }
                  }}
                />
              </label>
              {uploadStatus && <p role="status">{uploadStatus}</p>}
              {busy && upload.current && (
                <button onClick={() => upload.current?.abort()}>
                  取消上传
                </button>
              )}
              <div className="asset-file-grid">
                {files.map((file) => (
                  <article key={file.id}>
                    <strong>{file.originalName}</strong>
                    <p>
                      {file.status} · {file.bytes} bytes
                    </p>
                    {file.error && <p className="error-notice">{file.error}</p>}
                    {file.status === "validated" &&
                      (file.kind === "image" ? (
                        <img
                          src={`/api/v1/assets/files/${file.id}`}
                          alt={file.originalName}
                          loading="lazy"
                        />
                      ) : (
                        <button
                          onClick={() =>
                            void audio.current
                              .unlock()
                              .then(() =>
                                audio.current.playFile(
                                  `/api/v1/assets/files/${file.id}`,
                                ),
                              )
                          }
                        >
                          试听 {file.originalName}
                        </button>
                      ))}
                    <small>
                      {file.metadata.width
                        ? `${file.metadata.width} × ${file.metadata.height}`
                        : `${file.metadata.durationMs ?? 0} ms`}
                    </small>
                  </article>
                ))}
              </div>
              <h3>映射表</h3>
              <div className="asset-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>槽位</th>
                      <th>要求</th>
                      <th>文件</th>
                      <th>媒体信息</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contract?.slots.map((slot) => {
                      const file = files.find(
                        (file) => file.id === manifest.assets[slot.key]?.fileId,
                      );
                      return (
                        <tr key={slot.key}>
                          <td>
                            {slot.label}
                            <br />
                            <code>{slot.key}</code>
                          </td>
                          <td>
                            {slot.kind} · {slot.required ? "必需" : "可选"}
                          </td>
                          <td>
                            <select
                              aria-label={slot.key}
                              disabled={busy || draft.status === "published"}
                              value={manifest.assets[slot.key]?.fileId ?? ""}
                              onChange={(event) => {
                                const assets = { ...manifest.assets };
                                if (event.target.value)
                                  assets[slot.key] = {
                                    kind: slot.kind,
                                    fileId: event.target.value,
                                  };
                                else delete assets[slot.key];
                                change({ ...manifest, assets });
                              }}
                            >
                              <option value="">
                                {slot.required ? "缺失" : "静音 / 无"}
                              </option>
                              {files
                                .filter(
                                  (file) =>
                                    file.status === "validated" &&
                                    file.kind === slot.kind,
                                )
                                .map((file) => (
                                  <option key={file.id} value={file.id}>
                                    {file.originalName}
                                  </option>
                                ))}
                            </select>
                          </td>
                          <td>
                            {file
                              ? file.kind === "image"
                                ? `${file.metadata.width} × ${file.metadata.height}`
                                : `${file.metadata.durationMs} ms`
                              : slot.required
                                ? "缺少必需资源"
                                : "可省略"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <h3>声音事件</h3>
              {contract?.cues.map((cue) => (
                <label key={cue.id}>
                  {cue.id}
                  <select
                    aria-label={cue.id}
                    disabled={busy || draft.status === "published"}
                    value={manifest.sounds[cue.id]?.assetKey ?? ""}
                    onChange={(event) => {
                      const sounds = { ...manifest.sounds };
                      if (event.target.value)
                        sounds[cue.id] = {
                          assetKey: event.target.value,
                          gain: 0.7,
                          cooldownMs: 100,
                        };
                      else delete sounds[cue.id];
                      change({ ...manifest, sounds });
                    }}
                  >
                    <option value="">静音</option>
                    {contract.slots
                      .filter(
                        (slot) =>
                          slot.kind === "audio" && manifest.assets[slot.key],
                      )
                      .map((slot) => (
                        <option key={slot.key}>{slot.key}</option>
                      ))}
                  </select>
                </label>
              ))}
              <details>
                <summary>JSON 映射导入 / 编辑</summary>
                <textarea
                  aria-label="JSON 映射"
                  rows={16}
                  value={json}
                  onChange={(event) => setJson(event.target.value)}
                  disabled={draft.status === "published"}
                />
                <input
                  type="file"
                  accept="application/json,.json"
                  disabled={draft.status === "published"}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file)
                      void run(async () => {
                        if (file.size > 256 * 1024)
                          throw new Error("JSON 超过 256 KiB");
                        const text = await file.text();
                        change(packManifestSchema.parse(parseAssetJson(text)));
                      });
                  }}
                />
                <button
                  disabled={busy || draft.status === "published"}
                  onClick={() =>
                    void run(async () => {
                      change(packManifestSchema.parse(parseAssetJson(json)));
                    })
                  }
                >
                  应用 JSON 到表单
                </button>
              </details>
              <div className="asset-toolbar">
                <button
                  disabled={busy || draft.status === "published" || !unsaved}
                  onClick={() => void run(save)}
                >
                  保存映射
                </button>
                <button
                  disabled={busy || unsaved || draft.status === "published"}
                  onClick={() =>
                    void run(async () => {
                      select(
                        await api.assets.validate(draft.id, {
                          requestId: command(),
                          expectedDraftRevision: draft.revision,
                        }),
                      );
                      await reload();
                    })
                  }
                >
                  校验草稿
                </button>
                <button
                  disabled={busy || unsaved}
                  onClick={() => void run(showPreview)}
                >
                  固定场景预览
                </button>
                <button
                  disabled={
                    busy ||
                    unsaved ||
                    draft.status !== "ready" ||
                    previewRevision !== draft.revision
                  }
                  onClick={() =>
                    void run(async () => {
                      await api.assets.publish(draft.id, {
                        requestId: command(),
                        expectedDraftRevision: draft.revision,
                        contentHash: draft.content_hash!,
                      });
                      await reload();
                      await open(draft.id);
                    })
                  }
                >
                  发布精确版本
                </button>
                <button
                  className="danger"
                  disabled={busy}
                  onClick={() => {
                    if (
                      confirm(
                        "删除此草稿及其未发布映射？已发布版本仍保留，未引用文件延迟清理。",
                      )
                    )
                      void run(async () => {
                        await api.assets.removeDraft(draft.id, draft.revision);
                        setDraft(undefined);
                        setManifest(undefined);
                        setPreview(undefined);
                        audio.current.clear();
                        await reload();
                      });
                  }}
                >
                  删除草稿
                </button>
              </div>
              {unsaved && <p>有未保存修改，旧校验和预览不能用于发布。</p>}
              <h3>校验报告</h3>
              {draft.report.errors.map((message) => (
                <p className="error-notice" key={message}>
                  {message}
                </p>
              ))}
              {draft.report.warnings.map((message) => (
                <p key={message}>{message}</p>
              ))}
              {draft.status === "ready" && (
                <p>校验通过 · {draft.content_hash}</p>
              )}
              {preview && (
                <section className="asset-preview">
                  <h2>演示预览 · 不是真实对局</h2>
                  <label>
                    预览音量
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={previewVolume}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        setPreviewVolume(value);
                        audio.current.setPreferences(
                          { muted: false, game: value, ui: value },
                          false,
                        );
                      }}
                    />
                  </label>
                  {contract?.cues.map((cue) => (
                    <button
                      key={cue.id}
                      onClick={() =>
                        void audio.current
                          .unlock()
                          .then(() =>
                            audio.current.play(
                              cue.id,
                              manifest,
                              contract,
                              true,
                            ),
                          )
                      }
                    >
                      试听 {cue.id}
                    </button>
                  ))}
                  <button
                    className="secondary"
                    onClick={() => {
                      setPreview(undefined);
                      audio.current.clear();
                    }}
                  >
                    关闭预览
                  </button>
                  {preview}
                </section>
              )}
            </section>
          )}
    </>
  );
}
