import type { AvailableGame } from './game-catalog.js';

// Presentation only: these defaults do not select rules, assets or game behavior.
const builtInArt: Record<string, string> = {
  'azul.base': 'azul',
  'color-match': 'color-match',
  'grid-garden': 'grid-garden',
  'splendor.base': 'splendor',
  'demo.counter-room': 'counter',
};

export function defaultGameArt(id: string) {
  const art = builtInArt[id];
  return {
    iconUrl: art ? `/game-art/${art}-icon.svg` : null,
    coverUrl: art ? `/game-art/${art}.svg` : null,
    backgroundUrl: art ? `/game-art/${art}.svg` : null,
  };
}

export function gameArt(game: AvailableGame) {
  const defaults = defaultGameArt(game.id);
  return {
    iconUrl: game.presentation?.iconUrl ?? defaults.iconUrl,
    coverUrl: game.presentation?.coverUrl ?? defaults.coverUrl,
    backgroundUrl: game.presentation?.backgroundUrl ?? defaults.backgroundUrl,
  };
}
