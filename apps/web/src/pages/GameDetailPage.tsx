import { PageFeedback } from '@boardgame/ui';
import { GameArtwork } from './GameArtwork.js';
import { gameArt } from './catalog-art.js';
import { GameRules } from './GameRules.js';
import { Lobby } from './Lobby.js';
import { RoomInviteForm } from './RoomInviteForm.js';
import { gamePath, useGameCatalog } from './game-catalog.js';

export function GameDetailPage({ id, version }: { id: string; version: string }) {
  const { games, error, retry } = useGameCatalog();
  if (error) return <PageFeedback title="游戏加载失败" retry={retry}>{error}</PageFeedback>;
  if (!games) return <PageFeedback title="正在加载游戏…" loading />;
  const game = games.find(item => item.id === id && item.version === version);
  if (!game) return <PageFeedback title="游戏暂不可用">该游戏或版本未启用。<a href="/">返回游戏大厅</a></PageFeedback>;
  return <div className="game-room-page">
    <p><a href="/">← 返回游戏大厅</a></p>
    <section className="game-detail-banner">
      <GameArtwork src={gameArt(game).backgroundUrl} className="game-banner-background" name={game.name} />
      <div className="game-banner-content">
        <GameArtwork src={gameArt(game).iconUrl} className="game-detail-icon" name={game.name} />
        <div><p className="eyebrow">{game.players.min}–{game.players.max} 人 · 在线桌游</p><h1>{game.name}</h1><p>{game.description}</p></div>
      </div>
    </section>
    <section className="game-rooms-heading"><div><h2>公开房间</h2><p className="muted">选一张桌加入，或创建自己的房间。</p></div>
      <a className="button-link" href={`${gamePath(game)}/new`}><span aria-hidden="true">＋</span> 创建房间</a>
    </section>
    <Lobby gameId={id} showHeading={false} />
    <div className="game-detail-support">
      <details className="game-invite-disclosure"><summary>使用邀请码加入私人房间</summary><RoomInviteForm /></details>
      <GameRules gameId={id} version={version} />
    </div>
  </div>;
}
