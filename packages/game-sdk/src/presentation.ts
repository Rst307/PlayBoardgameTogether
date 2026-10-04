/** Public presentation metadata, separate from authoritative game state. */
export type PlayerNames = Readonly<Record<string, string>>;

export function playerLabel(
  seatId: string, seats: readonly string[], viewingSeatId: string,
  names?: PlayerNames, fallback = '玩家',
): string {
  const name = names?.[seatId]?.trim();
  if (name) return name + (seatId === viewingSeatId ? '（你）' : '');
  return seatId === viewingSeatId ? '你' : `${fallback} ${seats.indexOf(seatId) + 1}`;
}
