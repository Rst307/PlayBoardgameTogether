import { test, expect, type Page } from "./fixtures.js";
import { demoPng } from "../../scripts/seed-assets.js";

async function login(page: Page, name: string) {
  await page.goto("/login");
  await page.getByLabel("用户名").fill(name);
  await page.getByLabel("密码").fill("stage two password");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByRole("heading", { name: "游戏大厅" })).toBeVisible();
}
test("administrator uploads, maps, previews and publishes a real pack", async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  await login(page, "stage7_admin");
  await page.goto("/admin/assets");
  await expect(page.getByRole("heading", { name: "已发布资源" })).toBeVisible();
  await page.getByText("创建资源草稿", { exact: true }).click();
  const packId = `browser-${Date.now()}`;
  await page.getByLabel("包 ID", { exact: true }).fill(packId);
  await page.getByLabel("显示名称").fill("浏览器原创包");
  await page.getByLabel("作者", { exact: true }).fill("测试作者");
  await page.getByLabel("来源", { exact: true }).fill("原创程序生成");
  await page
    .getByLabel("复制现有映射")
    .selectOption({ label: "纸张几何 · 1.0.0" });
  await page.getByRole("button", { name: "创建草稿", exact: true }).click();
  await expect(page.locator(".asset-editor")).toBeVisible();
  await page.getByLabel("上传图片或短音效").setInputFiles({
    name: "new-red-card.png",
    mimeType: "image/png",
    buffer: demoPng("card.red.1", false),
  });
  await expect(
    page.getByText("已处理 1 个文件；请检查各文件状态。"),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "card.red.1", exact: true })
    .selectOption({ label: "new-red-card.png" });
  await page.getByRole("button", { name: "保存映射", exact: true }).click();
  await expect(page.getByRole("button", { name: "校验草稿" })).toBeEnabled();
  await page.getByRole("button", { name: "校验草稿" }).click();
  await expect(page.getByText(/校验通过 ·/)).toBeVisible();
  await page.getByRole("button", { name: "固定场景预览" }).click();
  await expect(
    page.getByRole("heading", { name: "演示预览 · 不是真实对局" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".asset-preview img")
        .evaluateAll((images) =>
          images.every((image) => (image as HTMLImageElement).naturalWidth > 0),
        ),
    )
    .toBe(true);
  await page
    .getByRole("button", { name: "试听 card.played", exact: true })
    .click();
  await page.screenshot({
    path: testInfo.outputPath("admin-preview.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "发布精确版本" }).click();
  await expect(
    page.locator("tr").filter({ hasText: `${packId}@1.0.0` }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("locked image packs, actual Web Audio, duplicate live delivery and recovery", async ({
  browser,
  viewport,
  isMobile,
  hasTouch,
  deviceScaleFactor,
}, testInfo) => {
  test.setTimeout(90000);
  const first = await browser.newContext({
      viewport,
      isMobile,
      hasTouch,
      deviceScaleFactor,
    }),
    second = await browser.newContext({
      viewport,
      isMobile,
      hasTouch,
      deviceScaleFactor,
    });
  let lastLive: string | undefined, replay: (() => void) | undefined;
  await first.addInitScript(() => {
    const state = { started: 0, stopped: 0 };
    Object.defineProperty(window, "audioEvidence", { value: state });
    const start = AudioBufferSourceNode.prototype.start,
      stop = AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.start = function (
      ...args: Parameters<typeof start>
    ) {
      state.started++;
      return start.apply(this, args);
    };
    AudioBufferSourceNode.prototype.stop = function (
      ...args: Parameters<typeof stop>
    ) {
      state.stopped++;
      return stop.apply(this, args);
    };
  });
  await first.routeWebSocket("**/api/v1/ws/session", (socket) => {
    const server = socket.connectToServer();
    server.onMessage((message) => {
      const value = JSON.parse(String(message));
      if (
        value.type === "match.snapshot" &&
        value.snapshot.delivery === "live" &&
        value.snapshot.events?.length
      ) {
        lastLive = String(message);
        replay = () => socket.send(lastLive!);
        socket.send(message);
      }
      socket.send(message);
    });
  });
  const a = await first.newPage(),
    b = await second.newPage();
  const count = () =>
    a.evaluate(
      () =>
        (window as unknown as { audioEvidence: { started: number } })
          .audioEvidence.started,
    );
  try {
    await login(a, "stage3_a");
    await login(b, "stage3_b");
    await a.goto("/rooms/new");
    await a.getByLabel("游戏与版本").selectOption("color-match@1.0.0");
    await a.getByLabel("房间名").fill("声音与图片验收");
    await a.getByRole("button", { name: "创建并生成邀请码" }).click();
    await a
      .getByRole("combobox", { name: "资源包", exact: true })
      .selectOption({ label: "纸张几何 · 1.0.0" });
    const invite = await a.locator(".invite-box strong").textContent();
    await b.getByLabel("12 位邀请码").fill(invite!);
    await b.getByRole("button", { name: "加入私人房间" }).click();
    await b.getByRole("button", { name: "坐这里" }).click();
    await b.getByRole("button", { name: "准备", exact: true }).click();
    await expect(a.getByText(/已准备 ·/)).toBeVisible();
    await a.getByRole("button", { name: "准备", exact: true }).click();
    await expect(a.getByRole("button", { name: "开始游戏" })).toBeEnabled();
    await a.getByRole("button", { name: "开始游戏" }).click();
    await expect(a.locator(".color-hand-cards button")).toHaveCount(5);
    await expect(b.locator(".color-hand-cards button")).toHaveCount(5);
    await expect
      .poll(() =>
        a
          .locator(".color-hand-cards img")
          .evaluateAll(
            (images) =>
              images.length === 5 &&
              images.every(
                (image) => (image as HTMLImageElement).naturalWidth > 0,
              ),
          ),
      )
      .toBe(true);
    await expect(a.getByText("连接中断或正在同步，操作已暂停。")).toHaveCount(
      0,
    );
    await a.locator(".audio-controls summary").click();
    await a.getByRole("button", { name: "启用声音 / 测试声音" }).click();
    await expect.poll(count).toBe(1);
    await a.getByLabel("游戏音量", { exact: true }).fill("0.25");
    const matchUrl = a.url();
    const snapshot = await a.evaluate(async () => {
      const id = location.pathname.split("/").at(-1);
      return (await (await fetch(`/api/v1/matches/${id}/view`)).json()).data;
    });
    const locked = await a.evaluate(
      async (binding) =>
        (
          await (
            await fetch(`/api/v1/assets/versions/${binding.versionId}`)
          ).json()
        ).data.manifest,
      snapshot.assetBinding,
    );
    expect(locked.packId).toBe("color-match.paper");
    expect(
      await a
        .locator(".card-back img")
        .evaluateAll(
          (images) =>
            new Set(images.map((image) => image.getAttribute("src"))).size,
        ),
    ).toBe(1);
    await a.screenshot({
      path: testInfo.outputPath("paper-table.png"),
      fullPage: true,
    });
    const active =
      snapshot.view.currentPlayerId === snapshot.view.viewingSeatId ? a : b;
    // Drawing produces one generic public draw cue. The next player also gets a self-turn cue.
    await active.getByRole("button", { name: "摸牌或跳过并结束回合" }).click();
    await expect(a.getByText("对局 · revision 1")).toBeVisible();
    const expected =
      snapshot.view.currentPlayerId === snapshot.view.viewingSeatId ? 2 : 3;
    await expect.poll(count, { timeout: 5000 }).toBe(expected);
    replay?.();
    await a.waitForTimeout(150);
    expect(await count()).toBe(expected);
    await a.getByLabel("总静音", { exact: true }).check();
    const next = active === a ? b : a;
    await next.getByRole("button", { name: "摸牌或跳过并结束回合" }).click();
    await expect(a.getByText("对局 · revision 2")).toBeVisible();
    await a.waitForTimeout(150);
    expect(await count()).toBe(expected);
    await a.getByLabel("总静音", { exact: true }).uncheck();
    replay?.();
    await a.waitForTimeout(150);
    expect(await count()).toBe(expected);
    await a.reload();
    await expect(a.locator(".color-hand-cards button").first()).toBeVisible();
    await a.locator(".audio-controls summary").click();
    await expect(a.getByLabel("游戏音量", { exact: true })).toHaveValue("0.25");
    expect(await count()).toBe(0);
    await a.getByRole("button", { name: "启用声音 / 测试声音" }).click();
    await expect.poll(count).toBe(1);
    replay?.();
    await a.waitForTimeout(150);
    expect(await count()).toBe(1);
    await first.setOffline(true);
    await a.evaluate(() => dispatchEvent(new Event("offline")));
    await first.setOffline(false);
    await a.evaluate(() => dispatchEvent(new Event("online")));
    await expect(a.getByText("连接中断或正在同步，操作已暂停。")).toHaveCount(
      0,
      { timeout: 20000 },
    );
    expect(await count()).toBe(1);
    const sibling = await first.newPage();
    await sibling.goto(matchUrl);
    await expect(
      sibling.locator(".color-hand-cards button").first(),
    ).toBeVisible();
    await sibling.locator(".audio-controls summary").click();
    await sibling.getByRole("button", { name: "启用声音 / 测试声音" }).click();
    const siblingCount = () =>
      sibling.evaluate(
        () =>
          (window as unknown as { audioEvidence: { started: number } })
            .audioEvidence.started,
      );
    await expect.poll(siblingCount).toBe(1);
    const beforeOwnership = (await count()) + (await siblingCount());
    await active.getByRole("button", { name: "摸牌或跳过并结束回合" }).click();
    await expect(sibling.getByText("对局 · revision 3")).toBeVisible();
    await expect
      .poll(async () => (await count()) + (await siblingCount()))
      .toBe(beforeOwnership + expected - 1);
    await sibling.close();
    await a.route("**/api/v1/assets/files/*", (route) => route.abort());
    await a.goto(matchUrl);
    await expect(a.locator(".color-hand-cards button").first()).toBeVisible();
    await expect(a.locator(".color-hand-cards img")).toHaveCount(0);
    expect(await a.locator(".color-hand-cards").textContent()).toMatch(
      /[红蓝黄绿]/,
    );
    expect(
      await a.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await a.screenshot({
      path: testInfo.outputPath("semantic-fallback.png"),
      fullPage: true,
    });
  } finally {
    await first.close();
    await second.close();
  }
});
