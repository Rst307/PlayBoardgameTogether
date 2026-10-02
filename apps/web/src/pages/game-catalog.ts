import { useEffect, useState } from 'react';
import { z } from 'zod';
import { api } from '../platform.js';

const catalogSchema = z.array(z.object({
  id: z.string(), version: z.string(), name: z.string(), description: z.string(),
  players: z.object({ min: z.number().int(), max: z.number().int() }),
  developmentOnly: z.boolean(),
}));
export type AvailableGame = z.infer<typeof catalogSchema>[number];
export const gamePath = (game: Pick<AvailableGame, 'id' | 'version'>) =>
  `/games/${encodeURIComponent(game.id)}/${encodeURIComponent(game.version)}`;

export async function loadGames() {
  return catalogSchema.parse(await api.games<unknown>()).filter(game => !game.developmentOnly);
}

export function useGameCatalog() {
  const [games, setGames] = useState<AvailableGame[]>();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false;
    setGames(undefined); setError('');
    void loadGames().then(items => { if (!disposed) setGames(items); })
      .catch(() => { if (!disposed) setError('无法加载游戏，请检查连接后重试。'); });
    return () => { disposed = true; };
  }, [attempt]);
  return { games, error, retry: () => setAttempt(value => value + 1) };
}
