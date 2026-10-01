import { describe, expect, it } from "vitest";
import { packManifestSchema, parseAssetJson } from "@boardgame/game-sdk/assets";
import { PresentationConsumer } from "../../apps/web/src/assets/presentation.js";
import { colorPresentationCues } from "@boardgame/color-match/assets";
import { validateMedia } from "../../apps/api/src/assets/media.js";
import { demoPng, demoWav } from "../../scripts/seed-assets.js";
import { spawn } from "node:child_process";

function encodeFixture(bytes: Buffer, args: string[]) {
  return new Promise<Buffer>((resolve, reject) => {
    const child = spawn(
      "ffmpeg",
      ["-v", "error", "-i", "pipe:0", ...args, "pipe:1"],
      { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] },
    );
    const chunks: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr.resume();
    child.once("error", reject);
    child.once("close", (code) =>
      code === 0
        ? resolve(Buffer.concat(chunks))
        : reject(new Error("fixture encode failed")),
    );
    child.stdin.end(bytes);
  });
}

describe("stage 7 bounded media and presentation", () => {
  it("actually decodes JPEG, static WebP and MP3 into bounded canonical bytes", async () => {
    const png = demoPng("card.blue.2", false);
    const jpeg = await encodeFixture(png, [
      "-frames:v",
      "1",
      "-c:v",
      "mjpeg",
      "-f",
      "image2pipe",
    ]);
    const webp = await encodeFixture(png, [
      "-frames:v",
      "1",
      "-c:v",
      "libwebp",
      "-f",
      "webp",
    ]);
    const mp3 = await encodeFixture(demoWav(660), [
      "-c:a",
      "libmp3lame",
      "-f",
      "mp3",
    ]);
    for (const [bytes, mime] of [
      [jpeg, "image/jpeg"],
      [webp, "image/webp"],
      [mp3, "audio/mpeg"],
    ] as const) {
      const result = await validateMedia(bytes, mime);
      expect(result.bytes.length).toBeGreaterThan(40);
      expect(result.mediaType).toBe(
        mime.startsWith("image/") ? "image/png" : "audio/wav",
      );
    }
  }, 20000);
  it("rejects duplicate escaped keys, prototype keys, trailing data and excessive nesting", () => {
    for (const json of [
      '{"assets":1,"assets":2}',
      '{"a":1,"\\u0061":2}',
      '{"__proto__":{}}',
      '{"x":{"constructor":1}}',
      '{"a":1} false',
      "[".repeat(20) + "0" + "]".repeat(20),
      '"unterminated',
    ])
      expect(() => parseAssetJson(json)).toThrow();
    expect(
      parseAssetJson('{"name":"中文","nested":[true,null,-1.2e2]}'),
    ).toEqual({ name: "中文", nested: [true, null, -120] });
    expect(
      packManifestSchema.safeParse({
        script: "alert(1)",
        assets: { a: { fileId: "https://example.com" } },
      }).success,
    ).toBe(false);
  });
  it("decodes real PNG and WAV bytes and rejects MIME spoofing, damaged and animated media", async () => {
    const png = demoPng("card.red.1", false),
      wav = demoWav(440);
    expect(await validateMedia(png, "image/png")).toMatchObject({
      kind: "image",
      metadata: { width: 160, height: 240 },
    });
    expect(await validateMedia(wav, "audio/wav")).toMatchObject({
      kind: "audio",
      metadata: { durationMs: 200, channels: 1 },
    });
    await expect(validateMedia(png, "image/jpeg")).rejects.toThrow();
    await expect(
      validateMedia(png.subarray(0, 50), "image/png"),
    ).rejects.toThrow();
    await expect(
      validateMedia(Buffer.concat([png, Buffer.from("acTL")]), "image/png"),
    ).rejects.toThrow();
    await expect(
      validateMedia(Buffer.from('<svg onload="alert(1)"></svg>'), "image/png"),
    ).rejects.toThrow();
    await expect(
      validateMedia(
        Buffer.concat([wav, Buffer.alloc(5 * 1024 * 1024)]),
        "audio/wav",
      ),
    ).rejects.toThrow();
  }, 20000);
  it("rejects oversized decoded image declarations and long PCM duration", async () => {
    const png = demoPng("card.red.1", false);
    png.writeUInt32BE(50000, 16);
    await expect(validateMedia(png, "image/png")).rejects.toThrow();
    const sample = demoWav(440),
      wav = Buffer.concat([
        sample.subarray(0, 44),
        Buffer.alloc(24000 * 2 * 11),
      ]);
    wav.writeUInt32LE(wav.length - 8, 4);
    wav.writeUInt32LE(wav.length - 44, 40);
    await expect(validateMedia(wav, "audio/wav")).rejects.toThrow();
  }, 20000);
  it("consumes all cues in a revision exactly once and never replays a retired revision", () => {
    const consumer = new PresentationConsumer(),
      played: string[] = [];
    const batch = [
      { eventId: "match:3:0", cueIndex: 0, cueId: "play" },
      { eventId: "match:3:1", cueIndex: 0, cueId: "draw" },
      { eventId: "match:3:1", cueIndex: 1, cueId: "turn" },
    ];
    const play = (cue: { cueId: string }) => played.push(cue.cueId);
    consumer.consume("match", 3, batch, true, play);
    expect(played).toEqual([]);
    consumer.baseline(2);
    consumer.consume("match", 3, [...batch, batch[0]!], false, play);
    expect(played).toEqual([]);
    consumer.consume("match", 3, [...batch, batch[0]!], true, play);
    expect(played).toEqual(["play", "draw", "turn"]);
    consumer.consume("match", 3, batch, true, play);
    consumer.consume("match", 2, batch, true, play);
    expect(played).toHaveLength(3);
    consumer.reset();
    consumer.consume(
      "match",
      4,
      [{ eventId: "match:4:0", cueIndex: 0, cueId: "stale" }],
      true,
      play,
    );
    consumer.baseline(9);
    consumer.consume(
      "match",
      4,
      [{ eventId: "match:4:0", cueIndex: 0, cueId: "stale" }],
      true,
      play,
    );
    expect(played).toHaveLength(3);
    for (let revision = 10; revision < 10000; revision++)
      consumer.consume("match", revision, [], true, play);
    consumer.consume("match", 3, batch, true, play);
    expect(played).toHaveLength(3);
  });
  it("maps only allowed projected public events and a self turn cue, never hidden card attributes", () => {
    const events = [
      {
        eventId: "m:1:0",
        type: "card.draw",
        count: 1,
        seatId: "other",
        secretColor: "red",
      },
    ];
    const mine = { currentPlayerId: "me", viewingSeatId: "me", phase: "play" };
    expect(colorPresentationCues(events, mine)).toEqual([
      { eventId: "m:1:0", cueIndex: 0, cueId: "card.drawn" },
      { eventId: "m:1:0", cueIndex: 1, cueId: "turn.started" },
    ]);
    expect(
      colorPresentationCues(events, { ...mine, viewingSeatId: "other" }),
    ).toHaveLength(1);
    expect(
      colorPresentationCues(
        [{ eventId: "m:1:0", type: "private.card.received" }],
        null,
      ),
    ).toEqual([]);
  });
});
