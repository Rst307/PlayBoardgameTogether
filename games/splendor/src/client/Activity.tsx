import { playerLabel, type PlayerNames } from '@boardgame/game-sdk/presentation';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { cards, nobles } from '../shared/catalog.js';
import { names, type SplendorView } from '../shared/index.js';
import { Gem, Visual } from './visuals.js';

const eventSchema = z.discriminatedUnion('type', [
  z.object({ eventId: z.string(), type: z.literal('turn.played'), seatId: z.string(),
    action: z.enum(['take', 'buy', 'reserve', 'reserve_deck', 'return', 'noble', 'pass']), cardId: z.string().optional() }),
  z.object({ eventId: z.string(), type: z.literal('noble.arrived'), seatId: z.string(), nobleId: z.string() }),
  z.object({ eventId: z.string(), type: z.literal('match.finished'), winners: z.array(z.string()) }),
]);
const labels = { take: '拿取了宝石', buy: '购买了发展卡', reserve: '预留了一张市场卡',
  reserve_deck: '盲抽预留了一张卡', return: '退回了一枚代币', noble: '选择了贵族', pass: '无可用行动，跳过回合' };

export function Activity({ events, view, playerNames }: { events: unknown[]; view: SplendorView; playerNames?: PlayerNames | undefined }) {
  const parsed = events.flatMap(raw => {
    const result = eventSchema.safeParse(raw);
    return result.success ? [result.data] : [];
  });
  const unique = [...new Map(parsed.map(event => [event.eventId, event])).values()];
  const last = [...unique].reverse().find(event => event.type === 'turn.played');
  const [dismissed, setDismissed] = useState<string>();
  useEffect(() => {
    if (!last) return;
    const timer = setTimeout(() => setDismissed(last.eventId), 5000);
    return () => clearTimeout(timer);
  }, [last?.eventId]);
  const seatName = (seat: string) => playerLabel(seat, view.seats, view.viewingSeatId, playerNames, '座位');
  const card = last?.type === 'turn.played' && last.action === 'buy' ? cards.find(item => item.id === last.cardId) : undefined;
  const describe = (event: z.infer<typeof eventSchema>) => {
    if (event.type === 'match.finished') return '本局结束';
    if (event.type === 'noble.arrived') return seatName(event.seatId) + '迎来了' + (nobles.find(item => item.id === event.nobleId)?.name ?? '贵族');
    const bought = event.action === 'buy' ? cards.find(item => item.id === event.cardId) : undefined;
    return seatName(event.seatId) + labels[event.action] + (bought ? ' · ' + names[bought.bonus] + '折扣 +1 · ' + bought.points + '声望' : '');
  };
  return <section className="sp-activity" aria-label="公开行动记录">
    <h3>桌面动态 <span>仅展示公开行动</span></h3>
    {last && dismissed !== last.eventId && <div key={last.eventId} className="sp-action-reveal" role="status">
      {card && <div className="sp-action-card"><Visual assetKey={card.id} className="sp-card-face"><Gem color={card.bonus} /></Visual></div>}
      <div><strong>{describe(last)}</strong><small>{card ? '卡牌已加入商会，市场已补牌。' : '行动已保存，桌面已同步。'}</small></div>
    </div>}
    {unique.length ? <ol>{unique.slice(-6).reverse().map(event => <li key={event.eventId}>{describe(event)}</li>)}</ol> :
      <p>对手拿取、购买与预留后，会在这里显示。刷新不重播历史动画。</p>}
  </section>;
}
