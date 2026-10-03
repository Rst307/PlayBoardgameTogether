import { useEffect, useState } from 'react';
import { PageFeedback } from '@boardgame/ui';
import { api } from '../../platform.js';
import { AdminLayout, adminError } from './AdminLayout.js';

function Overview() {
  const [data, setData] =
    useState<Awaited<ReturnType<typeof api.adminOverview>>>();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false;
    setError('');
    void api
      .adminOverview()
      .then((value) => {
        if (!disposed) setData(value);
      })
      .catch((cause) => {
        if (!disposed) setError(adminError(cause));
      });
    return () => {
      disposed = true;
    };
  }, [attempt]);
  if (error)
    return (
      <PageFeedback
        title="总览加载失败"
        retry={() => setAttempt((value) => value + 1)}
      >
        {error}
      </PageFeedback>
    );
  if (!data) return <PageFeedback title="正在加载平台总览…" loading />;
  return (
    <>
      <div className="admin-metrics" aria-label="平台统计">
        {[
          ['账户', data.accounts, `${data.disabledAccounts} 个已停用`],
          ['开放房间', data.openRooms, `${data.activeMatches} 局进行中`],
          ['安装版本', data.installedGames, `${data.enabledGames} 个已上架`],
          ['待审申请', data.pendingSubmissions, '等待资料审核'],
        ].map(([label, value, hint]) => (
          <section className="panel" key={label}>
            <h2>{label}</h2>
            <strong>{value}</strong>
            <p className="muted">{hint}</p>
          </section>
        ))}
      </div>
      <div className="admin-shortcuts">
        <a className="panel" href="/admin/accounts">
          <h2>管理账户</h2>
          <p>搜索账户，启用或停用普通玩家。</p>
          <span>进入账户管理 →</span>
        </a>
        <a className="panel" href="/admin/catalog">
          <h2>管理游戏</h2>
          <p>按版本上架、下架，配置展示与资源。</p>
          <span>进入游戏管理 →</span>
        </a>
        <a className="panel" href="/admin/submissions">
          <h2>审核接入申请</h2>
          <p>查看游戏资料和仓库地址，记录审核意见。</p>
          <span>进入接入审核 →</span>
        </a>
        <a className="panel" href="/status">
          <h2>检查系统状态</h2>
          <p>检查 API、数据库与游戏目录是否就绪。</p>
          <span>查看系统状态 →</span>
        </a>
      </div>
      <button
        className="secondary"
        onClick={() => setAttempt((value) => value + 1)}
      >
        刷新统计
      </button>
    </>
  );
}
export function AdminOverviewPage() {
  return (
    <AdminLayout
      path="/admin"
      title="管理员后台"
      description="管理玩家、游戏版本与接入申请。"
    >
      <Overview />
    </AdminLayout>
  );
}
