import type { PresentationCue } from "@boardgame/game-sdk/assets";

/** A message contains the entire projected revision batch. Closing its watermark is O(1). */
export class PresentationConsumer {
  private watermark = -1;
  private ready = false;
  private generation = 0;
  reset() {
    this.ready = false;
    this.generation++;
  }
  baseline(revision: number) {
    this.watermark = Math.max(this.watermark, revision);
    this.ready = true;
  }
  consume(
    matchId: string,
    revision: number,
    cues: PresentationCue[],
    live: boolean,
    play: (cue: PresentationCue, generation: number) => void,
  ) {
    if (!live || !this.ready || revision <= this.watermark) return;
    this.watermark = revision;
    const seen = new Set<string>();
    for (const cue of cues) {
      if (!cue.eventId.startsWith(`${matchId}:${revision}:`)) continue;
      const key = `${cue.eventId}:${cue.cueIndex}`;
      if (seen.has(key)) continue;
      seen.add(key);
      play(cue, this.generation);
    }
  }
}
