import type { Color, SplendorView, Token } from '../shared/index.js';
import { names } from '../shared/index.js';

export function selectGem(view: SplendorView, chosen: Color[], color: Token): {
  colors: Color[]; error: string;
} {
  const reject = (error: string) => ({ colors: chosen, error });
  if (color === 'gold') return reject('黄金不能直接拿取；预留一张卡可获得一枚黄金。');
  if (view.bank[color] === 0) return reject(names[color] + '库存已空，请选择其他宝石。');
  const count = chosen.filter(item => item === color).length;
  let next: Color[];
  if (count === 2) next = [];
  else if (count === 1 && chosen.length > 1) next = chosen.filter(item => item !== color);
  else if (count === 1) {
    if (view.bank[color] < 4) return reject('拿两枚同色宝石时，该颜色库存至少需要 4 枚。可在下方点击已选宝石取消。');
    next = [color, color];
  } else {
    if (chosen.length === 2 && chosen[0] === chosen[1]) return reject('两枚同色不能混拿其他颜色，请先清空选择。');
    if (chosen.length === 3) return reject('每次最多拿三种不同颜色，请先取消一枚已选宝石。');
    next = [...chosen, color];
  }
  const fits = view.legalActions.some(action => {
    if (action.type !== 'take') return false;
    return next.every(item => next.filter(value => value === item).length <= action.colors.filter(value => value === item).length);
  });
  if (next.length && !fits) return reject('当前组合不可拿取，请选择三种不同颜色或库存足够的两枚同色。');
  return { colors: next, error: '' };
}
