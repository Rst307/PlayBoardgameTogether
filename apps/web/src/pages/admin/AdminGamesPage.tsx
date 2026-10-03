import { useEffect, useRef, useState } from 'react';
import type { AdminGame } from '@boardgame/protocol';
import { PageFeedback } from '@boardgame/ui';
import { api } from '../../platform.js';
import { AdminLayout, adminError, useAdminRequestId } from './AdminLayout.js';
import { GamePackageUpload } from './GamePackageUpload.js';

function Games() {
  const requestId = useAdminRequestId();
  const [games, setGames] = useState<AdminGame[]>();
  const [filter, setFilter] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const alive = useRef(false);
  const lock = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    let disposed = false;
    setError('');
    setGames(undefined);
    void api
      .adminGames()
      .then((value) => {
        if (!disposed) setGames(value);
      })
      .catch((cause) => {
        if (!disposed) setError(adminError(cause));
      });
    return () => {
      disposed = true;
    };
  }, [attempt]);
  async function change(game: AdminGame) {
    if (lock.current) return;
    if (
      !window.confirm(
        game.enabled
          ? `下架「${game.name} ${game.version}」？新房间与等待房间将不能开局，进行中的对局继续。`
          : `上架「${game.name} ${game.version}」？此版本将可用于新建房间与开局。`,
      )
    )
      return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const saved = await api.setAdminGameStatus(game.id, game.version, {
        requestId: requestId([
          game.id,
          game.version,
          game.revision,
          !game.enabled,
        ]),
        expectedRevision: game.revision,
        enabled: !game.enabled,
      });
      if (!alive.current) return;
      setGames((previous) =>
        previous?.map((item) =>
          item.id === saved.id && item.version === saved.version ? saved : item,
        ),
      );
      setNotice(
        `${saved.name} ${saved.version}已${saved.enabled ? '上架' : '下架'}。`,
      );
    } catch (cause) {
      if (alive.current) setError(adminError(cause));
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const visible = games?.filter((game) =>
    `${game.name} ${game.id} ${game.version}`
      .toLowerCase()
      .includes(filter.trim().toLowerCase()),
  );
  return (
    <>
      <GamePackageUpload onInstalled={() => setAttempt(value => value + 1)} />
      <section className="panel admin-guidance">
        <h2>按版本管理上架状态</h2>
        <p>
          下架隐藏大厅入口并阻止新建、开局；进行中的对局保留原规则与资源。重新上架后等待房间可继续开局。
        </p>
        <details>
          <summary>如何加入新游戏或发布更新</summary>
          <p>
            在线格式游戏包可从上方直接上传安装。普通源码项目由维护者审查、部署并同步；新版本使用新版本号，旧版本需继续保留以恢复已有对局。
          </p>
          <a href="/developers/add-game">查看游戏接入指南</a>
        </details>
      </section>
      <label className="admin-filter">
        筛选游戏
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="名称、游戏 ID 或版本"
        />
      </label>
      {error && (
        <p className="error-notice" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {!games ? (
        error ? (
          <button
            className="secondary"
            onClick={() => setAttempt((value) => value + 1)}
          >
            刷新游戏
          </button>
        ) : (
          <PageFeedback title="正在加载安装版本…" loading />
        )
      ) : (
        <>
          <div className="admin-records">
            {visible?.map((game) => (
              <article
                className="panel admin-record"
                key={`${game.id}@${game.version}`}
                aria-label={`${game.name} ${game.version}`}
              >
                <div>
                  <h2>
                    {game.name} <small>{game.version}</small>
                  </h2>
                  <p className="muted">
                    {game.id}
                    {game.developmentOnly ? ' · 仅开发环境' : ''}
                  </p>
                  <p>
                    {game.available
                      ? '规则与资源已加载'
                      : '规则或资源不可用，需检查部署'}
                  </p>
                </div>
                <div className="admin-record-actions">
                  <span className="status-badge">
                    {game.enabled ? '已上架' : '已下架'}
                  </span>
                  <button
                    className="secondary"
                    disabled={busy || (!game.enabled && !game.available)}
                    onClick={() => void change(game)}
                  >
                    {game.enabled ? '下架版本' : '上架版本'}
                  </button>
                </div>
              </article>
            ))}
          </div>
          {visible?.length === 0 && (
            <p className="panel">
              没有匹配的安装版本。新游戏部署并同步后将在这里显示。
            </p>
          )}
          <div className="admin-actions">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setAttempt((value) => value + 1)}
            >
              刷新游戏
            </button>
            <a className="button secondary" href="/admin/games">
              编辑展示图片
            </a>
            <a className="button secondary" href="/admin/assets">
              管理游戏资源
            </a>
          </div>
        </>
      )}
    </>
  );
}
export function AdminGamesPage() {
  return (
    <AdminLayout
      path="/admin/catalog"
      title="游戏管理"
      description="查看已安装游戏，按精确版本上架与下架。"
    >
      <Games />
    </AdminLayout>
  );
}
