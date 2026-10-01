import { resolve } from "node:path";
import { createDatabase } from "../apps/api/src/db/index.js";
import { createRegistry } from "../apps/api/src/registry/index.js";
import { AssetService } from "../apps/api/src/assets/service.js";
import { LocalAssetStorage } from "../apps/api/src/assets/storage.js";
const test = process.argv.includes("--test"),
  url = test ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;
if (!url || (test && url === process.env.DATABASE_URL))
  throw new Error("独立数据库配置缺失");
const db = createDatabase(url);
try {
  const service = new AssetService(
    db,
    createRegistry(false),
    new LocalAssetStorage(
      process.env[test ? "TEST_ASSET_STORAGE_DIR" : "ASSET_STORAGE_DIR"] ??
        resolve(test ? ".data/test-assets" : ".data/assets"),
    ),
  );
  console.log(
    JSON.stringify(
      await service.integrity(process.argv.includes("--gc")),
      null,
      2,
    ),
  );
} finally {
  await db.end();
}
