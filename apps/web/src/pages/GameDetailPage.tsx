import { useState } from 'react';
import { PageFeedback } from '@boardgame/ui';
import { GameCover } from './GameCatalog.js';
import { GameRules } from './GameRules.js';
import { Lobby } from './Lobby.js';
import { RoomInviteForm } from './RoomInviteForm.js';
import { gamePath, useGameCatalog } from './game-catalog.js';

export function GameDetailPage({ id, version }: { id: string; version: string }) {
  const { games, error, retry } = useGameCatalog();
  const [joining, setJoining] = useState(false);
  if (error) return <PageFeedback title="游戏加载失败" retry={retry}>{error}</PageFeedback>;
  if (!games) return <PageFeedback title="正在加载游戏…" loading />;
  const game = games.find(item => item.id === id && item.version === version);
  if (!game) return <PageFeedback title="游戏暂不可用">该游戏或版本未启用。<a href="/">返回游戏大厅</a></PageFeedback>;
  return <>
    <p><a href="/">← 返回游戏大厅</a></p>
    <section className="game-detail-heading"><GameCover game={game} />
      <div><p className="eyebrow">{game.players.min}–{game.players.max} 人</p><h1>{game.name}</h1><p>{game.description}</p>
        <div className="game-detail-actions">
          <a className="button-link" href={`${gamePath(game)}/new`}>创建房间</a>
          <button className="secondary" onClick={() => setJoining(value => !value)} aria-expanded={joining} aria-controls="game-join">加入房间</button>
        </div>
      </div>
    </section>
    <GameRules gameId={id} version={version} />
    {joining && <section id="game-join" className="game-join"><h2>加入 {game.name}</h2><RoomInviteForm /><Lobby gameId={id} /></section>}
  </>;
}
