import { z } from 'zod';
import type { GameTutorial } from '@boardgame/game-sdk/tutorial';
import { actionSchema, tokenColors, viewSchema, type SplendorAction } from '../shared/index.js';
import { practiceScenes } from './tutorial-scenes.js';

const projections = z.object({
  base: viewSchema,
  scenes: z.array(z.object({
    id: z.string(), initial: viewSchema.partial(),
    moves: z.array(z.object({
      action: actionSchema, changes: viewSchema.partial(), events: z.array(z.unknown()),
    })).min(1),
  })),
}).parse(practiceScenes);
const scenes = projections.scenes.map(scene => {
  let view = viewSchema.parse({ ...projections.base, ...scene.initial });
  const initial = { view, events: [] };
  const moves = scene.moves.map(move => {
    view = viewSchema.parse({ ...view, ...move.changes });
    return { action: move.action, frame: { view, events: move.events } };
  });
  return { id: scene.id, initial, moves };
});
const lessons = [
  {
    title: '拿取三种宝石', focusArea: '公共宝石库存',
    instruction: '目标是积累发展卡和声望。先点击库存中的钻石、蓝宝石、祖母绿各一次，再点击「确认拿取」。每回合只做一个主行动，黄金不能直接拿取。',
    feedback: ['已拿到三色各一枚，交给对手行动。宝石用于支付发展卡费用；点击已选宝石可以取消，确认前也能清空。'],
  },
  {
    title: '拿取同色两枚', focusArea: '公共宝石库存',
    instruction: '连续点击红宝石两次，再「确认拿取」。只有拿取前该色库存至少 4 枚时，才能一次拿同色两枚；不能混成两枚同色加一枚异色。',
    feedback: ['你拿了两枚红宝石。三色各一枚和同色两枚是两种互斥的拿取方式；可用颜色不足三种时，拿取全部可用颜色各一枚。'],
  },
  {
    title: '购买第一张发展卡', focusArea: '发展卡市场',
    instruction: '在最下方市场选择「钻石矿场，0 声望」中费用为 2 红宝石、1 缟玛瑙的卡，再「确认购买」。你已持有足够代币，点击卡牌可以查看费用。',
    feedback: ['代币已支付回库存，发展卡留在你的商会，提供永久钻石折扣 +1。零声望卡也有价值：折扣会让以后购买更便宜。市场空位自动补牌。'],
  },
  {
    title: '永久折扣不会消耗', focusArea: '发展卡市场',
    instruction: '这是独立场景，你已有 2 个蓝宝石永久折扣。选择最下方费用为 3 蓝宝石的钻石矿场，再「确认购买」：只需支付 1 枚蓝宝石代币。',
    feedback: ['只支付了 1 枚蓝宝石，两个永久蓝宝石折扣仍然保留。折扣按颜色抵扣，可以叠加，但不能当代币拿取或退回。'],
  },
  {
    title: '预留卡牌并获得黄金', focusArea: '发展卡市场',
    instruction: '选择最下方费用为 3 蓝宝石的钻石矿场，点击「确认预留」。预留是本回合的主行动，不会同时购买；你最多持有 3 张预留卡。',
    feedback: ['卡牌进入「我的预留卡」，你获得 1 枚黄金。只有你能看见预留卡身份，对手只看到数量；库存没有黄金时仍能预留。'],
  },
  {
    title: '从牌堆盲抽预留', focusArea: '发展卡市场',
    instruction: '点击最下方「盲抽1级牌堆」的牌背，再「确认盲抽预留」。这次不选择公开市场卡，确认后才能看到自己抽到的卡。',
    feedback: ['你盲抽预留了一级牌堆顶牌，并获得 1 枚黄金。它同样占用一个预留名额，对手看不到牌的身份。'],
  },
  {
    title: '用黄金购买自己的预留卡', focusArea: '我的预留卡',
    instruction: '在「我的预留卡」选择费用为 3 蓝宝石的钻石矿场，再「确认购买」。你只有 2 枚蓝宝石，缺少的 1 枚由黄金替代。',
    feedback: ['支付 2 蓝宝石和 1 黄金，预留卡转为已购发展卡，预留名额释放。黄金可替代任意颜色的费用，但不会变成永久折扣。'],
  },
  {
    title: '超过十枚时退回代币', focusArea: '公共宝石库存',
    instruction: '你已有 9 枚代币。点击钻石、蓝宝石、缟玛瑙各一次，再「确认拿取」。随后依次点击「退回钻石」「退回蓝宝石」，直到剩下 10 枚。',
    feedback: [
      '现在有 12 枚代币，必须退回两枚才能结束回合。先点击「退回钻石」；刚拿到的宝石和黄金都可以退回。',
      '还剩 11 枚，再点击「退回蓝宝石」。退币完成前仍然是你的回合。',
      '代币回到 10 枚，回合正式结束。拿取或预留超过上限都必须先退币，再结算贵族和回合。',
    ],
  },
  {
    title: '获得贵族的三点声望', focusArea: '发展卡市场',
    instruction: '你有钻石 4、蓝宝石 4、祖母绿 3 个永久折扣。选择最下方费用为 2 钻石、1 蓝宝石的祖母绿矿场，免费「确认购买」。随后点击贵族「白塔夫人」。',
    feedback: [
      '祖母绿折扣达到 4，同时满足海港公爵与白塔夫人的要求。请选择「白塔夫人」到访；每回合最多获得一位贵族。',
      '白塔夫人带来 3 声望，不支付或消耗永久折扣。只满足一位时自动到访，满足多位时需要选择一位，随后结束回合。',
    ],
  },
  {
    title: '十五声望开启最终轮', focusArea: '发展卡市场',
    instruction: '你已有 12 声望和 1 个钻石折扣。选择中间市场费用为 6 钻石的「钻石商会，3 声望」，再「确认购买」，支付 4 钻石和 1 黄金。',
    feedback: ['你达到 15 声望，开启最终轮，但没有立即获胜。对手作为最后一个座位仍有一次行动，让所有玩家回合数相同。'],
  },
  {
    title: '最后一个座位行动与结算', focusArea: '发展卡市场',
    instruction: '新的独立场景：对手已触发最终轮，你是本轮最后一个座位。选择最下方费用为 2 红宝石、1 缟玛瑙的钻石矿场，再「确认购买」，完成最终轮。',
    feedback: ['最终轮结束，最高声望的对手获胜。声望相同时，购买发展卡更少者胜；仍相同则共享胜利。你已学会完整回合，可以返回游戏详情开桌。'],
  },
];

