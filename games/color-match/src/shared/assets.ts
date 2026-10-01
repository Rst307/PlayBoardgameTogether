import type {
  AssetContract,
  PresentationCue,
} from "@boardgame/game-sdk/assets";

export const colorAssetContract: AssetContract = {
  id: "color-match-assets",
  version: "1.0.0",
  gameId: "color-match",
  slots: [
    ...["red", "blue", "green", "yellow"].flatMap((color) =>
      Array.from({ length: 5 }, (_, index) => ({
        key: `card.${color}.${index + 1}`,
        kind: "image" as const,
        required: true,
        label: `${color} ${index + 1}`,
        aspectRatio: 2 / 3,
      })),
    ),
    {
      key: "card.back.default",
      kind: "image",
      required: true,
      label: "牌背",
      aspectRatio: 2 / 3,
    },
    {
      key: "board.table",
      kind: "image",
      required: true,
      label: "桌面",
      aspectRatio: 16 / 9,
    },
    {
      key: "icon.draw",
      kind: "image",
      required: true,
      label: "摸牌",
      aspectRatio: 1,
    },
    ...["play", "draw", "turn", "finish"].map((name) => ({
      key: `sound.${name}`,
      kind: "audio" as const,
      required: false,
      label: name,
    })),
  ],
  cues: [
    {
      id: "card.played",
      audience: "projected-public",
      group: "cards",
      priority: 2,
    },
    {
      id: "card.drawn",
      audience: "projected-public",
      group: "cards",
      priority: 1,
    },
    { id: "turn.started", audience: "self", group: "turn", priority: 5 },
    {
      id: "match.finished",
      audience: "projected-public",
      group: "finish",
      priority: 10,
    },
  ],
};

/** Receives only already projected events and this recipient's View. No State access. */
export function colorPresentationCues(
  events: Array<Record<string, unknown>>,
  view: unknown,
): PresentationCue[] {
  const cues: PresentationCue[] = [];
  for (const event of events) {
    if (typeof event.eventId !== "string") continue;
    const cueId =
      event.type === "card.played"
        ? "card.played"
        : event.type === "card.draw" && Number(event.count) > 0
          ? "card.drawn"
          : event.type === "game.win"
            ? "match.finished"
            : undefined;
    if (cueId) cues.push({ eventId: event.eventId, cueIndex: 0, cueId });
  }
  if (
    events.length &&
    view &&
    typeof view === "object" &&
    "currentPlayerId" in view &&
    "viewingSeatId" in view &&
    "phase" in view &&
    view.phase === "play" &&
    view.currentPlayerId === view.viewingSeatId
  ) {
    const eventId = events.at(-1)?.eventId;
    if (typeof eventId === "string")
      cues.push({ eventId, cueIndex: 1, cueId: "turn.started" });
  }
  return cues;
}
