import { useState } from 'react';
import { ColorBoard } from '@boardgame/color-match/client';
import type { ColorView } from '@boardgame/color-match/shared';
import { GridGardenBoard } from '@boardgame/grid-garden/client';
import type { GardenView } from '@boardgame/grid-garden/shared';
import { listLegalPlacements } from '@boardgame/grid-garden/shared';
import { ActionHint, GameErrorBoundary, PageFeedback } from '@boardgame/ui';

const scenes = {
  'login-error': '登录错误', 'lobby-empty': '大厅空状态', 'create': '创建表单', 'room-two': '两人准备', 'room-four': '四人准备',
  'color-play': 'Color Match · 本人行动', 'color-long': 'Color Match · 长手牌', 'color-target': 'Color Match · 选择目标', 'color-wait': 'Color Match · 等待', 'color-finished': 'Color Match · 结束',
  'garden-start': 'Grid Garden · 初始', 'garden-saved': 'Grid Garden · 已提交', 'garden-place': 'Grid Garden · 多人放置 / 横竖预览', 'garden-revealed': 'Grid Garden · 上轮公开', 'garden-tie': 'Grid Garden · 并列结果',
  submitting: '提交中', unknown: '结果未知', conflict: '明确冲突', offline: '离线', reconnecting: '重新连接', expired: '会话失效',
  'ai-thinking': 'AI 思考', 'ai-fallback': '脚本兜底', 'ai-blocked': 'AI 受阻', 'missing-assets': '资源缺失', muted: '总静音', 'audio-locked': '音频未启用', 'render-error': '扩展渲染失败',
} as const;
type Scene = keyof typeof scenes;
const seats = ['sample-a', 'sample-b', 'sample-c', 'sample-d'];

function colorView(scene: Scene): ColorView {
  const myHand: ColorView['myHand'] = Array.from({ length: scene === 'color-long' ? 20 : 5 }, (_, index) => ({ id: `sample-card-${index}`, contentId: `card-${index}`, color: (['red', 'blue', 'yellow', 'green'] as const)[index % 4]!, number: index % 5 + 1 }));
  const finished = scene === 'color-finished';
  return {
    seats, viewingSeatId: seats[0]!, myHand, handCounts: Object.fromEntries(seats.map((id, index) => [id, index === 0 ? myHand.length : 5])),
    topCard: { id: 'public-card', contentId: 'red-3', color: 'red', number: 3 }, deckCount: 9,
    currentPlayerId: finished ? null : scene === 'color-wait' ? seats[1]! : seats[0]!, phase: finished ? 'finished' : scene === 'color-target' ? 'choose_target' : 'play',
    winner: finished ? seats[1]! : null, winners: finished ? [seats[1]!] : [],
    legalCardIds: finished || scene === 'color-wait' || scene === 'color-target' ? [] : myHand.filter(card => card.color === 'red' || card.number === 3).map(card => card.id),
    canDraw: !finished && scene !== 'color-wait' && scene !== 'color-target', targetSeatIds: scene === 'color-target' ? seats.slice(1) : [],
  };
}

