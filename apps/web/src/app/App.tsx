import { lazy, Suspense, useEffect, useState } from 'react';
import { ApiError } from '@boardgame/client-sdk';
import { PageFeedback } from '@boardgame/ui';
import { ProfilePage } from '../pages/ProfilePage.js';
import { DashboardPage } from '../pages/DashboardPage.js';
import { HomePage } from '../pages/HomePage.js';
import { LoginPage } from '../pages/LoginPage.js';
import { RoomPage } from '../pages/RoomPage.js';
import { MatchPage } from '../pages/MatchPage.js';
import { StatusPage } from '../pages/StatusPage.js';
import { LabPage } from '../pages/LabPage.js';
import { NotFoundPage } from '../pages/NotFoundPage.js';
import { NewRoomPage } from '../pages/NewRoomPage.js';
import { ModelSettingsPage } from '../pages/ModelSettingsPage.js';
import { AssetAdminPage } from '../pages/AssetAdminPage.js';
import { api } from '../platform.js';
import { followPageLink, usePageNavigation } from './navigation.js';

const UiScenes = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_LAB === 'true'
  ? lazy(() => import('../dev/UiScenes.js')) : undefined;

function RootPage() {
  const [state, setState] = useState<'loading' | 'guest' | 'member' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false;
    setState('loading');
    void api.me().then(() => { if (!disposed) setState('member'); }).catch(cause => {
      if (!disposed) setState(cause instanceof ApiError && cause.code === 'UNAUTHENTICATED' ? 'guest' : 'error');
    });
    return () => { disposed = true; };
  }, [attempt]);
  if (state === 'loading') return <PageFeedback title="正在检查登录状态…" loading />;
  if (state === 'error') return <PageFeedback title="暂时无法连接" retry={() => setAttempt(value => value + 1)}>检查连接后重新加载。</PageFeedback>;
  if (state === 'member') return <DashboardPage />;
  return <><HomePage /><p><a className="login-link" href="/login">登录后创建或加入私人房间</a></p></>;
}

export function App() {
  const path = usePageNavigation();
  const labEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_LAB === 'true';
  const room = /^\/rooms\/([0-9a-f-]+)$/i.exec(path);
  const match = /^\/matches\/([0-9a-f-]+)$/i.exec(path);
  const page = path === '/' ? <RootPage /> : path === '/login' ? <LoginPage /> :
    path === '/profile' ? <ProfilePage /> : path === '/rooms/new' ? <NewRoomPage /> : path === '/admin/assets' ? <AssetAdminPage /> :
    path === '/settings/models' ? <ModelSettingsPage /> : room ? <RoomPage key={room[1]} id={room[1]!} /> :
    match ? <MatchPage key={match[1]} id={match[1]!} /> : path === '/status' ? <StatusPage /> :
    path === '/dev/ui' && UiScenes ? <Suspense fallback={<PageFeedback title="正在加载开发场景…" loading />}><UiScenes /></Suspense> :
    path === '/dev/lab' && labEnabled ? <LabPage /> : <NotFoundPage />;
  const workspaceTitle = path === '/' ? '游戏大厅' : path === '/login' ? '账户登录' :
    path === '/profile' ? '我的资料' : path === '/rooms/new' ? '创建房间' : path === '/settings/models' ? '模型设置' :
    path === '/admin/assets' ? '资源管理' : room ? '房间' : match ? '游戏桌' :
    path === '/status' ? '系统状态' : path === '/dev/ui' ? '界面场景' : '桌游平台';
  return <div className={`desktop-shell ${match ? 'desktop-shell--game' : ''}`} onClick={followPageLink}>
    <a className="skip-link" href="#main-content">跳到主要内容</a>
    <header className="site-header">
      <div className="window-marks" aria-hidden="true"><i /><i /><i /></div>
      <a className="brand" href="/"><svg className="brand-symbol" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="4" y="4" width="24" height="24" rx="6" /><path d="M11 11h3v3h-3zm7 7h3v3h-3zM18 11h3v3h-3zm-7 7h3v3h-3z" /></svg><span className="brand-name">桌游平台<span>一起坐下来，玩一局</span></span></a>
      <nav aria-label="主导航">
        <span className="nav-caption">游戏空间</span>
        <a href="/" aria-current={path === '/' ? 'page' : undefined}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m3 10 9-7 9 7v10H3zM9 20v-7h6v7" /></svg>游戏大厅</a>
        <a href="/profile" aria-current={path === '/profile' ? 'page' : undefined}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></svg>我的资料</a>
        <details className="nav-tools"><summary>更多</summary><div>
          <a href="/settings/models" aria-current={path === '/settings/models' ? 'page' : undefined}>模型设置</a><a href="/admin/assets" aria-current={path === '/admin/assets' ? 'page' : undefined}>资源管理</a><a href="/status" aria-current={path === '/status' ? 'page' : undefined}>系统状态</a>
          {labEnabled && <><a href="/dev/lab" aria-current={path === '/dev/lab' ? 'page' : undefined}>扩展实验台</a><a href="/dev/ui" aria-current={path === '/dev/ui' ? 'page' : undefined}>界面场景</a></>}
        </div></details>
      </nav>
      <div className="sidebar-note"><span>和朋友，共享一张桌</span><small>私人房间 · 实时对局</small></div>
    </header>
    <div className="workspace">
      <div className="workspace-toolbar"><span>桌游平台 <span aria-hidden="true">/</span> <strong>{workspaceTitle}</strong></span><span className="toolbar-detail">Boardgame Together</span></div>
      <main key={path} id="main-content" tabIndex={-1}>{page}</main>
      <footer>桌游平台 · 和朋友继续这场对局</footer>
    </div>
  </div>;
}
