# 游戏头像与背景用途交付（2026-11-01）

本批按用户明确标注，将下列十张方形原图作为**游戏头像**。头像原画可以带环境场景，不因此改作背景；不重新绘制、不强制抠图或改透明底，也不从宽幅背景裁出替代头像。九张与已有头像原稿 SHA-256 完全一致，阿瓦里改为用户本次提供的浅色底木棋盘图片。

## 合并、正式发布与公网跟进（2026-11-01）

用户本轮明确授权合并后，先校验完整差异、提交、审查与检查，再按精确 head 约束以 merge commit 合入。平台 [PR #47](https://github.com/PlayBoardgameTogether/PlayBoardgameTogether/pull/47) 已合并，交付 head c2bc63bbc14c6a2e1d27dacd6b2cad4781fa93f1，merge commit **459a863d5e416a92c2e63b32624fc509b67f16bd**；四个内置头像依赖先于平台合并。十个游戏实际合并记录：

| 游戏仓库 | PR | merge commit |
| --- | --- | --- |
| azul | [#2](https://github.com/PlayBoardgameTogether/playboard-game-azul/pull/2) | [8fbfbdebcd9f](https://github.com/PlayBoardgameTogether/playboard-game-azul/commit/8fbfbdebcd9f27f8ef406600ae10eeafff5a965e) |
| color-match | [#3](https://github.com/PlayBoardgameTogether/playboard-game-color-match/pull/3) | [bef3d820f01e](https://github.com/PlayBoardgameTogether/playboard-game-color-match/commit/bef3d820f01ea869e6c4f7ef7f7542dff6f6fd5f) |
| grid-garden | [#3](https://github.com/PlayBoardgameTogether/playboard-game-grid-garden/pull/3) | [93d303779cb4](https://github.com/PlayBoardgameTogether/playboard-game-grid-garden/commit/93d303779cb40001c6867edd217d5e58252c9c05) |
| splendor | [#2](https://github.com/PlayBoardgameTogether/playboard-game-splendor/pull/2) | [1eb528dc8744](https://github.com/PlayBoardgameTogether/playboard-game-splendor/commit/1eb528dc87449833f5e4b1c01efa53b82c75a8b2) |
| uno | [#3](https://github.com/PlayBoardgameTogether/playboard-game-uno/pull/3) | [9ed4deba6ca2](https://github.com/PlayBoardgameTogether/playboard-game-uno/commit/9ed4deba6ca230e26f9a70f4d6b8a1d07366e147) |
| gomoku | [#4](https://github.com/PlayBoardgameTogether/playboard-game-gomoku/pull/4) | [6060d1391b98](https://github.com/PlayBoardgameTogether/playboard-game-gomoku/commit/6060d1391b986c3082754764b82f26c2c7750d43) |
| rummikub | [#4](https://github.com/PlayBoardgameTogether/playboard-game-rummikub/pull/4) | [021157c8b297](https://github.com/PlayBoardgameTogether/playboard-game-rummikub/commit/021157c8b297417c9ddc856dd4509b3245d22659) |
| awari | [#4](https://github.com/PlayBoardgameTogether/playboard-game-awari/pull/4) | [2e4e126c8995](https://github.com/PlayBoardgameTogether/playboard-game-awari/commit/2e4e126c8995ab8514742e3116c43b3ed7ab5e4e) |
| catan | [#4](https://github.com/PlayBoardgameTogether/playboard-game-catan/pull/4) | [99054358d0e2](https://github.com/PlayBoardgameTogether/playboard-game-catan/commit/99054358d0e27c4e1b299b8544018ce6643ce1db) |
| puerto-rico | [#5](https://github.com/PlayBoardgameTogether/playboard-game-puerto-rico/pull/5) | [d206705387a9](https://github.com/PlayBoardgameTogether/playboard-game-puerto-rico/commit/d206705387a92bc5942b1af5e50df180a77bc5f4) |

波多黎各 main 依现有工作流自动发布 [puerto-rico-v1.1.1](https://github.com/PlayBoardgameTogether/playboard-game-puerto-rico/releases/tag/puerto-rico-v1.1.1)，北京时间 **22:40:37** 发布，[工作流](https://github.com/PlayBoardgameTogether/playboard-game-puerto-rico/actions/runs/41317195824) 成功，标签指向 d206705387a92bc5942b1af5e50df180a77bc5f4。实际下载 ZIP、release.json、SHA256SUMS 三附件；ZIP 1,557,169 字节，三方 SHA-256 为 c90928c8081658be8cb700ffe93efd6ce93cce4a0a643e7f1d272d59c44e8853，当前平台解析器/QuickJS 的游戏身份及指定头像字节检查通过。旧 1.0.0、1.1.0 Release 保留。其他六个在线候选包尚未打标签或正式发布，本轮没有手动发布。

公网匿名实测：合并前页脚 1.1.1；北京时间 **22:49:16** 验收页脚 1.1.2、/health/ready HTTP 200 / ready，四款内置头像响应与本地已锁定头像字节相同；1440px、390px 共八项方形/完整显示检查通过，站内进入 Color Match 详情后头像与原背景分离。只读证据在忽略目录 .data/pixel-game-art/live-avatars-verified.json。观察到自动更新后的 Web/API 响应，但未持有确认的运维入口，私有 current.json 运行 SHA 与 systemd active 未核验，不能冒充完整服务器进程验收。

补充发现：直接 HTTP 打开 /games/color-match/1.0.0 返回空体 404，而从大厅站内跳转正常。当前监督脚本既有 extname(path) 静态回退策略与此现象一致；本批未改该脚本。此问题独立记录，未为头像合并擅自改动生产监督进程。公开目录检查时仍为波多黎各 1.1.0，未执行管理员订阅同步，正式 Release 不等于已安装或上架。

清理完成：平台本批 codex/pixel-game-icons，以及十个游戏仓库各自的 codex/pixel-catalog-art，本地/远程分支均在核实已合并、无新增提交、无其他开放 PR 后删除；远程删除均有预期 SHA 约束。游戏本批 worktree 保留在合并后的 detached HEAD，以保留安装包与验证产物；其他工作区、GPL/玩家名称/海港等任务分支和主分支均未动。此次仅补内部交付/发布文档，不再提高平台 1.1.2，不重复无代码变化的业务测试。

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

## 合并前交付边界（保留当时记录）

平台 `1.1.1 → 1.1.2`，属于兼容的头像与局部视觉修正，PATCH+1；README 与根版本一致。本批迭代修正不重复加号。游戏候选版本独立维护，未覆盖已发布版本。

十个游戏 PR 已推送修正；平台 PR 应在四个内置游戏 PR 审查并合入后再合入，使来源依赖明确。之后才按已有部署方式同步平台，并按各在线游戏发布流程生成新标签/正式 Release，分别验收订阅。当前未合并、未打标签、未发布正式 Release、未安装或上架候选包；推送、目录登记与本地验证均不代表生产上线。本批没有连接生产服务器，运行 SHA、systemd 与生产健康未验收。
