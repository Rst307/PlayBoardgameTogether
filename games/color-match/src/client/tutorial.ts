import type { GameTutorial, TutorialFrame, TutorialStep } from '@boardgame/game-sdk/tutorial';
import { actionSchema, viewSchema, type Card, type ColorView } from '../shared/index.js';

const me = 'tutorial.you';
const opponent = 'tutorial.opponent';
const card = (color: Card['color'], number: number): Card => ({
  id: `card.${color}.${number}.0`, contentId: `card.${color}.${number}`, color, number,
});

function scene(hand: Card[], topCard: Card): TutorialFrame {
  const view: ColorView = {
    seats: [me, opponent], viewingSeatId: me, myHand: hand,
    handCounts: { [me]: hand.length, [opponent]: 3 }, topCard, deckCount: 12,
    currentPlayerId: me, phase: 'play', winner: null, winners: [],
    legalCardIds: hand.filter(item => item.color === topCard.color || item.number === topCard.number).map(item => item.id),
    canDraw: true, targetSeatIds: [],
  };
  return { view, events: [] };
}

function playStep(input: {
  id: string; title: string; instruction: string; hand: Card[]; top: Card; expected: Card;
  success: string; target?: boolean;
}): TutorialStep {
  return {
    id: input.id, title: input.title, instruction: input.instruction,
    focusArea: '我的手牌', initial: scene(input.hand, input.top),
    onAction({ action: raw, frame }) {
      const parsed = actionSchema.safeParse(raw);
      const view = viewSchema.parse(frame.view);
      if (!parsed.success) return { accepted: false, feedback: '请按提示在桌面选择并确认操作。' };
      const action = parsed.data;
      if (view.phase === 'choose_target') {
        if (action.type !== 'choose_target' || !view.targetSeatIds.includes(action.targetSeatId)) {
          return { accepted: false, feedback: '选择座位 2 的「指定摸牌」，再确认目标。' };
        }
        const next: ColorView = {
          ...view, phase: 'play', currentPlayerId: opponent, targetSeatIds: [],
          deckCount: view.deckCount - 1,
          handCounts: { ...view.handCounts, [opponent]: view.handCounts[opponent]! + 1 },
        };
        return { accepted: true, complete: true, feedback: input.success, frame: {
          view: next, events: [...frame.events,
            { eventId: `${input.id}.target`, type: 'target.chosen', seatId: me, targetSeatId: opponent },
            { eventId: `${input.id}.draw`, type: 'card.draw', seatId: opponent, count: 1 }],
        } };
      }
      if (action.type !== 'play_card' || action.cardId !== input.expected.id || !view.legalCardIds.includes(action.cardId)) {
        return { accepted: false, feedback: `请按本步提示操作：${input.instruction} 暂时不用摸牌。` };
      }
      const hand = view.myHand.filter(item => item.id !== action.cardId);
      const finished = hand.length === 0 && !input.target;
      const next: ColorView = {
        ...view, myHand: hand, topCard: input.expected,
        handCounts: { ...view.handCounts, [me]: hand.length },
        legalCardIds: [], canDraw: false,
        phase: input.target ? 'choose_target' : finished ? 'finished' : 'play',
        currentPlayerId: input.target ? me : finished ? null : opponent,
        targetSeatIds: input.target ? [opponent] : [],
        winner: finished ? me : null, winners: finished ? [me] : [],
      };
      return { accepted: true, complete: !input.target,
        feedback: input.target ? '数字 5 已打出。现在点击座位 2 的「指定摸牌」，再点击「确认目标」。' : input.success,
        frame: { view: next, events: [
          { eventId: `${input.id}.play`, type: 'card.played', seatId: me, card: input.expected },
          ...(finished ? [{ eventId: `${input.id}.win`, type: 'game.win', seatId: me }] : []),
        ] },
      };
    },
  };
}

export const colorMatchTutorial: GameTutorial = {
  title: 'Color Match 上手教程',
  description: '五个短练习，亲手出牌、摸牌和指定目标。每一步使用独立的固定练习场景。',
  steps: [
    playStep({ id: 'color', title: '匹配颜色',
      instruction: '选择「红 3」，再点击「出牌」。它与公共牌「红 1」颜色相同。',
      hand: [card('red', 3), card('blue', 2)], top: card('red', 1), expected: card('red', 3),
      success: '出牌成功！颜色相同就能出牌，不要求数字也相同。接下来试试匹配数字。' }),
    playStep({ id: 'number', title: '匹配数字',
      instruction: '选择「蓝 3」，再点击「出牌」。它与公共牌「红 3」数字相同。',
      hand: [card('blue', 3), card('green', 2)], top: card('red', 3), expected: card('blue', 3),
      success: '数字相同也能出牌！打出后，公共牌变成了蓝 3。' }),
    {
      id: 'draw', title: '没有匹配牌时摸牌', focusArea: '我的手牌',
      instruction: '两张手牌都不匹配「红 1」。点击「摸牌或跳过并结束回合」。',
      initial: scene([card('blue', 2), card('green', 4)], card('red', 1)),
      onAction({ action, frame }) {
        const parsed = actionSchema.safeParse(action);
        if (!parsed.success || parsed.data.type !== 'draw_card') {
          return { accepted: false, feedback: '这一步请点击「摸牌或跳过并结束回合」。' };
        }
        const view = viewSchema.parse(frame.view);
        return { accepted: true, complete: true,
          feedback: '摸到一张黄 2，手牌增加到 3 张，并交给对手行动。本游戏摸牌后直接结束回合。',
          frame: { view: { ...view, myHand: [...view.myHand, card('yellow', 2)],
            handCounts: { ...view.handCounts, [me]: 3 }, deckCount: 11,
            currentPlayerId: opponent, canDraw: false, legalCardIds: [] },
          events: [{ eventId: 'draw.card', type: 'card.draw', seatId: me, count: 1 }] },
        };
      },
    },
    playStep({ id: 'target', title: '数字 5 与目标选择',
      instruction: '选择「蓝 5」，再点击「出牌」。然后指定对手摸一张牌。',
      hand: [card('blue', 5), card('yellow', 2)], top: card('blue', 3), expected: card('blue', 5), target: true,
      success: '目标已确认！对手摸了一张牌，手牌从 3 张变成 4 张。数字 5 必须完成目标选择才结束行动。' }),
    playStep({ id: 'win', title: '打完手牌获胜',
      instruction: '选择最后一张「绿 2」，再点击「出牌」。',
      hand: [card('green', 2)], top: card('yellow', 2), expected: card('green', 2),
      success: '你赢了！普通牌打完手牌立即结算；最后一张是数字 5 时，还需要先确认目标。' }),
  ],
};