function gardenView(scene: Scene): GardenView {
  const placing = scene === 'garden-place', finished = scene === 'garden-tie', saved = scene === 'garden-saved';
  return {
    seats, viewingSeatId: seats[0]!, round: finished ? 3 : placing || scene === 'garden-revealed' ? 2 : 1, phase: finished ? 'finished' : placing ? 'placing' : 'selecting',
    boards: Object.fromEntries(seats.map(id => [id, { energy: finished ? 9 : placing ? 4 : 3, placements: placing ? [{ id: `${id}:1`, x: 0, y: 0, orientation: 'H' as const }] : [] }])),
    submittedSeatIds: saved ? [seats[0]!] : placing || finished ? seats : [], revealedChoices: placing ? Object.fromEntries(seats.map(id => [id, 'build' as const])) : null,
    myChoice: saved || placing ? 'build' : null, canBuild: !finished && !saved && !placing, builders: placing ? seats : [], placedSeatIds: [],
    roundResults: finished ? [1, 2, 3].map(round => ({ round, choices: Object.fromEntries(seats.map(id => [id, 'harvest' as const])), energy: Object.fromEntries(seats.map(id => [id, 3 + 2 * round])) })) :
      placing || scene === 'garden-revealed' ? [{ round: 1, choices: Object.fromEntries(seats.map(id => [id, 'harvest' as const])), energy: Object.fromEntries(seats.map(id => [id, 5])) }] : [],
    outcome: finished ? { status: 'finished', scores: Object.fromEntries(seats.map(id => [id, 4])), scoreDetails: Object.fromEntries(seats.map(id => [id, { occupied: 0, energy: 4, total: 4 }])), winners: seats } : { status: 'ongoing' },
    legalPlacements: placing ? listLegalPlacements([{ id: 'sample-a:1', x: 0, y: 0, orientation: 'H' }]) : [],
  };
}
function BrokenSurface(): never { throw new Error('anonymous-ui-render-fixture'); }
const feedback: Partial<Record<Scene, string>> = {
  unknown: '尚未确认这次操作，正在查询结果。', conflict: '局面已变化，请检查当前状态并再次确认。', offline: '连接中断，操作已暂停。',
  expired: '会话已失效，重新登录可恢复对局。', 'ai-thinking': '座位 2 · 脚本 AI 正在思考', 'ai-fallback': '模型暂时不可用，本次由脚本完成操作。', 'ai-blocked': 'AI 暂时受阻，请检查配置或收回控制。',
  'missing-assets': '图片未能加载，保留文字桌面。', muted: '总静音，所有行动和结果仍有文字反馈。', 'audio-locked': '声音尚未启用，可通过声音设置中的启用入口解锁。',
};
export default function UiScenes() {
  const [scene, setScene] = useState<Scene>('color-play');
  const [notice, setNotice] = useState('');
  const action = () => setNotice('开发演示：已记录点击，未发送网络请求或保存游戏。');
  return <>
    <section className="page-heading"><div><p className="eyebrow">UI_FIXTURES_STAGE_9</p><h1>界面固定场景</h1><p>匿名公开 View，仅供开发；不会创建房间、调用模型或播放事件音效。</p></div></section>
    <label className="form-stack fixture-toolbar">场景<select value={scene} onChange={event => { setScene(event.target.value as Scene); setNotice(''); }}>{Object.entries(scenes).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>
    {notice && <ActionHint title={notice} />}
    <div key={scene}>
      {scene.startsWith('color-') && <ColorBoard view={colorView(scene)} busy={false} events={[]} onAction={action} />}
      {scene.startsWith('garden-') && <GridGardenBoard view={gardenView(scene)} busy={false} onAction={action} />}
      {scene.startsWith('room-') && <><h2>好友的游戏桌</h2><div className="seat-grid">{seats.slice(0, scene === 'room-two' ? 2 : 4).map((id, index) => <article className="panel seat-card" key={id}><p className="eyebrow">座位 {index + 1}</p><h2>{['小林', '阿河', '小杉', '小安'][index]}</h2><p>{index === 0 ? '这是你 · 房主' : '真人'} · 已准备 · 在线</p></article>)}</div><button onClick={action}>开始游戏</button></>}
      {(scene === 'login-error' || scene === 'create') && <section className="panel auth-card"><h2>{scene === 'create' ? '创建房间' : '回到游戏桌'}</h2><form className="form-stack" onSubmit={event => { event.preventDefault(); action(); }}><label>{scene === 'create' ? '房间名' : '用户名'}<input defaultValue="好友的游戏桌" /></label>{scene === 'create' ? <><label>游戏与版本<select><option>Color Match · 1.0.0</option><option>Grid Garden · 1.0.0</option></select></label><label>人数<input type="number" defaultValue={4} min={2} max={4} /></label></> : <><label>密码<input type="password" /></label><p className="error-notice" role="alert">用户名或密码不正确，或账户已停用。</p></>}<button>{scene === 'create' ? '创建并生成邀请码' : '登录'}</button></form></section>}
      {scene === 'lobby-empty' && <PageFeedback title="还没有房间">创建一个房间，或使用朋友的邀请码加入。<p><button onClick={action}>创建房间</button></p></PageFeedback>}
      {scene === 'render-error' && <GameErrorBoundary><BrokenSurface /></GameErrorBoundary>}
      {(scene === 'submitting' || scene === 'reconnecting') && <PageFeedback title={scene === 'submitting' ? '正在保存操作…' : '重新连接并恢复局面…'} loading />}
      {feedback[scene] && <ActionHint title={feedback[scene]!}>{['unknown', 'expired', 'ai-blocked'].includes(scene) && <button onClick={action}>{scene === 'unknown' ? '确认操作结果' : scene === 'expired' ? '前往登录' : '收回控制'}</button>}</ActionHint>}
      {scene === 'conflict' && <GridGardenBoard view={gardenView('garden-place')} busy={false} onAction={action} />}
      {scene === 'missing-assets' && <ColorBoard view={colorView('color-play')} busy={false} events={[]} onAction={action} />}
    </div>
  </>;
}

