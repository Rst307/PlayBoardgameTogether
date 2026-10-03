import type { AssetContract, PackManifest } from "@boardgame/game-sdk/assets";
import { AssetResolver } from "./resolver.js";

export type AudioPreferences = { muted: boolean; game: number; ui: number };
type Voice = {
  source: AudioBufferSourceNode;
  gain: GainNode;
  channel: "game" | "ui";
  level: number;
  group: string;
  priority: number;
};
export class AudioManager {
  private context: AudioContext | undefined;
  private generation = 0;
  private voices = new Set<Voice>();
  private cache = new Map<string, AudioBuffer>();
  private pending = new Map<string, Promise<AudioBuffer>>();
  private cooldown = new Map<string, number>();
  private account = "";
  preferences: AudioPreferences = { muted: false, game: 0.5, ui: 0.3 };
  available = false;
  owner = false;
  get playbackEpoch() { return this.generation; }
  setAccount(account: string) {
    if (this.account === account) return;
    this.clear();
    this.account = account;
    this.preferences = { muted: false, game: 0.5, ui: 0.3 };
    try {
      const value: unknown = JSON.parse(
        localStorage.getItem(`boardgame:audio:${account}`) ?? "null",
      );
      if (
        value &&
        typeof value === "object" &&
        "muted" in value &&
        typeof value.muted === "boolean" &&
        "game" in value &&
        typeof value.game === "number" &&
        "ui" in value &&
        typeof value.ui === "number"
      )
        this.setPreferences(
          { muted: value.muted, game: value.game, ui: value.ui },
          false,
        );
    } catch {
      /* Damaged preferences use safe defaults. */
    }
  }
  async unlock() {
    try {
      this.context ??= new AudioContext();
      await this.context.resume();
      this.available = this.context.state === "running";
      return this.available;
    } catch {
      this.available = false;
      return false;
    }
  }
  setPreferences(value: AudioPreferences, persist = true) {
    this.preferences = {
      muted: value.muted,
      game: Math.max(
        0,
        Math.min(1, Number.isFinite(value.game) ? value.game : 0.5),
      ),
      ui: Math.max(0, Math.min(1, Number.isFinite(value.ui) ? value.ui : 0.3)),
    };
    if (value.muted) this.invalidate();
    for (const voice of this.voices)
      voice.gain.gain.value = voice.level * this.preferences[voice.channel];
    if (persist && this.account)
      try {
        localStorage.setItem(
          `boardgame:audio:${this.account}`,
          JSON.stringify(this.preferences),
        );
      } catch {
        /* Storage failure does not affect playback controls. */
      }
  }
  invalidate() {
    this.generation++;
    for (const voice of this.voices) {
      try {
        voice.source.stop();
      } catch {
        /* Already ended. */
      }
      voice.source.disconnect();
      voice.gain.disconnect();
    }
    this.voices.clear();
  }
  clear() {
    this.invalidate();
    this.cache.clear();
    this.pending.clear();
    this.cooldown.clear();
    this.owner = false;
  }
  dispose() {
    this.clear();
    void this.context?.close().catch(() => undefined);
    this.context = undefined;
    this.available = false;
    this.account = "";
  }
  private async buffer(url: string) {
    const known = this.cache.get(url);
    if (known) {
      this.cache.delete(url);
      this.cache.set(url, known);
      return known;
    }
    const pending = this.pending.get(url);
    if (pending) return pending;
    const generation = this.generation;
    const promise = (async () => {
      const response = await fetch(url, {
        credentials: "same-origin",
        signal: AbortSignal.timeout(1000),
      });
      if (
        !response.ok ||
        Number(response.headers.get("content-length")) > 5 * 1024 * 1024
      )
        throw new Error("Audio unavailable");
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > 5 * 1024 * 1024)
        throw new Error("Audio too large");
      const buffer = await this.context!.decodeAudioData(bytes);
      if (buffer.duration > 10 || buffer.numberOfChannels > 2)
        throw new Error("Audio limits");
      if (generation === this.generation) {
        this.cache.set(url, buffer);
        let size = 0;
        for (const value of this.cache.values())
          size += value.length * value.numberOfChannels * 4;
        while (size > 16 * 1024 * 1024 && this.cache.size) {
          const key = this.cache.keys().next().value!;
          const old = this.cache.get(key)!;
          size -= old.length * old.numberOfChannels * 4;
          this.cache.delete(key);
        }
      }
      return buffer;
    })().finally(() => {
      if (this.pending.get(url) === promise) this.pending.delete(url);
    });
    this.pending.set(url, promise);
    return promise;
  }
  async play(
    cue: string,
    manifest: PackManifest,
    contract: AssetContract,
    preview = false,
  ) {
    const mapping = manifest.sounds[cue],
      definition = contract.cues.find((item) => item.id === cue);
    const url =
      mapping && new AssetResolver(manifest).resolveSound(mapping.assetKey);
    if (!mapping || !definition || !url) return;
    await this.playFile(
      url,
      mapping.gain,
      preview ? "ui" : "game",
      definition.group,
      definition.priority,
      mapping.cooldownMs,
      preview,
    );
  }
  async playFile(
    url: string,
    level = 0.7,
    channel: "game" | "ui" = "ui",
    group = "preview",
    priority = 1,
    cooldownMs = 100,
    preview = true,
  ) {
    const context = this.context,
      generation = this.generation,
      started = performance.now();
    if (
      !context ||
      context.state !== "running" ||
      this.preferences.muted ||
      document.hidden ||
      (!preview && !this.owner)
    )
      return;
    if (
      (this.cooldown.get(group) ?? -Infinity) + Math.max(80, cooldownMs) >
      started
    )
      return;
    this.cooldown.set(group, started);
    try {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const buffer = await Promise.race([
        this.buffer(url),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error("Audio expired")), 1000);
        }),
      ]).finally(() => clearTimeout(timeout));
      if (
        generation !== this.generation ||
        performance.now() - started > 1000 ||
        this.preferences.muted ||
        document.hidden ||
        context.state !== "running" ||
        (!preview && !this.owner)
      )
        return;
      if ([...this.voices].filter((v) => v.group === group).length >= 2) return;
      if (this.voices.size >= 8) {
        const lowest = [...this.voices].sort(
          (a, b) => a.priority - b.priority,
        )[0]!;
        if (lowest.priority >= priority) return;
        lowest.source.stop();
        this.voices.delete(lowest);
      }
      const source = context.createBufferSource(),
        gain = context.createGain();
      source.buffer = buffer;
      const safeLevel = Math.min(1, Math.max(0, level));
      gain.gain.value = safeLevel * this.preferences[channel];
      source.connect(gain).connect(context.destination);
      const voice: Voice = {
        source,
        gain,
        channel,
        level: safeLevel,
        group,
        priority,
      };
      this.voices.add(voice);
      source.onended = () => {
        this.voices.delete(voice);
        source.disconnect();
        gain.disconnect();
      };
      source.start();
    } catch {
      /* Sound is best effort; it must never affect game commands. */
    }
  }
  async test() {
    if (!(await this.unlock()) || this.preferences.muted || document.hidden)
      return false;
    const context = this.context!,
      samples = Math.round(context.sampleRate * 0.15),
      buffer = context.createBuffer(1, samples, context.sampleRate),
      channel = buffer.getChannelData(0);
    for (let i = 0; i < samples; i++)
      channel[i] =
        Math.sin((i / context.sampleRate) * 660 * 2 * Math.PI) *
        Math.sin((Math.PI * i) / samples) *
        0.12;
    const source = context.createBufferSource(),
      gain = context.createGain();
    source.buffer = buffer;
    gain.gain.value = this.preferences.ui;
    source.connect(gain).connect(context.destination);
    const voice: Voice = {
      source,
      gain,
      channel: "ui",
      level: 1,
      group: "test",
      priority: 0,
    };
    if (this.voices.size >= 8) return false;
    this.voices.add(voice);
    source.onended = () => {
      this.voices.delete(voice);
      source.disconnect();
      gain.disconnect();
    };
    source.start();
    return true;
  }
}
export const audioManager = new AudioManager();

