# 桌游平台

2026-10-01 新增 [璀璨宝石](docs/games/splendor.md)：2–4 人宝石拿取、发展卡购买与私密预留、黄金替代、退币、贵族与最终轮结算，支持专用脚本 AI 和刷新恢复。创建房间时选择「璀璨宝石」。原创 SVG 美术随客户端加载。

2026-10-01 全站视觉切换为 macOS Vibrancy：三级中性深灰、模糊侧栏、衬线标题、细分隔和系统蓝焦点；手机使用顶部导航。登录、大厅、房间、设置、资源管理与各款游戏共用视觉体系，游戏语义颜色和自定义图包继续保留。样式入口见 [界面系统](docs/ui-system.md)。

第九阶段统一深蓝灰界面、手机导航与反馈：Color Match 支持选牌/取消、选目标/确认；Grid Garden 先选择收获或建造再确认，保存后锁定，放置保留横竖预览和非法原因。自己的棋盘优先展示，等待者、公开轮次及并列得分持续可查。开发固定场景在双开发开关下的 `/dev/ui`，只使用匿名公开 View，不调用正式动作或模型；生产构建排除场景数据。维护入口见 [UI 开发](docs/ui-development.md)、[界面系统](docs/ui-system.md)、[阶段 9 验收](docs/acceptance-stage-9.md)。

第八阶段新增可完整游玩的 Grid Garden：2–4 人在三轮中同时秘密选择收获或建造，统一公开后在各自 4×4 花园放置骨牌，按占格和剩余能量计分并允许并列。它复用正式动作、恢复、AI、资源和音频链路，用可选多行动者契约验证平台不依赖卡牌或单一当前玩家。规则与操作见 [Grid Garden](docs/games/grid-garden.md)，验收边界见 [阶段 8 验收](docs/acceptance-stage-8.md)。

第七阶段新增图片与短音效资源：管理员在 `/admin/assets` 上传、映射、校验、固定预览并发布；房主开局前选择精确图包，图片和声音可整体替换。旧局保留原绑定，资源失败不阻断语义桌面。安装与恢复见 [资源管理](docs/assets.md)，声音见 [音频](docs/audio.md)，验收与未测项见 [阶段 7 验收](docs/acceptance-stage-7.md)。

阶段 6 已加入个人模型配置和受控模型适配边界：用户可在 `/settings/models` 保存版本化模型配置，凭证以 AES-256-GCM 密文保存并可撤销；固定端点提供真实 OpenAI-compatible 与明确标识的 mock 适配器。模型动作必须经过严格 choiceId 校验，最终继续沿用阶段 5 的任务、epoch、冻结提案和统一命令事务。没有 `MODEL_CREDENTIALS_KEY` 时模型功能保持不可用，脚本 AI 不受影响。

主导航为游戏大厅和我的资料：大厅可创建房间、继续参与房间、邀请码加入和筛选公开房；`/profile` 保存昵称、内置头像和简介，显示账户 ID 与本人真实对局记录（含已中止历史）。

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

游戏大厅提供唯一创建入口，跳转独立建房页；建房支持游戏、人数、公开/私人类型、可选密码和规则说明；创建后直接进入房间，点击邀请码即可复制。每个账户最多创建一个未关闭房间，转让房主不释放创建名额。大厅支持游戏、密码类型和状态筛选，仅公开房可见；私人房仍通过邀请码加入，有密码的房间两条加入路径均需校验。对局进行中普通成员不能退出；房主可确认后强制关闭房间并终止未结束对局，房内玩家收到关闭通知后回首页，创建名额随关闭释放。

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
