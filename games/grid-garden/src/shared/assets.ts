import type { AssetContract, PresentationCue } from '@boardgame/game-sdk/assets';

export const gridGardenAssetContract: AssetContract = {
  id: 'grid-garden-assets', version: '1.0.0', gameId: 'grid-garden',
  slots: [
    { key: 'board.grid', kind: 'image', required: false, label: '花园棋盘', aspectRatio: 1 },
    { key: 'tile.domino', kind: 'image', required: false, label: '骨牌', aspectRatio: 2 },
    { key: 'icon.energy', kind: 'image', required: false, label: '能量', aspectRatio: 1 },
    { key: 'icon.harvest', kind: 'image', required: false, label: '收获', aspectRatio: 1 },
    { key: 'icon.build', kind: 'image', required: false, label: '建造', aspectRatio: 1 },
    ...['sound.reveal', 'sound.place', 'sound.finish'].map(key => ({ key, kind: 'audio' as const, required: false, label: key.slice(6) })),
  ],
  cues: [
    { id: 'choices.revealed', audience: 'projected-public', group: 'garden', priority: 5 },
    { id: 'domino.placed', audience: 'projected-public', group: 'garden', priority: 3 },
    { id: 'match.finished', audience: 'projected-public', group: 'finish', priority: 10 },
  ],
};

export function gridGardenPresentationCues(events: Array<Record<string, unknown>>): PresentationCue[] {
  return events.flatMap((event, index) => {
    if (typeof event.eventId !== 'string') return [];
    if (event.type === 'choices.revealed') return [{ eventId: event.eventId, cueIndex: index * 2, cueId: 'choices.revealed' }];
    if (event.type === 'domino.placed') return [{ eventId: event.eventId, cueIndex: index * 2, cueId: 'domino.placed' }];
    if (event.type === 'match.finished') return [{ eventId: event.eventId, cueIndex: index * 2, cueId: 'match.finished' }];
    return [];
  });
}
