import { describe, expect, it, vi } from 'vitest';
import { BoardAudio } from '../../apps/web/src/assets/board-audio.js';

describe('animation audio grants', () => {
  it('only plays granted live events and deduplicates each move and scoring impact', () => {
    const play = vi.fn();
    const audio = new BoardAudio(() => 0, play);
    audio.playCue('snapshot', 'round.scored', '0');
    expect(play).not.toHaveBeenCalled();
    audio.authorize('live');
    audio.playCue('live', 'tiles.drafted', 'move:0');
    audio.playCue('live', 'round.scored', 'score:0');
    audio.playCue('live', 'round.scored', 'score:0');
    audio.playCue('live', 'round.scored', 'score:1');
    expect(play.mock.calls.flat()).toEqual(['tiles.drafted', 'round.scored', 'round.scored']);
  });
  it('expires remaining beats after mute, disconnect, ownership change or leaving', () => {
    let epoch = 0;
    const play = vi.fn();
    const audio = new BoardAudio(() => epoch, play);
    audio.authorize('old');
    epoch++;
    audio.authorize('old');
    audio.playCue('old', 'round.scored', 'later');
    expect(play).not.toHaveBeenCalled();
    audio.authorize('new');
    audio.playCue('new', 'match.finished', 'victory');
    expect(play).toHaveBeenCalledOnce();
  });
  it('bounds event retention and rejects old animation requests', () => {
    const play = vi.fn();
    const audio = new BoardAudio(() => 0, play);
    for (let index = 0; index <= 100; index++) audio.authorize(String(index));
    audio.playCue('0', 'round.scored', 'late');
    expect(play).not.toHaveBeenCalled();
    audio.playCue('100', 'round.scored', 'current');
    expect(play).toHaveBeenCalledOnce();
  });
});
