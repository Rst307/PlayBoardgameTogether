import { lazy, type ReactNode } from 'react';
import { guides } from './developer-guides.js';

const RootPage = lazy(() => import('./RootPage.js'));
const LoginPage = lazy(() => import('../pages/LoginPage.js').then(module => ({ default: module.LoginPage })));
const ProfilePage = lazy(() => import('../pages/ProfilePage.js').then(module => ({ default: module.ProfilePage })));
const NewRoomPage = lazy(() => import('../pages/NewRoomPage.js').then(module => ({ default: module.NewRoomPage })));
const GameDetailPage = lazy(() => import('../pages/GameDetailPage.js').then(module => ({ default: module.GameDetailPage })));
const RoomPage = lazy(() => import('../pages/RoomPage.js').then(module => ({ default: module.RoomPage })));
const MatchPage = lazy(() => import('../pages/MatchPage.js').then(module => ({ default: module.MatchPage })));
const AssetAdminPage = lazy(() => import('../pages/AssetAdminPage.js').then(module => ({ default: module.AssetAdminPage })));
const ModelSettingsPage = lazy(() => import('../pages/ModelSettingsPage.js').then(module => ({ default: module.ModelSettingsPage })));
const StatusPage = lazy(() => import('../pages/StatusPage.js').then(module => ({ default: module.StatusPage })));
const DevelopersPage = lazy(() => import('../pages/DevelopersPage.js').then(module => ({ default: module.DevelopersPage })));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage.js').then(module => ({ default: module.NotFoundPage })));
const labEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_LAB === 'true';
const LabPage = labEnabled ? lazy(() => import('../pages/LabPage.js').then(module => ({ default: module.LabPage }))) : undefined;
const UiScenes = labEnabled ? lazy(() => import('../dev/UiScenes.js')) : undefined;

export interface PageRoute {
  title: string;
  documentTitle?: string;
  page: ReactNode;
  game?: boolean;
  developer?: boolean;
}

// One owner for route matching, workspace titles and document titles.
export function resolvePage(path: string): PageRoute {
  const game = /^\/games\/([a-z0-9._-]+)\/([a-z0-9._-]+)(\/new)?$/i.exec(path);
  if (game) {
    const selectedGame = { id: game[1]!, version: game[2]! };
    return game[3]
      ? { title: '创建房间', page: <NewRoomPage selectedGame={selectedGame} /> }
      : { title: '游戏详情', page: <GameDetailPage {...selectedGame} /> };
  }
  const developer = /^\/developers(?:\/([a-z-]+))?$/.exec(path);
  if (developer) {
    const slug = developer[1] ?? 'index';
    const guide = guides.find(item => item.slug === slug);
    return {
      title: '开发者文档', developer: true,
      documentTitle: `${guide?.title ?? '未找到开发文档'} · 桌游平台开发文档`,
      page: <DevelopersPage slug={slug} />,
    };
  }
  const room = /^\/rooms\/([0-9a-f-]+)$/i.exec(path);
  if (room) return { title: '房间', page: <RoomPage key={room[1]} id={room[1]!} /> };
  const match = /^\/matches\/([0-9a-f-]+)$/i.exec(path);
  if (match) return { title: '游戏桌', game: true, page: <MatchPage key={match[1]} id={match[1]!} /> };
  switch (path) {
    case '/': return { title: '游戏大厅', page: <RootPage /> };
    case '/login': return { title: '账户登录', page: <LoginPage /> };
    case '/profile': return { title: '我的资料', page: <ProfilePage /> };
    case '/rooms/new': return { title: '创建房间', page: <NewRoomPage /> };
    case '/settings/models': return { title: '模型设置', page: <ModelSettingsPage /> };
    case '/admin/assets': return { title: '资源管理', page: <AssetAdminPage /> };
    case '/status': return { title: '系统状态', page: <StatusPage /> };
    case '/dev/lab': if (LabPage) return { title: '扩展实验台', page: <LabPage /> }; break;
    case '/dev/ui': if (UiScenes) return { title: '界面场景', page: <UiScenes /> }; break;
  }
  return { title: '页面不存在', page: <NotFoundPage /> };
}
