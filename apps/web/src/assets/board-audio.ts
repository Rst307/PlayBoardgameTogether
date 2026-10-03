import type { PresentationAudioPort } from '@boardgame/game-sdk/assets';

/** A bounded live-event grant. Invalidation also expires every later animation beat. */
export class BoardAudio {
  private events = new Map<string, { epoch: number; played: Set<string> }>();

  constructor(private epoch: () => number, private play: (cueId: string) => void) {}

  authorize(eventId: string) {
    if (this.events.has(eventId)) return;
    this.events.set(eventId, { epoch: this.epoch(), played: new Set() });
    if (this.events.size > 100) this.events.delete(this.events.keys().next().value!);
  }

  playCue: PresentationAudioPort = (eventId, cueId, key) => {
    const event = this.events.get(eventId);
    const identity = JSON.stringify([cueId, key]);
    if (!event || event.epoch !== this.epoch() || event.played.has(identity) || event.played.size >= 256) return;
    event.played.add(identity);
    this.play(cueId);
  };
}
