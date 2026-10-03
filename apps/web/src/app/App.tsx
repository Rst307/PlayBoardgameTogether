import { Suspense, useEffect } from 'react';
import { PageFeedback } from '@boardgame/ui';
import { followPageLink, usePageNavigation } from './navigation.js';
import { PageBoundary } from './PageBoundary.js';
import { resolvePage } from './routes.js';

export function App() {
  const path = usePageNavigation();
  const labEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_LAB === 'true';
  const route = resolvePage(path);
  useEffect(() => {
    document.title = route.documentTitle ?? `${route.title} · 桌游平台`;
  }, [route.title, route.documentTitle]);
  return <div className={`desktop-shell ${route.game ? 'desktop-shell--game' : ''}`} onClick={followPageLink}>
    <a className="skip-link" href="#main-content">跳到主要内容</a>
    <header className="site-header">
      <div className="window-marks" aria-hidden="true"><i /><i /><i /></div>
      <a className="brand" href="/"><svg className="brand-symbol" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="4" y="4" width="24" height="24" rx="6" /><path d="M11 11h3v3h-3zm7 7h3v3h-3zM18 11h3v3h-3zm-7 7h3v3h-3z" /></svg><span className="brand-name">桌游平台<span>一起坐下来，玩一局</span></span></a>
      <nav aria-label="主导航">
        <span className="nav-caption">游戏空间</span>
        <a href="/" aria-current={path === '/' ? 'page' : undefined}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m3 10 9-7 9 7v10H3zM9 20v-7h6v7" /></svg>游戏大厅</a>
        <a href="/profile" aria-current={path === '/profile' ? 'page' : undefined}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></svg>我的资料</a>
        <a href="/friends" aria-current={path === '/friends' ? 'page' : undefined}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="9" cy="8" r="3" /><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 4a6 6 0 0 1 3 5" /></svg>好友</a>
        <a href="/developers" aria-current={route.developer ? 'page' : undefined}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18" /></svg>开发者文档</a>
        <details className="nav-tools"><summary>更多</summary><div>
          <a href="/admin" aria-current={path === '/admin' || path.startsWith('/admin/') ? 'page' : undefined}>管理员后台</a>
          <a href="/settings/models" aria-current={path === '/settings/models' ? 'page' : undefined}>模型设置</a><a href="/admin/assets" aria-current={path === '/admin/assets' ? 'page' : undefined}>资源管理</a><a href="/admin/games" aria-current={path === '/admin/games' ? 'page' : undefined}>游戏展示</a><a href="/status" aria-current={path === '/status' ? 'page' : undefined}>系统状态</a>
          {labEnabled && <><a href="/dev/lab" aria-current={path === '/dev/lab' ? 'page' : undefined}>扩展实验台</a><a href="/dev/ui" aria-current={path === '/dev/ui' ? 'page' : undefined}>界面场景</a></>}
        </div></details>
      </nav>
      <div className="sidebar-note"><span>和朋友，共享一张桌</span><small>私人房间 · 实时对局</small></div>
    </header>
    <div className="workspace">
      <div className="workspace-toolbar"><span>桌游平台 <span aria-hidden="true">/</span> <strong>{route.title}</strong></span><span className="toolbar-detail">Boardgame Together</span></div>
      <main key={path} id="main-content" tabIndex={-1} aria-label={route.title}>
        <PageBoundary>
          <Suspense fallback={<PageFeedback title={`正在加载${route.title}…`} loading />}>
            {route.page}
          </Suspense>
        </PageBoundary>
      </main>
      <footer>桌游平台 · 和朋友继续这场对局</footer>
    </div>
  </div>;
}
