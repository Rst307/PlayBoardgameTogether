import type { AvailableGame } from './game-catalog.js';

// Presentation only: these defaults do not select rules, assets or game behavior.
const builtInArt: Record<string, string> = {
  'azul.base': 'azul',
  'color-match': 'color-match',
  'grid-garden': 'grid-garden',
  'splendor.base': 'splendor',
  'demo.counter-room': 'counter',
};

// Game-owned art is imported with its reviewed repository snapshot. Vite emits
// content-hashed URLs, so a new catalog illustration cannot replace a cached one.
const pixelAvatars: Partial<Record<string, string>> = {
  'color-match': new URL('../../../../games/color-match/art/icon.png', import.meta.url).href,
  'grid-garden': new URL('../../../../games/grid-garden/art/icon.png', import.meta.url).href,
  'splendor.base': new URL('../../../../games/splendor/art/icon.png', import.meta.url).href,
  'azul.base': new URL('../../../../games/azul/art/icon.png', import.meta.url).href,
};

export function defaultGameArt(id: string) {
  const art = builtInArt[id];
  return {
    iconUrl: pixelAvatars[id] ?? (art ? `/game-art/${art}-icon.svg` : null),
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
