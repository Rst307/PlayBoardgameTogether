import { GameCatalog } from './GameCatalog.js';

export function HomePage() {
  return <><section className="page-heading"><div><h1>游戏大厅</h1><p>选一款桌游，和朋友一起坐下来玩。</p></div></section><GameCatalog /></>;
}
