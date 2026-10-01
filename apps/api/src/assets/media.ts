import { spawn } from "node:child_process";
import { z } from "zod";
import { AppError } from "../errors.js";
import { mediaHash } from "./storage.js";

const streamSchema = z.object({
  codec_name: z.string(),
  codec_type: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  channels: z.number().optional(),
  sample_rate: z.string().optional(),
  nb_read_frames: z.string().optional(),
});
export type MediaResult = {
  kind: "image" | "audio";
  mediaType: "image/png" | "audio/wav";
  bytes: Buffer;
  hash: string;
  metadata: {
    width?: number;
    height?: number;
    durationMs?: number;
    channels?: number;
    sampleRate?: number;
    sourceWidth?: number;
    sourceHeight?: number;
    peak?: number;
  };
};
const invalid = () =>
  new AppError(
    "VALIDATION_ERROR",
    "媒体损坏、类型不符或超过图片/音频限制",
    400,
  );
let active = 0;

/** Only bytes on stdin/stdout. No shell, filenames, network protocols or external references. */
function processMedia(
  executable: string,
  args: string[],
  input: Buffer,
  limit: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // No mounts and no daemon socket inside the worker. Its hard limits also survive an API crash.
    const child = spawn(
      "docker",
      [
        "run",
        "--rm",
        "-i",
        "--network=none",
        "--read-only",
        "--cap-drop=ALL",
        "--security-opt=no-new-privileges",
        "--user=65534:65534",
        "--memory=192m",
        "--memory-swap=192m",
        "--cpus=1",
        "--pids-limit=32",
        "--tmpfs=/tmp:rw,noexec,nosuid,size=8m",
        "boardgame-media:1",
        executable,
        ...args,
      ],
      { windowsHide: true, shell: false, stdio: ["pipe", "pipe", "pipe"] },
    );
    const chunks: Buffer[] = [];
    let size = 0;
    let failed = false;
    const timer = setTimeout(() => {
      failed = true;
      child.kill("SIGKILL");
    }, 15000);
    child.on("error", () => {
      clearTimeout(timer);
      reject(new AppError("SERVICE_UNAVAILABLE", "媒体处理工具不可用", 503));
    });
    child.stdout.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        failed = true;
        child.kill("SIGKILL");
      } else chunks.push(chunk);
    });
    child.stderr.resume();
    child.stdin.on("error", () => undefined);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 125 || code === 126 || code === 127) reject(new AppError('SERVICE_UNAVAILABLE','隔离媒体处理器不可用，请检查 Docker 和媒体镜像',503));
      else if (code !== 0 || failed) reject(invalid());
      else resolve(Buffer.concat(chunks));
    });
    child.stdin.end(input);
  });
}

function sniff(bytes: Buffer) {
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return { mime: "image/png", format: "png_pipe", codec: "png" };
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return { mime: "image/jpeg", format: "jpeg_pipe", codec: "mjpeg" };
  if (
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  )
    return { mime: "image/webp", format: "webp_pipe", codec: "webp" };
  if (
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WAVE"
  )
    return { mime: "audio/wav", format: "wav", codec: "pcm_" };
  if (
    bytes.toString("ascii", 0, 3) === "ID3" ||
    (bytes[0] === 255 && (bytes[1]! & 224) === 224)
  )
    return { mime: "audio/mpeg", format: "mp3", codec: "mp3" };
  throw invalid();
}

export async function validateMedia(
  bytes: Buffer,
  declared: string,
): Promise<MediaResult> {
  if (active >= 2)
    throw new AppError("RATE_LIMITED", "媒体处理中，请稍后重试", 429, true);
  const format = sniff(bytes),
    image = format.mime.startsWith("image/");
  if (
    format.mime !== declared ||
    bytes.length > (image ? 8 : 5) * 1024 * 1024 ||
    bytes.length < 16
  )
    throw invalid();
  // Reject animated containers before invoking a decoder; frame counting below also rejects concatenations.
  if (
    (format.mime === "image/png" && bytes.includes(Buffer.from("acTL"))) ||
    (format.mime === "image/webp" && bytes.includes(Buffer.from("ANIM")))
  )
    throw invalid();
  active++;
  try {
    const common = [
      "-v",
      "error",
      "-max_alloc",
      "67108864",
      "-max_pixels",
      "16000000",
      "-threads",
      "1",
      "-protocol_whitelist",
      "pipe",
      "-f",
      format.format,
    ];
    const raw = await processMedia(
      "ffprobe",
      [...common, "-count_frames", "-show_streams", "-of", "json", "pipe:0"],
      bytes,
      65536,
    );
    const probe = z
      .object({ streams: streamSchema.array().length(1) })
      .parse(JSON.parse(raw.toString()));
    const stream = probe.streams[0]!;
    if (!stream.codec_name.startsWith(format.codec)) throw invalid();
    if (image) {
      const width = stream.width ?? 0,
        height = stream.height ?? 0;
      if (
        width < 1 ||
        height < 1 ||
        width > 4096 ||
        height > 4096 ||
        width * height > 16_000_000 ||
        stream.nb_read_frames !== "1"
      )
        throw invalid();
      const normalized = await processMedia(
        "ffmpeg",
        [
          ...common,
          "-i",
          "pipe:0",
          "-map_metadata",
          "-1",
          "-frames:v",
          "1",
          "-threads",
          "1",
          "-c:v",
          "png",
          "-f",
          "image2pipe",
          "pipe:1",
        ],
        bytes,
        8 * 1024 * 1024,
      );
      return {
        kind: "image",
        mediaType: "image/png",
        bytes: normalized,
        hash: mediaHash(normalized),
        metadata: { width, height, sourceWidth: width, sourceHeight: height },
      };
    }
    const channels = stream.channels ?? 0,
      sampleRate = Number(stream.sample_rate);
    if (channels < 1 || channels > 2 || sampleRate < 8000 || sampleRate > 96000)
      throw invalid();
    const pcm = await processMedia(
      "ffmpeg",
      [
        ...common,
        "-i",
        "pipe:0",
        "-map_metadata",
        "-1",
        "-t",
        "10.1",
        "-ar",
        "24000",
        "-c:a",
        "pcm_s16le",
        "-f",
        "s16le",
        "pipe:1",
      ],
      bytes,
      1_100_000,
    );
    const durationMs = (pcm.length / (24000 * channels * 2)) * 1000;
    if (durationMs <= 0 || durationMs > 10000) throw invalid();
    const wav = Buffer.alloc(44 + pcm.length);
    wav.write("RIFF");
    wav.writeUInt32LE(36 + pcm.length, 4);
    wav.write("WAVEfmt ", 8);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(channels, 22);
    wav.writeUInt32LE(24000, 24);
    wav.writeUInt32LE(24000 * channels * 2, 28);
    wav.writeUInt16LE(channels * 2, 32);
    wav.writeUInt16LE(16, 34);
    wav.write("data", 36);
    wav.writeUInt32LE(pcm.length, 40);
    pcm.copy(wav, 44);
    let peak = 0;
    for (let i = 0; i < pcm.length; i += 2)
      peak = Math.max(peak, Math.abs(pcm.readInt16LE(i)) / 32768);
    return {
      kind: "audio",
      mediaType: "audio/wav",
      bytes: wav,
      hash: mediaHash(wav),
      metadata: {
        durationMs: Math.round(durationMs),
        channels,
        sampleRate: 24000,
        peak,
      },
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw invalid();
  } finally {
    active--;
  }
}