function sameAction(left: SplendorAction, right: SplendorAction): boolean {
  if (left.type === 'take' && right.type === 'take') {
    return [...left.colors].sort().join() === [...right.colors].sort().join();
  }
  if (left.type === 'buy' && right.type === 'buy') {
    return left.cardId === right.cardId && tokenColors.every(color => left.payment[color] === right.payment[color]);
  }
  return JSON.stringify(left) === JSON.stringify(right);
}

export const splendorTutorial: GameTutorial = {
  title: '璀璨宝石上手教程',
  description: '十一个短练习，从拿取宝石到最终轮结算。使用真实游戏桌面，每课都是独立的固定练习场景。',
  steps: scenes.map((scene, index) => {
    const lesson = lessons[index];
    if (!lesson || lesson.feedback.length !== scene.moves.length) throw new Error('Tutorial lesson unavailable');
    return {
      id: scene.id, title: lesson.title, instruction: lesson.instruction,
      focusArea: lesson.focusArea, initial: scene.initial,
      onAction({ action: raw, frame }) {
        const parsed = actionSchema.safeParse(raw);
        const view = viewSchema.parse(frame.view);
        // Every accepted move adds at least one projected event. No hidden practice state needed.
        const moveIndex = scene.moves.findIndex((_, position) =>
          (position === 0 ? 0 : scene.moves[position - 1]!.frame.events.length) === frame.events.length);
        const move = scene.moves[moveIndex];
        if (!parsed.success || !move || !sameAction(parsed.data, move.action) ||
            !view.legalActions.some(candidate => sameAction(candidate, parsed.data))) {
          return { accepted: false, feedback: moveIndex > 0
            ? lesson.feedback[moveIndex - 1]!
            : `这一步请按提示操作：${lesson.instruction}` };
        }
        return {
          accepted: true, complete: moveIndex === scene.moves.length - 1,
          feedback: lesson.feedback[moveIndex]!, frame: structuredClone(move.frame),
        };
      },
    };
  }),
};
