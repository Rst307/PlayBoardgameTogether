import { createHash, randomUUID } from "node:crypto";
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";

export interface AssetStorage {
  put(key: string, bytes: Uint8Array): Promise<void>;
  get(key: string): Promise<Buffer>;
  stat(key: string): Promise<{ bytes: number; modified: number }>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
}
export const mediaHash = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex");

export class LocalAssetStorage implements AssetStorage {
  readonly root: string;
  constructor(root: string) {
    if (!isAbsolute(root)) throw new Error("ASSET_STORAGE_DIR 必须为绝对路径");
    this.root = resolve(root);
  }
  private async path(key: string) {
    if (!/^[a-f0-9]{64}\.(png|wav|jpg|webp|mp3)$/.test(key))
      throw new Error("Invalid storage key");
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const rootStat = await lstat(this.root);
    if (
      rootStat.isSymbolicLink() ||
      !rootStat.isDirectory() ||
      resolve(await realpath(this.root)).toLowerCase() !==
        this.root.toLowerCase()
    )
      throw new Error("Unsafe storage directory");
    const path = join(this.root, key);
    try {
      const stat = await lstat(path);
      if (stat.isSymbolicLink() || !stat.isFile())
        throw new Error("Unsafe storage object");
    } catch (error) {
      if (
        !(
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "ENOENT"
        )
      )
        throw error;
    }
    return path;
  }
  async put(key: string, bytes: Uint8Array) {
    if (mediaHash(bytes) !== key.slice(0, 64))
      throw new Error("Storage hash mismatch");
    const path = await this.path(key);
    try {
      if (mediaHash(await readFile(path)) !== mediaHash(bytes))
        throw new Error("Immutable object mismatch");
      return;
    } catch (error) {
      if (
        !(
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "ENOENT"
        )
      )
        throw error;
    }
    const temporary = join(this.root, `.staged-${randomUUID()}`);
    try {
      await writeFile(temporary, bytes, { flag: "wx", mode: 0o600 });
      await rename(temporary, path);
    } finally {
      await unlink(temporary).catch(() => undefined);
    }
    if (mediaHash(await readFile(path)) !== mediaHash(bytes))
      throw new Error("Storage verification failed");
  }
  async get(key: string) {
    return readFile(await this.path(key));
  }
  async stat(key: string) {
    const stat = await lstat(await this.path(key));
    return { bytes: stat.size, modified: stat.mtimeMs };
  }
  async delete(key: string) {
    await unlink(await this.path(key)).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
  async list() {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    return (await readdir(this.root)).filter((key) =>
      /^[a-f0-9]{64}\.(png|wav|jpg|webp|mp3)$/.test(key),
    );
  }
}
