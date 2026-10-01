import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioManager } from "../../apps/web/src/assets/audio-manager.js";

const evidence: {
  started: number;
  stopped: number;
  gains: Array<{ value: number }>;
} = { started: 0, stopped: 0, gains: [] };
class Context {
  state = "suspended";
  sampleRate = 24000;
  destination = {};
  async resume() {
    this.state = "running";
  }
  async close() {
    this.state = "closed";
  }
  async decodeAudioData() {
    return { duration: 0.2, numberOfChannels: 1, length: 4800 };
  }
  createGain() {
    const gain = { value: 0 };
    evidence.gains.push(gain);
    return { gain, connect: () => ({}), disconnect: () => undefined };
  }
  createBufferSource() {
    return {
      buffer: null,
      onended: undefined,
      connect: () => ({ connect: () => undefined }),
      disconnect: () => undefined,
      start: () => {
        evidence.started++;
      },
      stop: () => {
        evidence.stopped++;
      },
    };
  }
}
describe("audio cancellation, preferences and bounds", () => {
  let manager: AudioManager;
  beforeEach(() => {
    evidence.started = 0;
    evidence.stopped = 0;
    evidence.gains = [];
    vi.stubGlobal("AudioContext", Context);
    vi.stubGlobal("document", { hidden: false });
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(new Uint8Array(50), {
            headers: { "content-length": "50" },
          }),
      ),
    );
    manager = new AudioManager();
    manager.setAccount("one");
    manager.owner = true;
  });
  afterEach(() => {
    manager.dispose();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  it("drops locked and muted requests without accumulating a queue, changes active gain immediately", async () => {
    await manager.playFile("/audio");
    expect(evidence.started).toBe(0);
    await manager.unlock();
    await manager.playFile("/audio", 0.8, "game", "first", 1, 100, false);
    expect(evidence.started).toBe(1);
    expect(evidence.gains[0]!.value).toBe(0.4);
    manager.setPreferences({ muted: false, game: 0.25, ui: 0.3 });
    expect(evidence.gains[0]!.value).toBe(0.2);
    manager.setPreferences({ muted: true, game: 0.25, ui: 0.3 });
    expect(evidence.stopped).toBe(1);
    await manager.playFile("/audio", 0.8, "game", "muted", 1, 100, false);
    manager.setPreferences({ muted: false, game: 0.25, ui: 0.3 });
    expect(evidence.started).toBe(1);
    manager.setAccount("two");
    expect(manager.preferences.game).toBe(0.5);
    manager.setAccount("one");
    expect(manager.preferences.game).toBe(0.25);
  });
  it("drops late loads after deadline and after leaving the previous game", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
    await manager.unlock();
    let finish: (response: Response) => void = () => undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      ),
    );
    const late = manager.playFile("/late");
    await vi.advanceTimersByTimeAsync(1001);
    await late;
    finish(new Response(new Uint8Array(40)));
    await Promise.resolve();
    await Promise.resolve();
    expect(evidence.started).toBe(0);
    const previous = manager.playFile(
      "/previous",
      0.7,
      "game",
      "another",
      1,
      100,
      false,
    );
    manager.clear();
    finish(new Response(new Uint8Array(40)));
    await previous;
    expect(evidence.started).toBe(0);
  });
  it("enforces 8 global voices, 2 per group, cooldown and background suppression", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
    await manager.unlock();
    for (let i = 0; i < 12; i++)
      await manager.playFile(`/a${i}`, 0.5, "game", `group${i}`, 1, 100, false);
    expect(evidence.started).toBe(8);
    manager.clear();
    manager.owner = true;
    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(200);
      await manager.playFile(`/g${i}`, 0.5, "game", "same", 1, 100, false);
    }
    expect(evidence.started).toBe(10);
    vi.stubGlobal("document", { hidden: true });
    await manager.playFile("/hidden", 0.5, "game", "hidden", 1, 100, false);
    expect(evidence.started).toBe(10);
  });
  it("handles decode, resume and fetch failures without rejecting gameplay", async () => {
    vi.stubGlobal(
      "AudioContext",
      class extends Context {
        override async resume() {
          throw new Error("blocked");
        }
      },
    );
    expect(await manager.unlock()).toBe(false);
    manager.dispose();
    manager = new AudioManager();
    vi.stubGlobal("AudioContext", Context);
    await manager.unlock();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    await expect(manager.playFile("/missing")).resolves.toBeUndefined();
    expect(evidence.started).toBe(0);
  });
});
