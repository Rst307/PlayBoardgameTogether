import { useEffect, useRef, useState } from 'react';
import { api } from '../../platform.js';
import { adminError } from './AdminLayout.js';
import type { GamePackageReview } from '@boardgame/protocol';
import { ApiError } from '@boardgame/client-sdk';

export function GamePackageUpload({ onInstalled }: { onInstalled: () => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File>();
  const [review, setReview] = useState<GamePackageReview>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const controller = useRef<AbortController | undefined>(undefined);
  const request = useRef<string | undefined>(undefined);
  const alive = useRef(true);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; controller.current?.abort(); };
  }, []);
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);
  async function install() {
    if (!file || controller.current) return;
    if (!file.name.toLowerCase().endsWith('.zip') || file.size > 5 * 1024 * 1024) {
      setError('请选择不超过 5 MiB 的 .zip 游戏包'); return;
    }
    const abort = new AbortController();
    controller.current = abort;
    request.current ??= crypto.randomUUID();
    setBusy(true); setError(''); setNotice('');
    try {
      if (!review) {
        const checked = await api.reviewGamePackage(file, abort.signal);
        if (alive.current) setReview(checked);
        return;
      }
      const installed = await api.installGamePackage(file, request.current, abort.signal, review.catalogHash);
      if (!alive.current) return;
      setNotice(`${installed.name} ${installed.version} 已安装并上架，现在可以到大厅创建房间。`);
      onInstalled(); setOpen(false); setFile(undefined); setReview(undefined); request.current = undefined;
    } catch (cause) {
      if (alive.current && cause instanceof ApiError && cause.code === 'STATE_CONFLICT') setReview(undefined);
      if (alive.current) setError(cause instanceof ApiError && cause.code === 'STATE_CONFLICT'
        ? cause.message : adminError(cause));
    } finally {
      controller.current = undefined;
      if (alive.current) setBusy(false);
    }
  }
  return <section className="panel admin-guidance">
    <h2>发布桌游</h2>
    <p>上传后自动识别新游戏或版本更新，经管理员审核确认后发布。更新会替换大厅旧版本。</p>
    <div className="admin-actions">
      <button onClick={() => { setError(''); setOpen(true); }}>上传游戏 ZIP</button>
      <a href="/api/v1/game-packages/example.zip" download>下载可玩示例 ZIP</a>
      <a href="/developers/game-packages">查看打包说明</a>
    </div>
    {notice && <p role="status">{notice}</p>}
    <dialog ref={dialog} className="package-upload-dialog" onCancel={event => {
      if (busy) event.preventDefault(); else setOpen(false);
    }} aria-labelledby="package-upload-title">
      <h2 id="package-upload-title">上传并审核游戏 ZIP</h2>
      <p>包含 game.json、server.js、client.html，最多 5 MiB；解压后最多 2 MiB。普通源码仓库 ZIP 需要先按说明打包。</p>
      <label>游戏 ZIP 文件<input type="file" accept=".zip,application/zip" disabled={busy}
        onChange={event => { setFile(event.target.files?.[0]); request.current = undefined; setReview(undefined); setError(''); }} /></label>
      {file && <p>{file.name} · {(file.size / 1024).toFixed(1)} KiB</p>}
      {review && <div aria-live="polite">
        <p><strong>{review.kind === 'new' ? '新游戏' : review.kind === 'update' ? '已有游戏更新' : '此版本已安装'}</strong>：{review.name} · {review.gameId} · {review.version}</p>
        {review.kind === 'update' && <p>已安装版本：{review.installedVersions.join('、')}。审核通过后大厅只上架 {review.version}；旧版本下架，等待中的旧版本房间将无法开局，进行中的对局和历史记录保留原规则。</p>}
        <p>请确认游戏来源、规则及私密信息展示符合要求。自动检查不代替人工审核。</p>
      </div>}
      {error && <p className="error-notice" role="alert">{error}</p>}
      {busy && <p role="status">{review ? '正在发布…' : '正在检查游戏包…'}</p>}
      <div className="admin-actions">
        <button disabled={!file || busy} onClick={() => void install()}>{!review ? '检查游戏包' : review.kind === 'update' ? '审核通过并更新' : review.kind === 'installed' ? '确认已安装版本' : '审核通过并上架'}</button>
        <button className="secondary" disabled={busy} onClick={() => setOpen(false)}>取消</button>
      </div>
    </dialog>
  </section>;
}
