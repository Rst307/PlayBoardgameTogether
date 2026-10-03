import { z } from 'zod';
import type { GameTutorial } from '@boardgame/game-sdk/tutorial';
import { actionSchema, viewSchema, type AzulAction } from '../shared/index.js';
import { practiceScenes } from './tutorial-scenes.js';

const projections = z.object({
  base: viewSchema,
  scenes: z.array(z.object({
    id: z.string(), initial: viewSchema.partial(), action: actionSchema,
    changes: viewSchema.partial(), events: z.array(z.unknown()),
  })),
}).parse(practiceScenes);
const lessons = [
  {
    title: '从工厂选一整组', focusArea: '花砖供应区',
    instruction: '你的目标是铺出高分彩墙。点击「工厂 1 钴蓝 2块」，再点第 2 图案行，最后「确认选砖」。一次必须拿走该来源的全部同色砖，放在同一行，不能拆分。',
    feedback: '两块钴蓝填满第 2 行，工厂剩下的琥珀和朱红进入中央。随后轮到对手；图案行填满还不会立刻得分，要等所有工厂和中央取空。',
  },
  {
    title: '同色续填与墙面限制', focusArea: '你的花砖板',
    instruction: '独立练习：第 3 行已有一块钴蓝。选择「工厂 1 钴蓝 2块」，填入第 3 行并确认。未满行只接受同色；第 2 墙行已铺钴蓝，所以对应图案行不可再放钴蓝。',
    feedback: '第 3 行现在是 3/3。空图案行可以选择颜色，有砖后只能续填同色；满行不能追加，同一墙行每种颜色只能铺一次。选择砖组后，高亮的行就是合法位置。',
  },
  {
    title: '容量与溢出', focusArea: '你的花砖板',
    instruction: '选择「工厂 1 钴蓝 2块」，这次放入第 1 行并确认。第 1 行只能放一块，观察确认区的「溢出 1 块」预告；每行容量分别是 1、2、3、4、5。',
    feedback: '一块填满第 1 行，另一块落到地板，结算时会扣分。选砖前先算容量，不能把多余砖拆给其他图案行。确认前可以取消选择或按 Escape。',
  },
  {
    title: '中央取砖与下轮先手', focusArea: '花砖供应区',
    instruction: '选择「中央 琥珀 2块」，放入第 2 行并确认。首次从中央取砖，除了同色砖，还必须领取「1」先手标记；剩下的朱红仍留在中央。',
    feedback: '你填满琥珀行，并把先手标记放入地板：它占一个扣分格，但让你下轮先手。之后从中央取砖的人不再领取标记；工厂取砖不会获得标记。',
  },
  {
    title: '轮末铺墙与保留未满行', focusArea: '你的花砖板',
    instruction: '只剩最后一块：选择「工厂 1 钴蓝 1块」，放入第 1 行并确认。所有砖源取空后，从上到下处理满图案行，每行仅一块铺到墙上对应颜色的位置。',
    feedback: '钴蓝落位获得 1 分，其他满行的多余砖会弃置，图案行清空。第 5 行的两块朱红没有填满，因此保留到下一轮。工厂自动补砖；袋空时回收弃砖。',
  },
  {
    title: '交叉连线，拿下六分', focusArea: '你的花砖板',
    instruction: '选择「工厂 1 钴蓝 1块」，填满第 3 行并确认。目标位置四周已有砖：横向连成 3 格，纵向也连成 3 格。看这次交织连线的落砖和加分动画。',
    feedback: '这块砖获得 3＋3＝6 分！横、竖连续线分别计算，两方向都连线时，新砖在两条线里各算一次；只连一个方向时只算那条线，孤立砖得 1 分。',
  },
  {
    title: '地板扣分，最低零分', focusArea: '你的花砖板',
    instruction: '你当前只有 1 分，地板已有两块琥珀。选择「中央 朱红 1块」，点击「全部放地板」并确认；没有合适图案行时也可以主动放地板。',
    feedback: '朱红与先手标记使地板占 4 格，名义扣分 1＋1＋2＋2＝6，但实际只扣 1，最低零分。地板清空，你下轮先手。七格扣分依次为 1/1/2/2/2/3/3，满后多余砖直接弃置。',
  },
  {
    title: '完工与终局奖励', focusArea: '你的花砖板',
    instruction: '最后的独立场景：选择「工厂 1 钴蓝 1块」，放入第 1 行并确认。它会补齐一条横行；任意玩家完成横行，会在本轮铺墙及地板扣分后结束游戏。',
    feedback: '这块交叉连线先得 10 分，再加完整横行 ×1＝2、完整竖列 ×3＝21、钴蓝五砖集齐＝10，共从 10 分升至 53 分！最终分数最高者获胜；同分比较完整横行数，再同分共享胜利。学会了，回详情开一桌吧。',
  },
];
function sameAction(left: AzulAction, right: AzulAction): boolean {
  return left.source === right.source && left.color === right.color && left.row === right.row;
}
export const azulTutorial: GameTutorial = {
  title: '花砖物语上手教程',
  description: '八个短练习，从第一组选砖到高分连线和终局。每课使用独立的固定场景，直接在真实游戏桌面练习。',
  steps: projections.scenes.map((scene, index) => {
    const lesson = lessons[index];
    if (!lesson) throw new Error('Tutorial lesson unavailable');
    const view = viewSchema.parse({ ...projections.base, ...scene.initial });
    const after = viewSchema.parse({ ...view, ...scene.changes });
    return {
      id: scene.id, title: lesson.title, instruction: lesson.instruction, focusArea: lesson.focusArea,
      initial: { view, events: [] },
      onAction({ action: raw, frame }) {
        const parsed = actionSchema.safeParse(raw);
        const current = viewSchema.parse(frame.view);
        if (!parsed.success || !sameAction(parsed.data, scene.action) ||
            !current.legalActions.some(candidate => sameAction(candidate, parsed.data))) {
          return { accepted: false, feedback: `这一步请按提示操作：${lesson.instruction}` };
        }
        return {
          accepted: true, complete: true, feedback: lesson.feedback,
          frame: structuredClone({ view: after, events: scene.events }),
        };
      },
    };
  }),
};
