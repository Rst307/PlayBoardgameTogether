# 桌游平台

## 好友、私聊与好友 ID（2026-10-03）

主导航「好友」支持精确 ID 搜索、好友申请/接受/拒绝/撤回/删除、文字私聊与未读、房间邀请；等待房间里直接邀请好友，对方在好友页确认加入，有密码仍需输入、不自动入座。好友页和「我的资料」可修改、复制公开好友 ID；登录用户名、内部账户 UUID 和旧对局不变。社交页面每 5 秒认证同步，消息持久保存。更新后执行 `pnpm db:migrate` 应用 020，详见 [社交功能](docs/social.md)。

## 花砖物语（2026-10-03）

新增 2–4 人经典彩墙花砖物语，包含选砖、图案行、铺墙连线计分、地板扣分、终局奖励和并列判定，支持真人、脚本 AI 与刷新恢复。计分提供逐砖落位、光晕、碎光、分数弹跳和终局奖励；声音设置启用后播放原创短音与和弦，刷新不补播。运行 `pnpm games:sync`、`pnpm assets:seed` 并重载应用，在大厅选择「花砖物语」。操作与维护见 [游戏指南](docs/games/azul.md)。

## 管理员后台（2026-10-03）

管理员登录后从「更多 → 管理员后台」进入 `/admin`，查看真实平台统计、搜索并启停普通账户、按安装版本即时上架/下架游戏、审核接入申请，并进入既有展示图片及资源管理。停用撤销所有会话；游戏下架阻止新建/开局但不影响进行中的旧局。更新后执行 `pnpm db:migrate` 应用 019。新游戏源码仍经可信审查、部署与同步，不提供任意代码热加载。操作与限制见 [管理员后台](docs/admin.md)。

## 交互上手教程（2026-10-03）

