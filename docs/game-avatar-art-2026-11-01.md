# 游戏头像与背景用途交付（2026-11-01）

本批按用户明确标注，将下列十张方形原图作为**游戏头像**。头像原画可以带环境场景，不因此改作背景；不重新绘制、不强制抠图或改透明底，也不从宽幅背景裁出替代头像。九张与已有头像原稿 SHA-256 完全一致，阿瓦里改为用户本次提供的浅色底木棋盘图片。

## 页面用途

| 用途 | 图片字段与显示方式 |
| --- | --- |
| 大厅游戏主图、推荐区小头像 | 优先 `iconUrl`，方形容器、`object-fit: contain`，完整展示头像 |
| 没有头像的旧游戏 | 兼容回退到 `coverUrl`，不从详情背景猜测头像 |
| 详情标题图标 | 继续使用 `iconUrl`，完整等比显示 |
| 详情横幅 | 继续使用独立 `backgroundUrl`，允许场景裁切及标题侧遮罩 |

大厅原先将宽幅封面用于主图，手机再裁成方形，容易把背景误当头像；现在主图直接消费头像。标题旁原有小图标保持隐藏，避免同一卡片重复头像。后台保留原字段、权限、地址校验及保存接口，只修正用途提示。管理员显式配置优先于默认头像。

上一轮新增的运行背景/封面已撤回；游戏原有背景与棋桌图保持 main 画面。新生成的场景原稿仅存于各游戏 `design/background-drafts/`，未接入本批运行包。四款内置游戏的默认背景继续沿用平台原 SVG，未把本批头像当横幅。

## 用户附件与游戏仓库

下表图片序号对应用户最后提供的十张附件。源图在各仓库 `design/pixel-catalog-art/<游戏键>/icon-source.png`，`usage.json` 保存用途及源图 SHA-256。运行头像通常为 512×512；波多黎各为遵守原 2 MiB 解压预算单独导出为 448×448，均保留完整方形构图。

| 附件 | 游戏 | PR / 仓库 | 本批候选版本 |
| --- | --- | --- | --- |
| 1 | 五子棋 | [gomoku #4](https://github.com/PlayBoardgameTogether/playboard-game-gomoku/pull/4) | 1.0.3 → 1.0.4 |
| 2 | 璀璨宝石 | [splendor #2](https://github.com/PlayBoardgameTogether/playboard-game-splendor/pull/2) | 头像资源 1.0.1；运行游戏 1.0.0 不变 |
| 3 | UNO · 毫不留情 | [uno #3](https://github.com/PlayBoardgameTogether/playboard-game-uno/pull/3) | 1.0.0 → 1.0.1 |
| 4 | UNO · 休闲版 | [uno #3](https://github.com/PlayBoardgameTogether/playboard-game-uno/pull/3) | 1.2.0 → 1.2.1 |
| 5 | 拉密 | [rummikub #4](https://github.com/PlayBoardgameTogether/playboard-game-rummikub/pull/4) | 1.0.3 → 1.0.4 |
| 6 | Grid Garden | [grid-garden #3](https://github.com/PlayBoardgameTogether/playboard-game-grid-garden/pull/3) | 头像资源 1.0.1；运行游戏 1.0.0 不变 |
| 7 | Color Match | [color-match #3](https://github.com/PlayBoardgameTogether/playboard-game-color-match/pull/3) | 头像资源 1.0.1；运行游戏 1.0.0 不变 |
| 8 | 阿瓦里 | [awari #4](https://github.com/PlayBoardgameTogether/playboard-game-awari/pull/4) | 1.0.0 → 1.0.1 |
| 9 | 卡坦岛 | [catan #4](https://github.com/PlayBoardgameTogether/playboard-game-catan/pull/4) | 1.0.1 → 1.0.2 |
| 10 | 波多黎各 | [puerto-rico #5](https://github.com/PlayBoardgameTogether/playboard-game-puerto-rico/pull/5) | 1.1.0 → 1.1.1 |

花砖物语另在 [azul #2](https://github.com/PlayBoardgameTogether/playboard-game-azul/pull/2) 沿用此前方形头像原稿，不冒充上述十张附件；同样只引入头像，资源 1.0.1，运行游戏 1.0.0 不变。

四个内置游戏的精确完整提交由 `game-repositories.lock.json` 记录，通过原导入器引入；游戏规则、内容版本、SDK 0.1.0、registry 装配与旧对局身份均不变。在线游戏的七个候选 ZIP 只在各独立仓库生成，平台锁定在线副本及旧版本未漂移。

## 本轮验证

- 平台 `pnpm typecheck`、`pnpm lint`、`pnpm build` 通过，包含 20 源码目录 AST 边界、生产 bundle、API runtime 与受限 ZIP 恢复检查；仍有既有 model-viewer 大块提示。
- `pnpm test:ui mobile-discovery.spec.ts --output .data/pixel-game-art/avatars-ui`：10 通过，2 个既有手机专用用例在桌面项目跳过。新用例在双端检查头像实际加载、方形原图/容器、完整等比显示、旧封面回退及详情背景分离。实际查看 1440×900、1280×900、390×844、320×844 的亮暗截图，无横向溢出；固定 API 目录仅用于视觉回归。
- 经 `node --env-file=.env .data/pixel-game-art/run-avatar-e2e.mjs` 调用原 `pnpm test:e2e game-presentation-admin.spec.ts --output .data/pixel-game-art/avatar-e2e`：桌面/手机 4/4 通过，无 skip，实际验证管理员保存三个图片角色、刷新重读、方形主图选用头像、详情背景独立、缺图回退、恢复内置头像及普通账户拒绝访问。使用独立 `boardgame_avatar_roles_20261101` 测试库，原准备、迁移、游戏/资源同步与隔离保护保留，未更改根 `.env`、开发库或生产库。
- 六个在线仓库重新 `pnpm build`、`pnpm verify` 通过（UNO 一次验证两个玩法，共七包）。用平台实际编译后的包解析器与 QuickJS 再检查七个候选身份、官方登记及头像 PNG 与指定导出文件逐字节一致。波多黎各解压 2,084,870 字节，ZIP 1,557,169 字节；未放宽任何体积限制。
- 同批前段十仓库规则回归共 140/140 通过；之后只有头像、打包图片引用及说明变化，未重复规则测试，不将此前结果冒充新一轮全套验收。
- `node scripts/check-game-repositories.mjs --remote` 通过：10 仓库、154 个集成文件；各游戏来源锁与 GitHub 精确提交一致。官方目录、独立发布配置和清单身份核对一致，**登记已核对，无需改动**。
- 十个游戏 PR 的最新 head 均为 OPEN，GitHub `check` 均为 SUCCESS，Release job 按 PR 规则跳过；不将跳过发布计为已发布。

## 交付与发布边界

平台 `1.1.1 → 1.1.2`，属于兼容的头像与局部视觉修正，PATCH+1；README 与根版本一致。本批迭代修正不重复加号。游戏候选版本独立维护，未覆盖已发布版本。

十个游戏 PR 已推送修正；平台 PR 应在四个内置游戏 PR 审查并合入后再合入，使来源依赖明确。之后才按已有部署方式同步平台，并按各在线游戏发布流程生成新标签/正式 Release，分别验收订阅。当前未合并、未打标签、未发布正式 Release、未安装或上架候选包；推送、目录登记与本地验证均不代表生产上线。本批没有连接生产服务器，运行 SHA、systemd 与生产健康未验收。
