import { colors, type Card, type Noble } from './index.js';

// Base-game functional values independently cross-checked against two matching CSV tables.
// https://github.com/bouk/splendimax/blob/master/Splendor%20Cards.csv
// https://github.com/seal256/splendor/blob/master/assets/cards.csv
// Row order: tier, points, white, blue, green, red, black. Original art is separate.
const rows: Record<string, number[][]> = {
  white: [
    [1, 0, 0, 1, 1, 1, 1],
    [1, 0, 0, 1, 2, 1, 1],
    [1, 0, 0, 2, 2, 0, 1],
    [1, 0, 3, 1, 0, 0, 1],
    [1, 0, 0, 0, 0, 2, 1],
    [1, 0, 0, 2, 0, 0, 2],
    [1, 0, 0, 3, 0, 0, 0],
    [1, 1, 0, 0, 4, 0, 0],
    [2, 1, 0, 0, 3, 2, 2],
    [2, 1, 2, 3, 0, 3, 0],
    [2, 2, 0, 0, 1, 4, 2],
    [2, 2, 0, 0, 0, 5, 3],
    [2, 2, 0, 0, 0, 5, 0],
    [2, 3, 6, 0, 0, 0, 0],
    [3, 3, 0, 3, 3, 5, 3],
    [3, 4, 0, 0, 0, 0, 7],
    [3, 4, 3, 0, 0, 3, 6],
    [3, 5, 3, 0, 0, 0, 7],
  ],
  blue: [
    [1, 0, 1, 0, 1, 1, 1],
    [1, 0, 1, 0, 1, 2, 1],
    [1, 0, 1, 0, 2, 2, 0],
    [1, 0, 0, 1, 3, 1, 0],
    [1, 0, 1, 0, 0, 0, 2],
    [1, 0, 0, 0, 2, 0, 2],
    [1, 0, 0, 0, 0, 0, 3],
    [1, 1, 0, 0, 0, 4, 0],
    [2, 1, 0, 2, 2, 3, 0],
    [2, 1, 0, 2, 3, 0, 3],
    [2, 2, 5, 3, 0, 0, 0],
    [2, 2, 2, 0, 0, 1, 4],
    [2, 2, 0, 5, 0, 0, 0],
    [2, 3, 0, 6, 0, 0, 0],
    [3, 3, 3, 0, 3, 3, 5],
    [3, 4, 7, 0, 0, 0, 0],
    [3, 4, 6, 3, 0, 0, 3],
    [3, 5, 7, 3, 0, 0, 0],
  ],
  green: [
    [1, 0, 1, 1, 0, 1, 1],
    [1, 0, 1, 1, 0, 1, 2],
    [1, 0, 0, 1, 0, 2, 2],
    [1, 0, 1, 3, 1, 0, 0],
    [1, 0, 2, 1, 0, 0, 0],
    [1, 0, 0, 2, 0, 2, 0],
    [1, 0, 0, 0, 0, 3, 0],
    [1, 1, 0, 0, 0, 0, 4],
    [2, 1, 3, 0, 2, 3, 0],
    [2, 1, 2, 3, 0, 0, 2],
    [2, 2, 4, 2, 0, 0, 1],
    [2, 2, 0, 5, 3, 0, 0],
    [2, 2, 0, 0, 5, 0, 0],
    [2, 3, 0, 0, 6, 0, 0],
    [3, 3, 5, 3, 0, 3, 3],
    [3, 4, 0, 7, 0, 0, 0],
    [3, 4, 3, 6, 3, 0, 0],
    [3, 5, 0, 7, 3, 0, 0],
  ],
  red: [
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 2, 1, 1, 0, 1],
    [1, 0, 2, 0, 1, 0, 2],
    [1, 0, 1, 0, 0, 1, 3],
    [1, 0, 0, 2, 1, 0, 0],
    [1, 0, 2, 0, 0, 2, 0],
    [1, 0, 3, 0, 0, 0, 0],
    [1, 1, 4, 0, 0, 0, 0],
    [2, 1, 2, 0, 0, 2, 3],
    [2, 1, 0, 3, 0, 2, 3],
    [2, 2, 1, 4, 2, 0, 0],
    [2, 2, 3, 0, 0, 0, 5],
    [2, 2, 0, 0, 0, 0, 5],
    [2, 3, 0, 0, 0, 6, 0],
    [3, 3, 3, 5, 3, 0, 3],
    [3, 4, 0, 0, 7, 0, 0],
    [3, 4, 0, 3, 6, 3, 0],
    [3, 5, 0, 0, 7, 3, 0],
  ],
  black: [
    [1, 0, 1, 1, 1, 1, 0],
    [1, 0, 1, 2, 1, 1, 0],
    [1, 0, 2, 2, 0, 1, 0],
    [1, 0, 0, 0, 1, 3, 1],
    [1, 0, 0, 0, 2, 1, 0],
    [1, 0, 2, 0, 2, 0, 0],
    [1, 0, 0, 0, 3, 0, 0],
    [1, 1, 0, 4, 0, 0, 0],
    [2, 1, 3, 2, 2, 0, 0],
    [2, 1, 3, 0, 3, 0, 2],
    [2, 2, 0, 1, 4, 2, 0],
    [2, 2, 0, 0, 5, 3, 0],
    [2, 2, 5, 0, 0, 0, 0],
    [2, 3, 0, 0, 0, 0, 6],
    [3, 3, 3, 3, 5, 3, 0],
    [3, 4, 0, 0, 0, 7, 0],
    [3, 4, 0, 0, 3, 6, 3],
    [3, 5, 0, 0, 0, 7, 3],
  ],
};
export const cards: Card[] = colors.flatMap(bonus => rows[bonus]!.map((row, index) => ({
  id: 'card.' + bonus + '.' + index, tier: row[0]!, bonus, points: row[1]!,
  cost: { white: row[2]!, blue: row[3]!, green: row[4]!, red: row[5]!, black: row[6]! },
})));
const requirements = [
  [0,0,4,4,0],[0,4,4,0,0],[4,4,0,0,0],[4,0,0,0,4],[0,0,0,4,4],
  [0,3,3,3,0],[3,0,0,3,3],[3,3,0,0,3],[0,0,3,3,3],[3,3,3,0,0],
];
const nobleNames = ['翡翠侯爵','海港公爵','白塔夫人','夜石伯爵','蔷薇女爵','丝路领主','花园夫人','北境公爵','暮光伯爵','黎明女爵'];
export const nobles: Noble[] = requirements.map((row, index) => ({
  id: 'noble.' + index, name: nobleNames[index]!, points: 3,
  requirement: { white: row[0]!, blue: row[1]!, green: row[2]!, red: row[3]!, black: row[4]! },
}));
export const cardById = (id: string): Card => {
  const card = cards.find(item => item.id === id);
  if (!card) throw new Error('Unknown development card');
  return card;
};
export const nobleById = (id: string): Noble => {
  const noble = nobles.find(item => item.id === id);
  if (!noble) throw new Error('Unknown noble');
  return noble;
};
