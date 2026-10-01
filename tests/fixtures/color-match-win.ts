import { colorMatchExtension } from '../../games/color-match/src/server/index.js';

// Preserve the full deck while arranging one legal final card for the actor.
export function winningPosition(saved: unknown, seatId?: string) {
  const state = colorMatchExtension.deserialize(saved);
  const actor = seatId ?? state.currentPlayerId!;
  state.deck.push(...state.hands[actor]!);
  const index = state.deck.findIndex(card => card.number !== 5);
  const [card] = state.deck.splice(index, 1);
  if (!card) throw new Error('Expected a non-target card');
  state.hands[actor] = [card];
  const topIndex = state.deck.findIndex(other => other.color === card.color);
  const [top] = state.deck.splice(topIndex, 1);
  if (!top) throw new Error('Expected a matching top card');
  state.discardPile.push(top);
  state.currentPlayerId = actor;
  state.phase = 'play';
  return { state: colorMatchExtension.serialize(state), action: { type: 'play_card' as const, cardId: card.id } };
}
