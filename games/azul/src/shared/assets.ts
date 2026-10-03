import type { AssetContract, PresentationCue } from '@boardgame/game-sdk/assets';

export const azulAssetContract: AssetContract = {
  id: 'azul-assets', version: '1.0.0', gameId: 'azul.base',
  slots: ['draft', 'score', 'finish'].map(name => ({ key: `sound.${name}`, kind: 'audio', required: false, label: name })),
  cues: [
    { id: 'tiles.drafted', audience: 'projected-public', group: 'azul', priority: 3 },
    { id: 'round.scored', audience: 'projected-public', group: 'azul-score', priority: 7 },
    { id: 'match.finished', audience: 'projected-public', group: 'finish', priority: 10 },
  ],
};
export function azulPresentationCues(events: Array<Record<string, unknown>>): PresentationCue[] {
  return events.flatMap((event, index) => typeof event.eventId === 'string' && azulAssetContract.cues.some(cue => cue.id === event.type)
    ? [{ eventId: event.eventId, cueIndex: index, cueId: String(event.type) }] : []);
}