游戏开发者可以选择编写交互教程；只有注册了精确版本教程的游戏详情才显示「进入教程」。Color Match 已提供五个练习，复用真实桌面，通过出牌、摸牌、指定目标和获胜学习规则。未登录也可练习，不创建房间、不计入对局记录；刷新从头开始，支持重试、上一步和重新开始。开发契约与接入方式见 [游戏 SDK](docs/game-sdk.md#可选交互教程2026-10-03)。璀璨宝石已提供十一个练习，涵盖三色/同色拿取、购买、永久折扣、公开/盲抽预留、黄金支付、退币、贵族和最终轮。其他未注册教程的游戏继续提供纸面规则。

## 先选游戏，再开桌（2026-10-02）

游戏大厅以紧凑封面墙为主，点击后进入 `/games/:id/:version`，立即显示该游戏的公开房间，列表标题旁提供「创建房间」。创建进入独立建房页并带入所选版本，仍可调整游戏、人数、公开/私人和密码；邀请码加入与规则位于列表下方的折叠区域。邀请码以邀请对应的房间为准。首页保留「继续游戏」，未登录可浏览游戏并看到公开房间的登录提示。旧 `/rooms/new` 地址继续兼容。

管理员在「更多 → 游戏展示」(`/admin/games`) 设置图标、大厅封面、详情背景图片地址并实时预览；保存后刷新生效，留空使用各款游戏的内置原创插画。支持公开 HTTPS 地址（不含凭据/查询/片段）及 `/game-art/` 图片路径，目前不提供此页面的本地文件上传。更新后执行 `pnpm db:migrate` 应用 015 展示配置迁移；图片配置不改变规则清单、对局状态或已绑定的游戏图包。

## 项目优化（2026-10-02）

平台入口按页面加载并统一路由与浏览器标题，页面加载失败保留导航；登录支持显示/隐藏密码、请求锁和分类反馈，404 提供返回入口。依赖检查改用 TypeScript AST 并覆盖共享 UI 与两个 SDK，维护六项界面原则及后续结构债务见 [项目优化审查](docs/project-optimization-2026-10-02.md)。`pnpm build` 后可执行 `pnpm test:ui`，独立检查生产页面与公开文档，不清理数据库。

## 公开开发者文档（2026-10-02）

网站 `/developers` 无需登录，主导航提供「开发者文档」。覆盖快速开始、游戏 SDK、客户端 SDK、HTTP API、WebSocket/恢复、添加游戏与 AI 指南；规范源文件在 [公开指南](apps/web/public/developer-docs/index.md)。提供 `/llms.txt`、构建生成的 `/llms-full.txt` 与 `/developer-sdk/sdk-sources.json`，后者按白名单发布当前 game-sdk/client-sdk/protocol 源码及 SHA-256，不含 API/游戏 server 或秘密数据。SDK 当前通过 workspace 使用，不声明已发布 npm 包。2026-10-03 新增登录用户游戏接入申请及管理员资料审核 API，执行 `pnpm db:migrate` 应用 018；只保存资料，不接收/下载/执行代码，尚无自动安装或热加载。接口与当前可信接入方式见 [添加游戏](apps/web/public/developer-docs/add-game.md)。

`pnpm build` 生成全部静态文档和 SDK 文件；生产托管需保留页面回退及这些静态路径。`pnpm test:developers` 在生产静态预览上验证未登录阅读、桌面/手机导航、刷新和下载，不启动 API、不清理数据库。运行该检查前先构建。

2026-10-02 璀璨宝石支持「原创几何 SVG」与「TTS 经典卡面」两套图包，房主开局前在房间「资源包」选择，旧局保持原绑定。TTS 素材由用户本地模组提取，已安装到本机资源存储，不随 Git 仓库分发；新环境安装/恢复见 [游戏图包](docs/games/splendor.md)。

2026-10-01 新增 [璀璨宝石](docs/games/splendor.md)：2–4 人宝石拿取、发展卡购买与私密预留、黄金替代、退币、贵族与最终轮结算，支持专用脚本 AI 和刷新恢复。创建房间时选择「璀璨宝石」。原创 SVG 美术随客户端加载。

2026-10-01 全站视觉切换为 macOS Vibrancy：三级中性深灰、模糊侧栏、衬线标题、细分隔和系统蓝焦点；手机使用顶部导航。登录、大厅、房间、设置、资源管理与各款游戏共用视觉体系，游戏语义颜色和自定义图包继续保留。样式入口见 [界面系统](docs/ui-system.md)。

第九阶段统一深蓝灰界面、手机导航与反馈：Color Match 支持选牌/取消、选目标/确认；Grid Garden 先选择收获或建造再确认，保存后锁定，放置保留横竖预览和非法原因。自己的棋盘优先展示，等待者、公开轮次及并列得分持续可查。开发固定场景在双开发开关下的 `/dev/ui`，只使用匿名公开 View，不调用正式动作或模型；生产构建排除场景数据。维护入口见 [UI 开发](docs/ui-development.md)、[界面系统](docs/ui-system.md)、[阶段 9 验收](docs/acceptance-stage-9.md)。

第八阶段新增可完整游玩的 Grid Garden：2–4 人在三轮中同时秘密选择收获或建造，统一公开后在各自 4×4 花园放置骨牌，按占格和剩余能量计分并允许并列。它复用正式动作、恢复、AI、资源和音频链路，用可选多行动者契约验证平台不依赖卡牌或单一当前玩家。规则与操作见 [Grid Garden](docs/games/grid-garden.md)，验收边界见 [阶段 8 验收](docs/acceptance-stage-8.md)。

第七阶段新增图片与短音效资源：管理员在 `/admin/assets` 上传、映射、校验、固定预览并发布；房主开局前选择精确图包，图片和声音可整体替换。旧局保留原绑定，资源失败不阻断语义桌面。安装与恢复见 [资源管理](docs/assets.md)，声音见 [音频](docs/audio.md)，验收与未测项见 [阶段 7 验收](docs/acceptance-stage-7.md)。

阶段 6 已加入个人模型配置和受控模型适配边界：用户可在 `/settings/models` 保存版本化模型配置，凭证以 AES-256-GCM 密文保存并可撤销；固定端点提供真实 OpenAI-compatible 与明确标识的 mock 适配器。模型动作必须经过严格 choiceId 校验，最终继续沿用阶段 5 的任务、epoch、冻结提案和统一命令事务。没有 `MODEL_CREDENTIALS_KEY` 时模型功能保持不可用，脚本 AI 不受影响。

主导航提供游戏大厅、我的资料和开发者文档：大厅先选择游戏，详情页创建或加入房间，首页继续参与房间；`/profile` 保存昵称、内置头像和简介，显示账户 ID 与本人真实对局记录（含已中止历史）。

## 前提与启动

- Node.js 22（实测 22.17.0）
- pnpm 11（实测 11.15.1）
- Docker Desktop 或 PostgreSQL 17

```powershell
Copy-Item .env.example .env
pnpm install --frozen-lockfile
pnpm db:up
pnpm db:migrate
pnpm games:sync
docker build -t boardgame-media:1 scripts/media
pnpm assets:seed
```

首次创建管理员和两个演示账户。密码从 stdin 读取；交互终端不回显读取，避免把明文留在命令历史：

```powershell
$secret = Read-Host 'Password (12–128 characters)' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
  [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) | pnpm account -- admin:init admin 管理员
  [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) | pnpm account -- account:create player_a 玩家A
  [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) | pnpm account -- account:create player_b 玩家B
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}
pnpm dev
```

生产启动前先执行 `pnpm build`，然后运行 `pnpm --filter @boardgame/api start`；该入口只加载编译后的工作区包，不依赖 TypeScript 运行时。

打开 `http://127.0.0.1:5173`。登录 A，在 `/rooms/new` 选择 Color Match 和 2–4 人，创建房间并复制一次性显示的邀请码。其他玩家在独立浏览器配置文件登录、加入、入座、准备；房主准备后开局。轮到自己时点击可出的牌，再点“出牌”；也可摸牌并结束回合。打出数字 5 后指定另一位玩家。每个浏览器只收到自己的手牌和对手手牌数量。

也可以由房主在空座位点击“添加脚本 AI”。真人准备后即可开局；真人座位禁止脚本托管，专用 AI 没有登录账户，房主不能读取它的手牌或替它指定动作。既有个人模型托管仍可显式启用并收回，不因断线自动开启。

游戏详情提供创建入口，跳转带入所选游戏的独立建房页；建房支持游戏、人数、公开/私人类型、可选密码和规则说明；创建后直接进入房间，点击邀请码即可复制。每个账户最多创建一个未关闭房间，转让房主不释放创建名额。详情页公开房间按当前游戏筛选，并支持密码类型和状态筛选，仅公开房可见；私人房仍通过邀请码加入，有密码的房间两条加入路径均需校验。对局进行中普通成员不能退出；房主可确认后强制关闭房间并终止未结束对局，房内玩家收到关闭通知后回首页，创建名额随关闭释放。

Color Match 正常结算后房间自动恢复 waiting，真人取消准备，返回房间即可重新准备并开始下一局；上一局结果保留在原对局地址。已有卡在 in_game 的已结束房间由 `pnpm db:migrate` 的 010 迁移修复，迁移不重置开发数据。更新后需确保 API 已加载新代码。

生产 HTTPS 必须设置 `COOKIE_SECURE=true`，并让反向代理保持同源 Origin 与 WebSocket upgrade。不要把 session、CSRF 或邀请码写入 URL/日志。

## 检查

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```

E2E 使用独立 `boardgame_test` 数据库和三个 fixture 账户，不写入开发数据库。
2026-09-24 的阶段 2 历史验收结果见 [阶段 2 验收记录](docs/acceptance-stage-2.md)；第三阶段本轮结果见 [开发进度](docs/progress.md)。

第四阶段的命令重试语义与恢复见 [可靠性](docs/reliability.md)、[恢复步骤](docs/recovery.md)。第五阶段见 [控制权](docs/ai-controllers.md)、[调度器](docs/ai-scheduler.md) 与 [阶段 5 验收](docs/acceptance-stage-5.md)。

## 当前边界

第七阶段资源字节默认持久化至 `.data/assets`，生产通过绝对路径 `ASSET_STORAGE_DIR` 挂载独立持久卷，仅授予 API 账户权限；测试用 `.data/test-assets`，与开发分离。备份须同时包含 PostgreSQL、资源目录与锁定游戏源码。`pnpm assets:check` 只读报告缺失/hash 错误/孤儿；显式 `--gc` 才执行有引用保护的延迟清理。媒体校验需要本机 Docker 和 `boardgame-media:1` 镜像，容器无网络、无宿主挂载、低权限及有界 CPU/内存/时间。下方阶段 6 边界为历史描述，其中资源上传/事件音效已由本阶段实现。

阶段 1 `/dev/lab` 仍为双开发开关下的内存实验台。正式完整玩法与脚本策略由 `color-match@1.0.0` 和 `grid-garden@1.0.0` 提供。模型 AI 已具备适配与个人配置，真实供应商验收及预算/租约缺口见开发进度；资源上传和事件音效已接入两款游戏。尚无自动断线托管、观战或公网发布。presence 与广播仍是单 API 进程内状态；持久任务有数据库 fencing，但不宣称多副本生产高可用。生产部署须保留 registry 摘要与 worker 所需的可信源码。

## 房间模型 AI（2026-10-03）

房主可在空座位展开「选择模型 AI」，选择本人已启用且有凭证的配置并添加；mock 明确标为模拟。已有 AI 的「AI 设置」支持修改配置或切回基础脚本。没有可用配置时通过「管理模型配置」创建，再返回房间或刷新模型列表。修改 AI 设置取消真人准备；开局后配置锁定到本局结束，模型使用授权房主的额度及 AI 自己的 View。房主不能查看 AI 的私密手牌或指定动作。

更新代码后执行 `pnpm db:migrate` 应用 016/017 迁移。转让房主后，新房主须选择自己的模型配置或切回脚本后再开局；已经开局的授权不会随房主转让而改变。真人自己的模型托管入口继续保留。
