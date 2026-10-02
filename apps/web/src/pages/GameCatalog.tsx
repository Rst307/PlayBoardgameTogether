import { PageFeedback } from '@boardgame/ui';
import { gamePath, useGameCatalog, type AvailableGame } from './game-catalog.js';

export function GameCover({ game }: { game: AvailableGame }) {
  const hue = [...game.id].reduce((value, char) => value + char.charCodeAt(0), 0) % 360;
  return <div className="game-cover" style={{ backgroundColor: `hsl(${hue} 28% 23%)` }} aria-hidden="true">
    <svg viewBox="0 0 400 200" fill="none">
      <circle cx="325" cy="75" r="100" stroke="currentColor" opacity=".15" />
      <circle cx="325" cy="75" r="75" stroke="currentColor" opacity=".15" />
      <g transform="translate(65 32) rotate(-12 50 65)"><rect width="90" height="130" rx="8" fill="currentColor" opacity=".18" /><rect x="10" y="10" width="70" height="110" rx="4" stroke="currentColor" opacity=".5" /></g>
      <g transform="translate(139 50) rotate(10 45 65)"><rect width="90" height="130" rx="8" fill="currentColor" opacity=".8" /><path d="m45 35 22 30-22 30-22-30z" fill={`hsl(${hue} 28% 23%)`} /></g>
      <path d="m284 107 28-16 28 16v32l-28 16-28-16z" fill="currentColor" opacity=".6" />
      <circle cx="265" cy="162" r="16" fill="currentColor" opacity=".3" />
    </svg>
    <span>{game.name}</span>
  </div>;
}

export function GameCatalog() {
  const { games, error, retry } = useGameCatalog();
  if (error) return <PageFeedback title="游戏加载失败" retry={retry}>{error}</PageFeedback>;
  if (!games) return <PageFeedback title="正在加载游戏…" loading />;
  return <section className="game-catalog" aria-label="选择游戏">
    <h2>选择一款游戏</h2><p className="muted">查看游戏介绍，再创建房间或加入朋友的游戏桌。</p>
    {!games.length && <p role="status">暂无可用游戏，请稍后再来。</p>}
    <div className="game-catalog-grid">{games.map(game =>
      <a className="game-card" href={gamePath(game)} key={`${game.id}@${game.version}`} aria-label={`查看 ${game.name}`}>
        <GameCover game={game} />
        <div className="game-card-info"><h3>{game.name}</h3><span>{game.players.min}–{game.players.max} 人</span><p>{game.description}</p><strong>查看游戏 →</strong></div>
      </a>)}
    </div>
  </section>;
}
