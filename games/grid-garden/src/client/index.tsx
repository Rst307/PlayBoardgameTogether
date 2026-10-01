import { useEffect, useRef, useState } from 'react';
import type { AssetResolverPort } from '@boardgame/game-sdk/assets';
import type { GardenView, Orientation } from '../shared/index.js';
import { cellsFor } from '../shared/index.js';
import { z } from 'zod';

const visibleEventSchema = z.object({
  eventId: z.string(), type: z.enum(['choice.submitted', 'choices.revealed', 'energy.resolved', 'domino.placed', 'round.started', 'match.finished']),
});
const eventLabels = {
  'choice.submitted': '一位玩家已保存选择，等待同时公开。',
  'choices.revealed': '本轮选择已公开，可在公开轮次中查看。',
  'energy.resolved': '本轮能量已结算。', 'domino.placed': '骨牌已放置。',
  'round.started': '新一轮已开始。', 'match.finished': '三轮已完成，最终得分已保存。',
};

function GardenImage({ src, className }: { src: string | undefined; className?: string }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? <img src={src} className={className} alt="" onError={() => setFailed(true)} /> : null;
}

function GardenGrid({ view, seatId, assets, interactive, orientation, anchor, invalid, onAnchor }: {
  view: GardenView; seatId: string; assets?: AssetResolverPort | undefined; interactive: boolean;
  orientation: Orientation; anchor: { x: number; y: number } | null; invalid: boolean;
  onAnchor: (x: number, y: number) => void;
}) {
  const board = view.boards[seatId]!;
  const cells = useRef<Array<HTMLButtonElement | null>>([]);
  const [focusedCell, setFocusedCell] = useState(0);
  const occupied = new Map<string, number>();
  board.placements.forEach((placement, index) => cellsFor(placement.x, placement.y, placement.orientation).forEach(([x, y]) => occupied.set(`${x},${y}`, index)));
  const previewCells = anchor ? cellsFor(anchor.x, anchor.y, orientation) : [];
  return <div className="garden-board-wrap">
    <GardenImage key={assets?.resolveImage('board.grid') ?? 'grid'} className="garden-board-art" src={assets?.resolveImage('board.grid')} />
    <div className="garden-grid" role="grid" aria-label={`${seatId === view.viewingSeatId ? '我的' : '玩家'}4乘4花园`}>
      {Array.from({ length: 16 }, (_, index) => {
        const x = index % 4, y = Math.floor(index / 4), placed = occupied.has(`${x},${y}`), previewed = previewCells.some(([cx, cy]) => cx === x && cy === y);
        return <button key={`${x}-${y}`} type="button" role="gridcell" className={`garden-cell${placed ? ' is-placed' : ''}${previewed ? invalid ? ' is-invalid' : ' is-preview' : ''}`}
          aria-label={`${String.fromCharCode(65 + x)}${y + 1}${placed ? '，已占用' : previewed ? invalid ? '，不可放置' : '，放置预览' : '，空格'}`}
          ref={element => { cells.current[index] = element; }}
          tabIndex={interactive && focusedCell === index ? 0 : -1}
          onFocus={() => setFocusedCell(index)}
          onKeyDown={event => {
            let target = index;
            if (event.key === 'ArrowLeft') target = y * 4 + Math.max(0, x - 1);
            else if (event.key === 'ArrowRight') target = y * 4 + Math.min(3, x + 1);
            else if (event.key === 'ArrowUp') target = Math.max(0, y - 1) * 4 + x;
            else if (event.key === 'ArrowDown') target = Math.min(3, y + 1) * 4 + x;
            else if (event.key === 'Home') target = event.ctrlKey ? 0 : y * 4;
            else if (event.key === 'End') target = event.ctrlKey ? 15 : y * 4 + 3;
            else return;
            event.preventDefault();
            cells.current[target]?.focus();
          }}
          disabled={!interactive} onClick={() => onAnchor(x, y)}>
          {placed && <span className="garden-domino" aria-hidden="true"><GardenImage key={assets?.resolveImage('tile.domino') ?? 'domino'} src={assets?.resolveImage('tile.domino')} /><span>{board.placements[occupied.get(`${x},${y}`)!]!.id.split(':').at(-1)}</span></span>}
          {previewed && !placed && <span className="garden-preview" aria-hidden="true" />}
        </button>;
      })}
    </div>
  </div>;
}

