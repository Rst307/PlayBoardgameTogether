import { PageFeedback } from '@boardgame/ui';
import { gamePath, useGameCatalog, type AvailableGame } from './game-catalog.js';
import { gameArt } from './catalog-art.js';
import { GameArtwork } from './GameArtwork.js';

export function GameCover({ game }: { game: AvailableGame }) {
  return <GameArtwork src={gameArt(game).coverUrl} className="game-cover" name={game.name} />;
}

export function GameCatalog() {
  const { games, error, retry } = useGameCatalog();
  if (error) return <PageFeedback title="游戏加载失败" retry={retry}>{error}</PageFeedback>;
  if (!games) return <PageFeedback title="正在加载游戏…" loading />;
  return <section className="game-catalog" aria-label="选择游戏">
    <div className="catalog-section-heading"><h2>所有游戏</h2><span>{games.length} 款可玩</span></div>
    {!games.length && <p role="status">暂无可用游戏，请稍后再来。</p>}
    <div className="game-catalog-grid">{games.map(game =>
      <a className="game-card" href={gamePath(game)} key={`${game.id}@${game.version}`} aria-label={`查看 ${game.name}`}>
        <GameCover game={game} />
        <div className="game-card-info">
          <div className="game-card-heading">
            <GameArtwork src={gameArt(game).iconUrl} className="game-card-icon" name={game.name} />
            <h3>{game.name}</h3>
          </div>
          <p className="game-card-desc">{game.description}</p>
          <div className="game-card-footer">
            <span className="game-card-players">{game.players.min}–{game.players.max} 人</span>
            <span className="game-card-action">查看房间 <span className="game-card-arrow" aria-hidden="true">→</span></span>
          </div>
        </div>
      </a>)}

    </div>
  </section>;
}