/** Web Locks also covers multiple simultaneously visible windows. Ownership requires a fresh baseline. */
export function ownAudio(
  accountId: string,
  matchId: string,
  onOwner: () => Promise<void>,
) {
  let disposed = false,
    release: (() => void) | undefined,
    pending = false;
  const acquire = () => {
    if (disposed || document.hidden || pending || release || !navigator.locks)
      return;
    pending = true;
    void navigator.locks
      .request(
        `boardgame:audio:${accountId}:${matchId}`,
        { ifAvailable: true },
        async (lock) => {
          if (!lock || disposed || document.hidden) return;
          await new Promise<void>((resolve) => {
            release = resolve;
            void onOwner()
              .then(() => {
                if (!disposed && !document.hidden && release === resolve)
                  audioManager.owner = true;
              })
              .catch(() => undefined);
          });
          audioManager.owner = false;
          audioManager.invalidate();
          release = undefined;
        },
      )
      .finally(() => {
        pending = false;
      });
  };
  const visibility = () => {
    audioManager.owner = false;
    audioManager.invalidate();
    if (document.hidden) release?.();
    else acquire();
  };
  document.addEventListener("visibilitychange", visibility);
  const timer = setInterval(acquire, 1000);
  acquire();
  return () => {
    disposed = true;
    clearInterval(timer);
    document.removeEventListener("visibilitychange", visibility);
    audioManager.owner = false;
    audioManager.clear();
    release?.();
  };
}
