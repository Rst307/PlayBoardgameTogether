import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  colors, names, symbols, floorPenalties, scoreEventSchema, wallColor, wallColumn,
  type AzulAction, type AzulView, type Color, type ScoreStep,
} from '../shared/index.js';
import './style.css';
import { impactScore, scoreImpacts, scoreTiming } from './scoring.js';

function Tile({ color, ghost = false }: { color: Color; ghost?: boolean }) {
  return <span className={`az-tile az-${color}${ghost ? ' az-ghost' : ''}`} aria-hidden="true"><span>{symbols[color]}</span></span>;
}
type Beat = ScoreStep & { key: string; round: number };
export function AzulBoard({ view, busy, events = [], onAction }: {
  view: AzulView; busy: boolean; events?: unknown[]; onAction: (action: AzulAction) => void;
}) {
  const [selection, setSelection] = useState<{ source: number; color: Color } | null>(null);
  const [row, setRow] = useState<number | null>(null);
  const [beat, setBeat] = useState<Beat | null>(null);
  const [pending, setPending] = useState<Beat[]>([]);
  const [impactProgress, setImpactProgress] = useState({ key: '', count: 0 });
  const seen = useRef(new Set<string>());
  const mine = view.players[view.viewingSeatId]!;
  const myTurn = view.currentSeatId === view.viewingSeatId && view.phase === 'drafting';
  const canAct = myTurn && !busy;
  const selectedTiles = selection ? (selection.source === -1 ? view.center : view.factories[selection.source] ?? []).filter(c => c === selection.color).length : 0;
  const valid = selection && row !== null && view.legalActions.some(a => a.source === selection.source && a.color === selection.color && a.row === row);
  const legalRow = (r: number) => !!selection && view.legalActions.some(a => a.source === selection.source && a.color === selection.color && a.row === r);
  const order = [view.viewingSeatId, ...view.seats.filter(id => id !== view.viewingSeatId)];
  const seatName = (id: string) => id === view.viewingSeatId ? '你' : `玩家 ${view.seats.indexOf(id) + 1}`;

  useEffect(() => { setSelection(null); setRow(null); }, [view.round, view.currentSeatId, busy]);
  useEffect(() => {
    const fresh: Beat[] = [];
    for (const raw of events) {
      const parsed = scoreEventSchema.safeParse(raw);
      if (!parsed.success || seen.current.has(parsed.data.eventId)) continue;
      seen.current.add(parsed.data.eventId);
      parsed.data.steps.forEach((step, index) => fresh.push({ ...step, key: `${parsed.data.eventId}:${index}`, round: parsed.data.round }));
    }
    if (seen.current.size > 100) seen.current = new Set([...seen.current].slice(-50));
    if (fresh.length) setPending(old => [...old, ...fresh].slice(-88));
  }, [events]);
  useEffect(() => {
    if (beat || !pending.length) return;
    setBeat(pending[0]!);
    setPending(old => old.slice(1));
  }, [pending, beat]);
  useEffect(() => {
    if (!beat) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const count = scoreImpacts(beat).length;
    setImpactProgress({ key: beat.key, count: reduced ? count : 0 });
    const timers = reduced ? [] : Array.from({ length: count }, (_, index) => window.setTimeout(() =>
      setImpactProgress({ key: beat.key, count: index + 1 }), scoreTiming.landing + index * scoreTiming.impact));
    timers.push(window.setTimeout(() => setBeat(null), reduced ? scoreTiming.reduced
      : scoreTiming.landing + count * scoreTiming.impact + scoreTiming.hold));
    return () => { timers.forEach(timer => window.clearTimeout(timer)); };
  }, [beat]);
  const impacts = beat ? scoreImpacts(beat) : [];
  const revealed = beat && impactProgress.key === beat.key ? impactProgress.count : 0;
  const hit = impacts[revealed - 1];
  const displayScore = (id: string) => beat?.seatId === id ? impactScore(beat, impacts, revealed)
    : pending.find(step => step.seatId === id)?.from ?? view.players[id]!.score;
  function formula() {
    return <div className="az-score-formula" aria-label="逐步计分">
      {impacts.slice(0, revealed).map((part, index) => <span key={`${beat?.key}:${index}`} className={index === revealed - 1 ? 'az-impact-number' : ''}>
        {part.points >= 0 ? '+' : '−'}{Math.abs(part.points)}
      </span>)}
      {revealed === impacts.length && <b className="az-impact-total">＝{beat && beat.points >= 0 ? '+' : '−'}{Math.abs(beat?.points ?? 0)}</b>}
    </div>;
  }
  function pick(source: number, color: Color) {
    if (!canAct) return;
    setSelection(old => old?.source === source && old.color === color ? null : { source, color });
    setRow(null);
  }
  function offer(tiles: Color[], source: number) {
    return colors.filter(color => tiles.includes(color)).map(color => {
      const count = tiles.filter(tile => tile === color).length;
      const selected = selection?.source === source && selection.color === color;
      return <button type="button" key={color} className={`az-offer${selected ? ' az-selected' : ''}`}
        aria-label={`${source < 0 ? '中央' : `工厂 ${source + 1}`} ${names[color]} ${count}块`}
        aria-pressed={selected} disabled={!canAct} onClick={() => pick(source, color)}>
        <Tile color={color} /><b>×{count}</b>
      </button>;
    });
  }
  const allBeats = beat ? [beat, ...pending] : pending;
  return <section className="az-table" aria-label="花砖物语游戏桌" onKeyDown={event => {
    if (event.key === 'Escape') { setSelection(null); setRow(null); }
  }}>
    <header className="az-heading"><div><small>AZUL · 彩墙工坊</small><h2>花砖物语</h2></div><div className="az-round">第 <b>{view.round}</b> 轮<span>{view.bagCount} 块待抽</span></div></header>
    <div className="az-turn" role="status">{view.phase === 'finished' ? '工坊完工' : myTurn ? '轮到你 · 选一组花砖，再选图案行' : `等待${seatName(view.currentSeatId)}选砖`}
      {allBeats.length > 0 && <span>铺墙结算中 · 可继续查看与选砖</span>}</div>
    <section className="az-supply" aria-label="花砖供应区">
      <div className="az-factories">{view.factories.map((tiles, index) => <div className={`az-factory${!tiles.length ? ' az-empty' : ''}`} key={index}>
        <span className="az-factory-number">{index + 1}</span><div>{offer(tiles, index)}</div>{!tiles.length && <small>已取空</small>}
      </div>)}</div>
      <div className="az-center"><div><strong>中央</strong><small>{view.firstAvailable ? '首次拿取附带先手标记' : `下轮${seatName(view.nextStarter!)}先手`}</small></div>
        <div className="az-center-tiles">{view.firstAvailable && <span className="az-first" title="先手标记占一格地板">1</span>}{offer(view.center, -1)}{!view.center.length && <span className="az-muted">暂无花砖</span>}</div>
      </div>
    </section>
    <div className="az-players">{order.map(id => {
      const player = view.players[id]!, own = id === view.viewingSeatId;
      const active = beat?.seatId === id ? beat : null;
      const hidden = allBeats.filter(step => step.seatId === id && step.kind === 'tile' && step.key !== active?.key);
      return <section key={id} className={`az-player${own ? ' az-own' : ''}${active ? ' az-scoring' : ''}`} aria-label={`${seatName(id)}的花砖板`}>
        <header><div><strong>{own ? '你的工坊' : seatName(id)}</strong>{view.currentSeatId === id && view.phase !== 'finished' && <small>正在选砖</small>}</div>
          <div className="az-score" aria-label={`${seatName(id)}得分`}><b key={active ? `${active.key}:${revealed}` : 'steady'} className={active && revealed > 0 ? 'az-score-pop' : ''}>{displayScore(id)}</b><span>分</span></div></header>
        <div className="az-mosaic"><div className="az-patterns"><small>图案行</small>{player.lines.map((line, r) => {
          const canPlace = own && legalRow(r) && canAct;
          const previewCount = own && row === r && selection ? Math.min(selectedTiles, r + 1 - line.count) : 0;
          return <button type="button" key={r} className={`az-pattern${own && row === r ? ' az-selected' : ''}`} aria-label={`${seatName(id)}图案行 ${r + 1} ${line.count}/${r + 1}`}
            disabled={!canPlace} aria-pressed={own && row === r} onClick={() => setRow(r)}>
            <span className="az-line-number">{r + 1}</span><span className="az-line-slots">{Array.from({ length: r + 1 }, (_, index) => {
              const filled = index >= r + 1 - line.count;
              const preview = !filled && index >= r + 1 - line.count - previewCount;
              return <span className={`az-slot${preview ? ' az-preview' : ''}`} key={index}>
                {filled && line.color ? <Tile color={line.color} /> : preview && selection ? <Tile color={selection.color} ghost /> : null}
              </span>;
            })}</span><span className="az-arrow">›</span>
          </button>;
        })}</div>
        <div className="az-wall-area"><small>马赛克墙</small><div className="az-wall">{player.wall.flatMap((wallRow, r) => wallRow.map((filled, c) => {
          const color = wallColor(r, c);
          const scoring = active?.kind === 'tile' && active.row === r && active.col === c;
          const linked = active && hit?.cells.some(cell => cell.row === r && cell.col === c);
          const future = hidden.some(step => step.row === r && step.col === c);
          const preview = own && row === r && selection && wallColumn(r, selection.color) === c;
          return <div key={`${r}:${c}:${scoring ? active.key : ''}`} className={`az-wall-cell${linked ? ' az-linked' : ''}${scoring ? ' az-landing' : ''}${preview ? ' az-destination' : ''}`}
            style={{ '--link-delay': `${(hit?.cells.findIndex(cell => cell.row === r && cell.col === c) ?? 0) * 85}ms` } as CSSProperties}
            aria-label={`${names[color]} 第${r + 1}行第${c + 1}列 ${filled ? '已铺' : '空位'}`}>
            <Tile color={color} ghost={!filled || future} />
            {linked && <span className="az-link-flash" key={`${active.key}:${revealed}:glow`} />}
            {scoring && <span className="az-score-burst" key={`${active.key}:${revealed}`}><i>✦</i><i>✧</i><i>◆</i><i>✦</i></span>}
          </div>;
        }))}</div></div></div>
        <div className="az-floor"><span>地板</span>{floorPenalties.map((penalty, index) => <span className="az-floor-slot" key={index}>
          {player.floor[index] === 'first' ? <span className="az-first">1</span> : player.floor[index] ? <Tile color={player.floor[index] as Color} /> : null}<small>−{penalty}</small>
        </span>)}{own && <button type="button" disabled={!canAct || !legalRow(-1)} aria-pressed={row === -1} onClick={() => setRow(-1)}>全部放地板</button>}</div>
        <div className="az-reward-space" aria-live="polite">{active && <div key={active.key} className={`az-reward${active.kind === 'floor' ? ' az-penalty' : ''}${active.points >= 6 || active.kind === 'bonus' ? ' az-big-reward' : ''}`}>
          <span>{revealed === 0 ? '花砖落位…' : hit?.label}</span>{formula()}
          <small>{active.kind === 'floor' ? `实际扣除 ${active.from - active.total} 分` : revealed < impacts.length ? `分步计算 ${revealed}/${impacts.length}` : `本次合计 +${active.points} · ${active.from} → ${active.total} 分`}</small>
        </div>}</div>
      </section>;
    })}</div>
    {view.phase === 'drafting' && <section className="az-confirm" aria-label="确认选砖">
      <div>{selection ? <><strong>{names[selection.color]} ×{selectedTiles}</strong><span>{row === null ? '选择高亮图案行' : row < 0 ? '全部进入地板' : `放入第 ${row + 1} 行 · 溢出 ${Math.max(0, selectedTiles - (row + 1 - mine.lines[row]!.count))} 块`}</span>
        {selection.source === -1 && view.firstAvailable && <small>同时领取先手标记 · 占一格地板</small>}</> : <span>{myTurn ? '点击工厂或中央的一组花砖' : '观察对手的图案行，计划下一次选砖'}</span>}</div>
      <button type="button" className="az-cancel" disabled={!selection || busy} onClick={() => { setSelection(null); setRow(null); }}>取消选择</button>
      <button type="button" className="az-submit" disabled={!valid || !canAct} onClick={() => {
        if (selection && row !== null && valid) onAction({ type: 'draft', ...selection, row });
      }}>{busy ? '正在放砖…' : '确认选砖'}</button>
    </section>}
    {view.outcome.status === 'finished' && <section className={`az-finale${allBeats.length ? ' az-finale-wait' : ''}`} aria-label="花砖物语结算">
      <small>最后一砖 · 工坊完工</small><h3>{view.outcome.winners.map(seatName).join('、')}获胜</h3>
      <div>{view.seats.map(id => <span key={id}>{seatName(id)} <b>{view.players[id]!.score}</b> 分</span>)}</div>
    </section>}
    {view.lastRound.length > 0 && <details className="az-breakdown"><summary>最近一轮得分明细</summary>{order.map(id => <div key={id}><strong>{seatName(id)}</strong>{view.lastRound.filter(step => step.seatId === id).map((step, index) => <span key={index}>{step.label} {step.points > 0 ? '+' : ''}{step.points} → {step.total}分</span>)}</div>)}</details>}
    <p className="az-legend">横行 +2 · 竖列 +7 · 同色五砖 +10 · 任意完整横行触发终局</p>
    {beat && <aside className={`az-impact-dock${beat.kind === 'floor' ? ' az-penalty' : ''}`} aria-hidden="true">
      <div className="az-impact-caption">{seatName(beat.seatId)} · {beat.label}<span>{revealed === 0 ? '落砖' : hit?.label}</span></div>
      <div key={`${beat.key}:${revealed}`} className={revealed > 0 ? 'az-impact-punch' : ''}>{revealed === 0 ? <strong className="az-impact-ready">准备计分</strong> : formula()}</div>
      <div className="az-impact-running">{beat.from} <span>→</span> <b>{displayScore(beat.seatId)}</b> 分</div>
    </aside>}
  </section>;
}
