import type { CounterView } from '../shared/index.js';

export function CounterBoard({ view }: { view: CounterView }) {
  return <section aria-label="计数游戏状态"><div className="score-grid">{view.seats.map(seat => <div className="score" key={seat}><span>{seat}</span><strong>{view.scores[seat]}</strong></div>)}</div><p>当前行动：{view.activeSeatId ?? '已结束'}</p><p>我的私密提示码：<strong>{view.myHint}</strong></p></section>;
}