export function GridGardenBoard({ view, busy, onAction, assets, events = [] }: {
  view: GardenView; busy: boolean; onAction: (action: unknown) => void; assets?: AssetResolverPort | undefined; events?: unknown[];
}) {
  const [orientation, setOrientation] = useState<Orientation>('H');
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [choiceDraft, setChoiceDraft] = useState<'harvest' | 'build' | null>(null);
  const board = view.boards[view.viewingSeatId]!;
  const interactiveSelect = !busy && view.phase === 'selecting' && view.myChoice === null;
  const interactivePlace = !busy && view.phase === 'placing' && view.builders.includes(view.viewingSeatId) && !view.placedSeatIds.includes(view.viewingSeatId);
  const previewLegal = anchor !== null && view.legalPlacements.some(item => item.x === anchor.x && item.y === anchor.y && item.orientation === orientation);
  const previewReason = !anchor || previewLegal ? '' :
    cellsFor(anchor.x, anchor.y, orientation).some(([x, y]) => x < 0 || x > 3 || y < 0 || y > 3)
      ? '骨牌超出棋盘边界，请更换起点或方向。'
      : '骨牌与已有棋子重叠，请选择两个相邻空格。';
  const submit = (action: unknown) => onAction(action);
  const waitingIds = view.phase === 'selecting' ? view.seats.filter(id => !view.submittedSeatIds.includes(id)) : view.builders.filter(id => !view.placedSeatIds.includes(id));
  useEffect(() => {
    setChoiceDraft(null);
    setAnchor(null);
  }, [view.round, view.viewingSeatId]);
  useEffect(() => {
    if (view.phase !== 'placing' || view.placedSeatIds.includes(view.viewingSeatId)) setAnchor(null);
  }, [view.phase, view.round, view.placedSeatIds, view.viewingSeatId]);
  return <section className="garden-game" aria-label="Grid Garden 对局">
    <header className="garden-status"><div><p className="eyebrow">第 {view.round} / 3 轮</p><h2>{view.phase === 'selecting' ? '秘密选择' : view.phase === 'placing' ? '花园建造' : '游戏结束'}</h2></div>
      <div className="garden-energy"><GardenImage key={assets?.resolveImage('icon.energy') ?? 'energy'} src={assets?.resolveImage('icon.energy')} /><span>能量</span><strong>{board.energy}</strong></div></header>
    {view.phase === 'selecting' && <section className="garden-action-area" aria-label="选择本轮行动">
      {view.myChoice ? <p role="status">你的选择已锁定：{view.myChoice === 'build' ? '建造 -1' : '收获 +2'}。{view.submittedSeatIds.length} / {view.seats.length} 位玩家已提交，等待同时公开。</p> : <>
        <p>选择提交后不能更改。其他玩家暂时看不到你的选择。</p>
        <div className="garden-choice-actions">
          <button aria-pressed={choiceDraft === 'harvest'} disabled={!interactiveSelect} onClick={() => setChoiceDraft('harvest')}><GardenImage key={assets?.resolveImage('icon.harvest') ?? 'harvest'} src={assets?.resolveImage('icon.harvest')} />收获 +2</button>
          <button className="secondary" aria-pressed={choiceDraft === 'build'} disabled={!interactiveSelect || !view.canBuild} onClick={() => setChoiceDraft('build')}><GardenImage key={assets?.resolveImage('icon.build') ?? 'build'} src={assets?.resolveImage('icon.build')} />建造 -1</button>
        </div>
        {choiceDraft && <div className="garden-confirm"><p role="status">待确认草稿：{choiceDraft === 'build' ? '建造' : '收获'}。确认后保存，无法更改。</p><button disabled={!interactiveSelect || choiceDraft === 'build' && !view.canBuild} onClick={() => submit({ type: 'submit_choice', round: view.round, choice: choiceDraft })}>确认选择</button><button className="secondary" disabled={busy} onClick={() => setChoiceDraft(null)}>取消选择</button></div>}
        {!view.canBuild && <p role="status">当前能量不足或花园没有相邻空格，不能建造；仍可选择收获。</p>}
      </>}
      <p className="muted">已提交 {view.submittedSeatIds.length} / {view.seats.length}</p>
    </section>}
    {view.phase !== 'finished' && <p className="action-hint" role="status">{waitingIds.includes(view.viewingSeatId) ? view.phase === 'selecting' ? '请选择收获或建造，再确认选择。' : '请预览位置，再确认放置。' : `等待 ${waitingIds.length} 位玩家：${waitingIds.map(id => `座位 ${view.seats.indexOf(id) + 1}`).join('、')}。`}</p>}
    {view.phase === 'placing' && <section className="garden-action-area">
      {view.builders.includes(view.viewingSeatId) && !view.placedSeatIds.includes(view.viewingSeatId) ? <>
        <p>选择方向，再选择棋盘上的起点。预览后确认落子。键盘可用方向键移动，Enter 或空格选择起点。</p>
        <div className="garden-tools"><div role="group" aria-label="骨牌方向"><button aria-pressed={orientation === 'H'} disabled={busy} onClick={() => setOrientation('H')}>横向 H</button><button className="secondary" aria-pressed={orientation === 'V'} disabled={busy} onClick={() => setOrientation('V')}>纵向 V</button></div>
          <button className="secondary" disabled={busy || !anchor} onClick={() => setAnchor(null)}>取消预览</button></div>
        {anchor && <div className="garden-confirm"><span>{String.fromCharCode(65 + anchor.x)}{anchor.y + 1} · {orientation === 'H' ? '横向' : '纵向'}{previewLegal ? '' : ' · 此位置不可放置'}</span>
          <button disabled={busy || !previewLegal} onClick={() => { const target = anchor; submit({ type: 'place_domino', round: view.round, ...target, orientation }); }}>确认放置</button></div>}
      </> : <p role="status">本轮需要放置骨牌的玩家：{view.builders.map(id => `座位 ${view.seats.indexOf(id) + 1}`).join('、')}。已完成 {view.placedSeatIds.length} / {view.builders.length}。</p>}
      {previewReason && <p role="status">{previewReason}</p>}
    </section>}
    <div className="garden-player-boards">
      {[view.viewingSeatId, ...view.seats.filter(id => id !== view.viewingSeatId)].map(seatId => <section className={seatId === view.viewingSeatId ? 'garden-player garden-player--self' : 'garden-player'} key={seatId}>
        <div className="garden-player-heading"><h3>{seatId === view.viewingSeatId ? '我的花园' : `座位 ${view.seats.indexOf(seatId) + 1}`}</h3><span>{view.boards[seatId]!.energy} 能量</span>{view.phase !== 'selecting' && view.revealedChoices?.[seatId] && <span>{view.revealedChoices[seatId] === 'build' ? '建造' : '收获'}</span>}</div>
        <GardenGrid view={view} seatId={seatId} assets={assets} interactive={interactivePlace && seatId === view.viewingSeatId} orientation={orientation} anchor={seatId === view.viewingSeatId ? anchor : null} invalid={anchor !== null && !previewLegal} onAnchor={(x, y) => { if (interactivePlace && seatId === view.viewingSeatId) setAnchor({ x, y }); }} />
        <p className="muted">{view.boards[seatId]!.placements.length} 枚骨牌 · {view.submittedSeatIds.includes(seatId) ? '已提交' : view.phase === 'selecting' ? '等待选择' : view.placedSeatIds.includes(seatId) ? '已放置' : '等待中'}</p>
      </section>)}
    </div>
    {view.roundResults.length > 0 && <section className="garden-results"><h3>已公开轮次</h3>{view.roundResults.map(result => <p key={result.round}>第 {result.round} 轮 · {view.seats.map(id => `座位 ${view.seats.indexOf(id) + 1}：${result.choices[id] === 'build' ? '建造' : '收获'}，能量 ${result.energy[id]}`).join('；')}</p>)}</section>}
    {view.outcome.status === 'finished' && <section className="garden-results" aria-live="polite"><h3>最终得分</h3><ul>{view.seats.map(id => { const detail = view.outcome.status === 'finished' ? view.outcome.scoreDetails[id]! : { occupied: 0, energy: 0, total: 0 }; return <li key={id}>座位 {view.seats.indexOf(id) + 1}：{detail.total} 分（占格 {detail.occupied} + 能量 {detail.energy}）{view.outcome.status === 'finished' && view.outcome.winners.includes(id) ? ' · 获胜' : ''}</li>; })}</ul></section>}
    {events.length > 0 && <section className="garden-results garden-events"><h3>最近行动</h3><ol>{events.slice(-6).map(raw => {
      const parsed = visibleEventSchema.safeParse(raw);
      return parsed.success ? <li key={parsed.data.eventId}>{eventLabels[parsed.data.type]}</li> : null;
    })}</ol></section>}
  </section>;
}

export function GridGardenAssetPreview({ assets }: { assets: AssetResolverPort }) {
  const view: GardenView = {
    seats: ['preview-a', 'preview-b'],
    viewingSeatId: 'preview-a',
    round: 2,
    phase: 'placing',
    boards: {
      'preview-a': { energy: 4, placements: [{ id: 'preview-a:1', x: 0, y: 0, orientation: 'H' }] },
      'preview-b': { energy: 1, placements: [{ id: 'preview-b:1', x: 1, y: 1, orientation: 'V' }] },
    },
    submittedSeatIds: ['preview-a', 'preview-b'],
    revealedChoices: { 'preview-a': 'build', 'preview-b': 'harvest' },
    myChoice: 'build',
    canBuild: false,
    builders: ['preview-a'],
    placedSeatIds: [],
    roundResults: [{ round: 1, choices: { 'preview-a': 'build', 'preview-b': 'harvest' }, energy: { 'preview-a': 2, 'preview-b': 5 } }],
    outcome: { status: 'ongoing' },
    legalPlacements: [
      { x: 2, y: 0, orientation: 'H' },
      { x: 0, y: 1, orientation: 'V' },
    ],
  };
  return <GridGardenBoard view={view} busy onAction={() => undefined} assets={assets} />;
}
