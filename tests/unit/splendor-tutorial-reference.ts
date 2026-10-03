import { DeterministicRng } from '@boardgame/game-sdk';
import { splendorExtension as game, type SplendorState } from '../../games/splendor/src/server/index.js';
import { cards, cardById } from '../../games/splendor/src/shared/catalog.js';
import { emptyTokens, type SplendorAction, type Token } from '../../games/splendor/src/shared/index.js';

const seats = ['tutorial.you', 'tutorial.opponent'];
function scene(): SplendorState {
  return game.setup({ seats, options: {}, rng: new DeterministicRng(42) }).state;
}
function grant(state: SplendorState, color: Token, amount: number) {
  state.bank[color] -= amount;
  state.players[seats[0]!]!.tokens[color] += amount;
}
function own(state: SplendorState, id: string, seat = seats[0]!) {
  const tier = cardById(id).tier - 1;
  const row = state.market[tier]!;
  const deck = state.decks[tier]!;
  const index = row.indexOf(id);
  if (index >= 0) row[index] = deck.pop()!;
  else deck.splice(deck.indexOf(id), 1);
  state.players[seat]!.purchased.push(id);
}
function expose(state: SplendorState, id: string) {
  const tier = cardById(id).tier - 1;
  const deck = state.decks[tier]!;
  if (state.market[tier]!.includes(id)) return;
  deck.splice(deck.indexOf(id), 1);
  deck.push(state.market[tier]![0]!);
  state.market[tier]![0] = id;
}

/** Synthetic reference states stay in tests; only getView/projectEvents enter the tutorial. */
export function splendorTutorialReferences(): { id: string; state: SplendorState; actions: SplendorAction[] }[] {
  const three = scene();
  const two = scene();
  const buy = scene();
  expose(buy, 'card.white.4');
  grant(buy, 'red', 2);
  grant(buy, 'black', 1);
  const discount = scene();
  own(discount, 'card.blue.0');
  own(discount, 'card.blue.1');
  expose(discount, 'card.white.6');
  grant(discount, 'blue', 1);
  const reserve = scene();
  expose(reserve, 'card.white.6');
  const blind = scene();
  const gold = scene();
  const deck = gold.decks[0]!;
  const row = gold.market[0]!;
  const index = row.indexOf('card.white.6');
  if (index >= 0) row[index] = deck.pop()!;
  else deck.splice(deck.indexOf('card.white.6'), 1);
  gold.players[seats[0]!]!.reserved.push('card.white.6');
  grant(gold, 'blue', 2);
  grant(gold, 'gold', 1);
  const overflow = scene();
  for (const color of ['white', 'blue', 'green'] as const) grant(overflow, color, 3);
  const noble = scene();
  for (const color of ['white', 'blue', 'green'] as const) {
    for (const card of cards.filter(card => card.bonus === color && card.points === 0).slice(0, color === 'green' ? 3 : 4)) {
      own(noble, card.id);
    }
  }
  noble.nobles = ['noble.1', 'noble.2', 'noble.0'];
  expose(noble, 'card.green.4');
  const final = scene();
  for (const id of ['card.white.15', 'card.blue.15', 'card.green.15']) own(final, id);
  expose(final, 'card.white.13');
  grant(final, 'white', 4);
  grant(final, 'gold', 1);
  const finish = scene();
  finish.turn = 1;
  finish.finalRound = true;
  // Viewer is the last player for this independent final-round lesson.
  finish.seats = [seats[1]!, seats[0]!];
  for (const id of ['card.white.15', 'card.blue.15', 'card.green.15', 'card.red.13']) own(finish, id, seats[1]!);
  expose(finish, 'card.white.4');
  grant(finish, 'red', 2);
  grant(finish, 'black', 1);
  return [
    { id: 'take-three', state: three, actions: [{ type: 'take', colors: ['white', 'blue', 'green'] }] },
    { id: 'take-two', state: two, actions: [{ type: 'take', colors: ['red', 'red'] }] },
    { id: 'buy', state: buy, actions: [{ type: 'buy', cardId: 'card.white.4', payment: { ...emptyTokens(), red: 2, black: 1 } }] },
    { id: 'discount', state: discount, actions: [{ type: 'buy', cardId: 'card.white.6', payment: { ...emptyTokens(), blue: 1 } }] },
    { id: 'reserve', state: reserve, actions: [{ type: 'reserve', cardId: 'card.white.6' }] },
    { id: 'blind', state: blind, actions: [{ type: 'reserve_deck', tier: 1 }] },
    { id: 'gold', state: gold, actions: [{ type: 'buy', cardId: 'card.white.6', payment: { ...emptyTokens(), blue: 2, gold: 1 } }] },
    { id: 'return', state: overflow, actions: [{ type: 'take', colors: ['white', 'blue', 'black'] }, { type: 'return', color: 'white' }, { type: 'return', color: 'blue' }] },
    { id: 'noble', state: noble, actions: [{ type: 'buy', cardId: 'card.green.4', payment: emptyTokens() }, { type: 'noble', nobleId: 'noble.2' }] },
    { id: 'final-round', state: final, actions: [{ type: 'buy', cardId: 'card.white.13', payment: { ...emptyTokens(), white: 4, gold: 1 } }] },
    { id: 'finish', state: finish, actions: [{ type: 'buy', cardId: 'card.white.4', payment: { ...emptyTokens(), red: 2, black: 1 } }] },
  ];
}
