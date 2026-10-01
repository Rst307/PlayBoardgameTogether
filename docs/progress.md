# 开发进度

## 璀璨宝石基础版（2026-10-01）

新增 games/splendor 独立扩展 splendor.base@1.0.0，支持 2–4 人和专用脚本 AI，接入既有大厅建房、准备、正式动作、私密 View、断线/刷新恢复和结束后房间复位。规则包括三色拿取、同色双拿、公开/盲抽预留、三张预留上限、黄金任意替代、永久折扣、退回超过十枚的代币、贵族自动/选择到访、十五声望触发最终轮，以及同分按更少已购发展卡判胜并允许共享胜利。极端全员无合法主行动时增加明确的被迫跳过与僵局排名恢复规则。

90 张发展卡与两份独立公开原版功能表逐项核对一致，10 位贵族另核对完整数值表；增加固定 SHA-256 与贵族要求黄金回归，纠正首份网络转录中的费用错误。资源为原创 SVG 切面宝石、三级建筑和贵族纹章，贵族中文名原创，随客户端编译；不使用商业插画、外链图片或运行时绘图服务。默认清单为空，本轮不增加自定义替换图包或事件音效。规则、操作与来源详见 [璀璨宝石](games/splendor.md)。

服务端按当前阶段严格验证动作与精确支付；合法候选覆盖主动使用黄金的全部有效组合。预留身份和牌堆顺序不进入他人 View 或公开事件。存档核对卡牌/贵族唯一性与守恒、代币守恒、等级、补牌、阶段与排名。集成复现 PostgreSQL JSONB 重排分数对象键造成终局恢复误拒绝，修复为字段与胜者比较；多次退币使用独立 decisionKey，避免模型决策组把新退币当作上一枚的外部重试。API registry、Web game-registry、AI worker 和安装脚本装配新包，既有建房默认顺序保留；没有新增平台规则分支、认证/HTTP/WS 流程或数据库迁移。

交互采用选取/取消/确认，费用预览和可选黄金调整、合法贵族选择和逐枚退币；自己的商会优先展示。手机市场两列，键盘可选卡和取消，操作草稿固定在可见屏幕底部，避免穿过整张市场找确认按钮。实际检查 docs/screenshots/splendor 的桌面/手机桌面、操作面板和结算截图，修正全局 header 浅色背景污染，无水平溢出。

本轮实际验证：
- pnpm install --no-frozen-lockfile 更新 workspace 链接；锁文件仅新增新游戏 importer/链接，无依赖升级。沙箱初始化失败后使用已获准的正常 Windows 执行通道；离线安装缺元数据，联网完成既有依赖安装。
- pnpm games:sync 在开发库安装新 manifest；测试脚本在独立 boardgame_test 安装同版本，未重置开发数据。
- pnpm typecheck、pnpm lint（含所有游戏目录的依赖边界）通过；最终退币 decisionKey 修正后再次通过。
- pnpm test tests/unit：12 文件/56 项通过，无 skip；牌表、JSONB 和决策键修改后补跑新游戏 10 项均通过。覆盖 9 局不同人数/种子的私密合法 AI 完整对局。
- pnpm test:integration：最终完整 13 文件/83 项通过（99.85 秒），无 skip；最后独立退币决策键修正后 pnpm test tests/unit/splendor.test.ts tests/integration/splendor.test.ts 14 项通过。新增正式链路覆盖身份拒绝、并发冲突、重复请求/内容冲突、错误回滚、私密预留恢复和 2/3/4 人完整结算与房间复位。早期 2/4 人终局恢复失败已由 JSONB 回归修复。
- pnpm test:e2e tests/e2e/splendor.spec.ts tests/e2e/lobby.spec.ts --output=.data/e2e-splendor-verified：桌面/Pixel 5 四项通过（2.3 分钟）；最终牌表下新游戏两项通过，操作面板可见性修改后 --output=.data/e2e-splendor-toolbar 两项再通过（1.8 分钟）。真实真人/脚本 AI 整局、私密预留刷新、键盘选卡/取消、确认面板视口和最终结算均验证。原版数值改变后没有重跑无关大厅用例。
- pnpm build 最终通过（生产 bundle/API runtime）；node scripts/check-web-runtime.mjs 通过，开发路由生产不可用。最终服务端决策键修改不改变已验收 Web 界面。
- 本轮单元和集成分别集中执行，没有将 pnpm test 的无参数全量作为额外重复命令；没有执行整个旧浏览器套件。所有上述结果均是本轮实测，非历史记录。

本地 pnpm dev 已启动，5173 和 3001 health/live 均返回 200，已请求侧栏打开预览。当前已有 Git 元数据与配置的 GitHub origin，在 codex/splendor 分支交付；保留此前历史“无 Git 元数据”的真实记录。未测试真实外部模型对局、iOS/WebKit/物理设备；未加入扩展包、自定义图包、音效或公网部署。下一步在大厅创建璀璨宝石房间，与好友或脚本 AI 实际游玩并按反馈调整。

## 大厅入口、按钮对齐与个人资料（2026-10-01）

按用户反馈，主导航收拢为游戏大厅和我的资料。首页移除快速创建表单，标题区的创建房间按钮进入 /rooms/new，建房页可返回大厅；保留参与房间、邀请码加入、公开房筛选和分页。按钮统一文字居中与行高，房间概要和操作垂直居中，保留卡牌与棋盘自身布局。

新增 /profile：昵称、六种内置头像、最多 300 字个人简介可保存，账户 UUID、用户名和加入时间只读。014 迁移只新增 accounts.avatar/bio，已应用开发库与独立 boardgame_test，不清理开发数据。ProfileService 通过现有 session/Origin/CSRF 校验更新本人资料；protocol/client-sdk 共享严格 schema 并解析 unknown。我的对局从固定 match_participants 查询非秘密概要，包含 active/finished/aborted，每页 20 项，单语句按时间/UUID 排序且游标要求属于本人。关闭后历史仍保留；初次访问 aborted 对局可只读查看，不订阅关闭房间；在线 active 被关闭仍回大厅。未新增胜率推断、头像上传、公开资料或第二套动作系统。README/auth/protocol/data-model/architecture/ui-system 已同步。

实际验证：pnpm typecheck、pnpm lint、pnpm build（生产 bundle/API runtime）通过；补齐最终导航入口后 Web typecheck、lint、Web build、生产 bundle 与 node scripts/check-web-runtime.mjs 通过。单元首次 44 通过/2 个 Docker 解码失败，正常 Windows 权限下 pnpm test tests/unit/stage7-assets.test.ts 6 项通过，本轮 46 项均有通过记录，无 skip。pnpm test:integration 12 文件/79 项全部通过，新增本人资料、伪造身份/非法头像、Origin/CSRF、记录权限与同时间分页检查。

浏览器首轮 pnpm test:e2e 为 37 通过/9 失败（9.2 分钟）：部分旧测试仍定位已移除的建房导航，头像 getByLabel 包含装饰字符；另有并行运行删除共享 test-results 的 ENOENT，保留其他工作对导航展开状态的变动。独立输出补跑 pnpm test:e2e tests/e2e/profile.spec.ts tests/e2e/navigation.spec.ts tests/e2e/grid-garden.spec.ts tests/e2e/stage2.spec.ts tests/e2e/color-match.spec.ts --output=test-results-lobby-profile，13 通过/3 失败：资料已保存/刷新保留，但 CSS Grid 将 inline-flex 计算为 flex，使旧样式字符串断言误报；改为实际测量文字与按钮中心位置，最终 pnpm test:e2e tests/e2e/profile.spec.ts --output=.data/e2e-profile-final 桌面/手机 2 项通过（9.9 秒），文字中心误差 <=2px。桌面 Color Match 心跳提示复核仍有计时竞态：clock.install 保持真实时间流逝，测试可能越过一秒重连；加载对局前固定时间并 pauseAt 后，pnpm test:e2e tests/e2e/color-match.spec.ts --output=.data/e2e-heartbeat-paused 桌面/手机 2 项通过（1.1 分钟），保留断线/恢复/单连接断言，未改生产心跳。最终受影响测试 ESLint 通过。本轮 46 个浏览器项目用例均有通过记录，非同一次全量运行。中止历史查看与刷新已在 room-close 桌面/手机通过。

已实际检查 docs/screenshots/lobby-profile 的大厅/资料桌面与手机截图，无水平溢出。独立补跑产物已保留至 .data/e2e-lobby-profile-first，其他最终产物也在 .data，不作为源码交付。现有 5173 预览返回 200，开发 API 的 /profile 返回认证所需 401，已请求侧栏打开预览。当前目录仍无 Git 元数据，无法提交/推送；未初始化仓库，需用户提供已连接的 Git 仓库。未新增 iOS/WebKit/物理设备验收；下一步按实际使用反馈调整资料与大厅，不进入后续阶段或公网部署。


## 更多导航展开状态修复（2026-10-01）

按用户反馈移除换页时强制关闭更多菜单的逻辑，桌面和手机保留用户的展开/收起选择，前进后退也不重置；再次点击 summary 可收起。核验当前 `/profile` 无刷新导航入口，新增菜单回归测试并更新原导航断言与 UI 维护说明。此前“渐进式动画与无刷新换页”记录中的自动关闭菜单行为已由本轮替代。

实际验证：独立前端 5284 上，修复前桌面/手机均在跳转系统状态后缺少 open 属性而失败；修复后 `navigation-menu.spec.ts` 两项通过，覆盖首页、系统状态、我的资料、历史导航与手动收起。使用临时 Playwright 配置及不带数据库 fixture 的原导航用例副本执行 `node node_modules/@playwright/test/cli.js test --config navigation-repro.config.ts`，原键盘/快速切页/减少动态效果/无 View Transition 回退桌面与手机四项通过；临时文件验证后删除。`pnpm typecheck`、`pnpm lint`、`pnpm test tests/unit`（11 文件/46 项，无 skip）通过。

首次 `pnpm test:e2e tests/e2e/navigation.spec.ts -g "more navigation"` 经准备脚本确认独立 boardgame_test 后，遇到 5273 端口占用与 setup 数据库 deadlock，未跑到断言；后续浏览器检查不使用数据库 fixture，菜单用例拦截 API，不清理共享测试库。不宣称完整 E2E、服务端集成或生产构建新增验收。当前目录无 Git 元数据，无法提交/推送，保留本地修改，未初始化仓库或猜测远程地址。

## 渐进式动画与无刷新换页（2026-10-01）

在现有灰阶主题与入场动画上补齐 room-list、座位、资源及花园面板 40–160 ms 错峰入场。App 站内链接沿用 platform.navigate/history/popstate，无需整页刷新；侧栏保留挂载，main 按路径隔离。支持 View Transition 时仅内容交叉淡入 140–220 ms，缺少 API 时直接换页并短淡入；减少动态效果时关闭动画且不启动过渡。保留外部链接、修饰键、新窗口、下载与锚点语义，主动导航滚到顶部并聚焦 main、关闭更多菜单，浏览器历史沿用原生恢复。

首次 E2E 复现过渡捕获期间旧创建表单被输入的问题：立即令离开内容 inert 并禁用旧原生表单控件，防止旧页面输入/提交；快速连点只提交最后路径。NewRoomPage 会话校验与 RoomCreateForm 创建请求在卸载后不再导航。没有改动规则、身份、传输、数据库或正式动作。实现见 navigation.ts、App.tsx、vibrancy.css；ui-system、ui-development 同步说明。

实际验证：`pnpm typecheck`、`pnpm lint`、`pnpm build`（含生产 bundle/API runtime）通过，最终导航修正后 Web typecheck、lint、build 再通过；`node scripts/check-web-runtime.mjs` 最终通过。`pnpm test tests/unit` 首次 44 通过/2 失败，Docker 管道在受限环境访问被拒；正常权限下 `pnpm test tests/unit/stage7-assets.test.ts` 6 项通过，本轮 46 项均有通过记录，无 skip。完整 `pnpm test:e2e` 首次 37 通过/5 失败（5.2 分钟）；修复后只补跑 `pnpm test:e2e tests/e2e/navigation.spec.ts tests/e2e/grid-garden.spec.ts tests/e2e/stage2.spec.ts tests/e2e/lobby.spec.ts`，14 项通过（1.3 分钟），包括新增快速切页。总计 44 个浏览器项目用例有本轮通过记录，非同一次全量通过；新增测试最终 ESLint 通过。

独立 boardgame_test 由现有准备脚本核验，未清理开发库；本轮 UI 工作不新增服务端集成验收。已检查 `docs/screenshots/page-motion/seats-desktop.png` 与 `seats-mobile.png`，既有五视口及主题/草稿测试通过。iOS/WebKit 实机未测，旧浏览器以禁用 View Transition API 的方式验证回退。现有 5173 预览返回 200，已请求侧栏打开。当前目录无 Git 元数据，无法提交或推送，未初始化仓库；需要用户提供已连接的 Git 仓库。下一步在实际页面查看动效节奏，不进入后续阶段或公网部署。

## 动效与表单主题补齐（2026-10-01）

按用户反馈保留 macOS Vibrancy 灰阶主题，在 `apps/web/src/styles/vibrancy.css` 增加标题/登录卡淡入上移、仪表盘面板错峰入场、按钮按压、导航图标反馈、展开内容淡入、选牌抬起与公开事件淡入。动画只响应界面进入和交互，不持续循环；减少动态效果关闭动画、过渡和选牌位移，触屏不启用悬停抬起。

统一下拉框/选项菜单、复选框、单选框、音量滑块和文件选择按钮的灰阶、蓝色焦点及禁用态。保留原生 select；支持 base-select 的浏览器可主题化展开菜单，其余使用原生菜单回退，强制颜色模式恢复原生控件。没有改动规则、身份、传输、数据库或动作链路。同步 ui-system 与 ui-development，新增键盘选择、Escape 焦点、实际 base-select 外观、选牌和减少动态效果 E2E；已检查 `docs/screenshots/motion-controls/` 的桌面/手机菜单与选牌截图。

实际执行：`pnpm typecheck`、`pnpm lint`、`pnpm test tests/unit`（11 文件/46 项，无 skip）、`pnpm build`（生产 bundle/API runtime）通过。完整 `pnpm test:e2e` 40 项通过（4.6 分钟）；运行中截图发现表单选择框 specificity 覆盖，修正后手机全部回归通过，再补跑最终桌面受影响范围：`pnpm test:e2e tests/e2e/stage9-ui.spec.ts tests/e2e/lobby.spec.ts tests/e2e/stage6-model.spec.ts tests/e2e/stage7-assets.spec.ts --project=desktop`，最终 10 项全部通过（无 skip）。补跑前四人流程两次在入座失败，trace 中没有入座请求；原测试在 WS 就绪前向禁用按钮发送 Enter，增加可用性断言后通过，未修改页面连接保护或放宽断言。最后 lint 通过。

测试准备脚本核验独立 boardgame_test，与开发库隔离；本轮纯视觉改动没有执行服务端集成测试。WebKit/iOS 实机和旧浏览器原生菜单回退未新增实测。开发预览 5173 返回 200，并已请求在侧栏打开；下一步可在现有页面刷新查看视觉效果。目录仍无 Git 元数据，无法提交/推送，未初始化仓库，需用户提供已连接的 Git 仓库。

## 全站 macOS Vibrancy 改版（2026-10-01）

按用户指定的 [参考样式](https://www.stylekit.top/zh/styles/macos-vibrancy) 完成全站视觉替换：三级中性深灰、半透明模糊侧栏、路径工具栏、衬线标题、系统无衬线正文、1px 分隔和最大 12px 圆角。登录、大厅、创建、房间、模型设置、资源管理、状态及游戏外围共享体系；手机切换顶部导航，平板收窄侧栏并将复杂面板改单列。移除装饰入场动画、上浮效果和大阴影。卡牌/棋盘语义颜色及自定义图片保留，表单边界保持可辨认对比，焦点使用系统蓝。没有改动游戏规则、身份、DTO、数据库、RNG 或动作/恢复链路。

实现文件为 App.tsx、main.tsx、stage9.css 与新增 vibrancy.css；README、ui-system、ui-development 同步现行视觉。E2E 主题断言改为区分弱装饰线与真实控件边界，保留文本对比/触摸尺寸/键盘/草稿/恢复断言，新增手机品牌名称可见性检查。本轮截图在 `docs/screenshots/macos-vibrancy/`，已检查大厅、登录、Color Match 长手牌与 Grid Garden 桌面/手机布局；开发场景仍明确标识为匿名演示，真实流程截图单独命名。

实际验证：`pnpm typecheck`、`pnpm lint`、`pnpm test tests/unit`（11 文件/46 项，无 skip）、`pnpm build`（含生产 bundle/API runtime）与完整 `pnpm test:e2e`（桌面/Pixel 5 共 38 项，3.5 分钟）通过。修正旧手机 CSS 隐藏品牌名称后，Web build、生产 bundle、`node scripts/check-web-runtime.mjs` 再通过；后者实际加载生产登录页并确认开发路由不可用。最后新增品牌断言后 `pnpm test:e2e tests/e2e/stage9-ui.spec.ts -g "development scenes"` 桌面/手机 2 项通过（15.6 秒）。`pnpm exec eslint` 因命令路径不可用失败，改用 `node node_modules/eslint/bin/eslint.js tests/e2e/stage9-ui.spec.ts` 通过。E2E 使用准备脚本核验过的独立 boardgame_test，未清理开发数据库。本轮纯视觉工作未重跑服务端集成测试；实机/iOS/WebKit、物理音效及真实供应商模型未新增验收。

已打开现有 `http://127.0.0.1:5173/` 预览并确认最新版界面可见。尝试另起 `pnpm dev` 时受限 tsx watch 报 uv_os_get_passwd ENOMEM；另起 Web 发现现有端口已占用，已停止本轮多余进程并复用原服务。没有覆盖 .env 或重新初始化项目。当前目录无 Git 元数据，无法提交/推送，需用户提供已连接的 Git 仓库。下一步由用户查看视觉效果后调整；不进入后续阶段或公网部署。

## 阶段 9：界面与操作体验（2026-10-01）

本地开发及可执行验收完成。统一深蓝灰平台视觉、手机导航、可见键盘焦点、公共加载/失败/重试/行动提示与扩展渲染隔离。大厅 API 失败不再误跳登录，邀请码加入有提交保护，剪贴板失败提供自动选中的手动复制框；游戏说明加载失败可重试。房间与对局按 ID 隔离，旧房间写回复在卸载后不再导航；保留原回执、revision/epoch 和未知请求恢复。

Color Match 新增可出/不可出/已选中标识、取消选牌和目标草稿确认，手机长手牌局部滚动。Grid Garden 新增选择后确认/取消、本人主棋盘、具体等待者、最近公开行动与克制 live 动画；秘密提交前只使用统一文字，公开轮次和分项/并列仍来自 View。图片失败保留文字/格点，减弱动画/静音不影响操作。没有改动规则、State、RNG、迁移或游戏/资源版本锁。

交付双开发开关下 `/dev/ui` 的匿名公开 View 场景、生产模块替换和 marker 排除检查，以及 [实施映射](stage-9-plan.md)、[界面系统](ui-system.md)、[维护说明](ui-development.md)、[U01–U40 验收](acceptance-stage-9.md)、[第十阶段交接](stage-10-handoff.md)。截图保存至 docs/screenshots/stage-9；修改前只保存了两游戏及结算后房间，不宣称完整前后页面基线。

最终通过 typecheck、lint、46 项 unit、77 项 integration（无 skip）和 production build/runtime。首次受限 Windows 的 tsx 在 userInfo 处 ENOMEM，正常执行环境完成测试；独立 boardgame_test 的迁移/游戏/资源均 unchanged。首轮完整 E2E 30 通过/6 失败，按失败及后续影响范围重跑：两游戏、AI、视口/草稿检查通过；四人测试改为全员入座后准备（现有席位变更清准备），每步等待版本和保存确认，最后仅重跑四真人专项，桌面/手机两项通过（18.4 秒）。本轮38个浏览器项目用例均有通过记录，非同一次全量运行；具体命令与失败修复保留在验收表。最后检查含默认对比、44px 触摸、200% 字体、五视口与键盘，未降低规则断言或扩大测试超时。

补充生产检查：新增 `apps/web/build.mjs` 在 Vite 环境解析前指定 production，排除 React 开发运行时；最终主 JS 336.58 kB，无 >500 kB 提示。`node scripts/check-web-runtime.mjs` 实际 Chromium 加载构建登录页成功、无 pageerror，两个开发路由404；不提交登录或写库。为防 test-results 清理丢失证据，单独重生成两真人真实预览/终局，桌面/手机2项通过（16.7秒），截图持久保存在 docs。最终新增/受影响 JS 与测试文件 ESLint 通过。

真机软键盘/工具栏、iOS/Android/WebKit、物理听音与真实模型未验收，前序深度模型/租约/并发缺口继续保留。本轮未公网部署或进入第十阶段。当前目录没有 .git，无法提交推送，已请求仓库连接，未擅自初始化。

## 阶段 8 接续：真人交互与事务恢复（2026-10-01）

恢复已安装 Docker Desktop 与现有 PostgreSQL 容器后，继续补齐 Grid Garden 交互：本人锁定选择显示、同轮行动草稿保留、方向键/Home/End 棋盘导航、越界/重叠分别提示、其他玩家落子后保留本人预览、换轮或本人完成后清除预览。游戏规则、State 和已安装版本摘要没有改写。

新增四账户三轮整局与独立计分、秘密选择/越权/伪造 seat/重选无副作用，以及最后选择公开和最后落子在 before/after COMMIT 真实 API 进程退出的四项专项。退出前后均按数据库快照/本人回执恢复，原请求两次重试不重复扣能量、推进轮次或增加棋子。

浏览器验收发现共享 MatchPage 将 retryable 的明确 STATE_CONFLICT 当作结果未知，导致旧 revision 请求持续待确认并锁住行动按钮。现按 STATE_CONFLICT/CONTROLLER_CONFLICT/CONTROLLER_NOT_HUMAN 清除已拒绝的请求、同步新视图，由真人重新确认；网络未知仍查询回执或原 ID 原内容重试。双真人真实并发浏览器用例复现此问题，并保留选择草稿、刷新后本人选择保密、方向键与纵向放置、非法预览、三轮最终计分断言。Color Match 心跳测试将虚拟时钟停在 80 秒断线后、1 秒自动重连前，避免跨过短暂离线状态而误报。

集中验证已通过：`pnpm typecheck`、`pnpm lint`、`pnpm test tests/unit`（11 文件/46 项、无 skip）、`pnpm test:integration`（12 文件/77 项、无 skip，Grid Garden 8 项及 Color Match 17 项）、`pnpm build`（含生产 bundle/API runtime）。测试准备确认独立 boardgame_test；013 迁移、游戏与资源安装为 unchanged，未清理开发库。冲突修复后的 Web typecheck、受影响文件 ESLint、Web build 与生产 bundle 检查通过。现有 >500 kB chunk 提示保留。完整浏览器首轮 25 通过/5 失败，修复后只重跑两款游戏受影响用例，最终结果补充于本节和 [阶段 8 验收](acceptance-stage-8.md)。

最终浏览器补充：修复明确冲突处理后，两款游戏针对性运行中 Color Match 桌面/手机 2 项通过；Grid Garden 的测试定位暴露在 placing 阶段等待已移除的选择按钮，以及错误地把被拒绝请求计入 revision。修正用例后，仅重跑 `pnpm test:e2e tests/e2e/grid-garden.spec.ts`，桌面/Pixel 5 四项全部通过（19.9 秒）。已检查实际桌面纵向预览和手机三轮结束截图，无水平溢出；未再重复其他已通过用例。最新受影响文件 ESLint 检查通过，证据路径见验收文档。

降低测试频率已写入现有 `AGENTS.md`：每批改动集中验证，通过后不无故重复；仅新增影响、失败或具体风险时重跑相关范围，阶段必要验收仍保留。

尚未新增 Grid Garden 模型连续 stale/重启、控制切换/租约/凭证撤销、两游戏同时运行及关闭与最后动作并发的专项证据；真实模型、物理听音、Android/iOS 实机、WebKit 仍未验收，不宣称 H01–H46 全部通过。下一步按验收表补齐这些具体边界，不提前进行第九阶段视觉重做或公网部署。当前目录无 `.git`，无法提交或推送，未初始化仓库或猜测远程。

## 阶段 8：Grid Garden 与扩展性验证（2026-09-26）

已加入 `grid-garden@1.0.0`：2–4 人独立 4×4 棋盘、3 点初始能量、三轮秘密 harvest/build、全员提交后的原子公开与能量结算、多人独立两格骨牌放置、自动推进、占格分/能量分/总分明细及并列 winners。选择未公开前，对手 View 和公共事件只有提交状态；State 恢复新增 seat/board/choice/round/placement/outcome 跨字段不变量校验。

game-sdk 新增可选多行动者需求契约，AI 调度器枚举所有未提交/未放置席位且仍保持同局单自动任务。Grid Garden 的脚本、fallback 和模型候选共享正式动作；迁移 013 按稳定决策组持久限制模型外部发送次数。客户端提供 H/V、格点预览、非法位置文字、确认/取消、键盘可聚焦按钮、移动端单列布局和最终分数。修复了初稿中选择阶段未投影建造资格、导致真人“建造”永久禁用的问题；现在 View 显式给出 `canBuild`。管理员固定资源预览、原创 seed 图/短音效和 reveal/place/finish cue 复用阶段 7 管线，未新增专用上传或播放器。

本轮实际通过：`pnpm typecheck`、`pnpm lint`、Grid Garden/registry 单测 2 文件 9 项、不含 Docker 媒体组的全部 unit 10 文件 40 项、`pnpm build`（含生产 bundle/API runtime）。完整 unit 为 44 项通过、2 项失败；失败是 Docker engine 未运行时阶段 7 的隔离媒体解码测试返回安全校验错误，Grid Garden 6 项均通过。`pnpm test:integration` 因 `127.0.0.1:5434` 拒绝连接失败；`pnpm db:up` 确认 Docker Desktop Linux engine pipe 不存在。获准后台启动 Docker Desktop 后，backend 又因 secrets-engine socket 无法重命名而崩溃，未重置或删除 Docker 用户数据。因此本轮没有重跑集成、E2E、迁移、资源 seed、进程故障或实际听音。完整 H01–H46 状态见 [阶段 8 验收](acceptance-stage-8.md)。

已补充实施映射、游戏规则、SDK 多行动者教程、扩展性审计、架构/决策和第九阶段交接。真实模型联调、物理设备听音、Android/iOS/WebKit 仍未执行。当前目录没有 `.git`，无法提交或推送，未初始化仓库或猜测远程。Docker 恢复后的下一步是顺序执行迁移、全量 unit、integration、E2E，并核对桌面/Pixel 5 的真人建造与落子截图。

## Color Match 结算后回到等待、同房间多轮（2026-09-25）

先在真实 Color Match 完整对局测试中复现：match 已 finished，但 room 仍 in_game、activeMatchId 未清。真人和 automation 的最后一步现在共用事务内复位函数，在原 room → match 锁内保存结算、恢复 waiting、清空 activeMatchId 并递增 roomRevision、取消真人准备；bot 保持自动准备。提交后通知房间和对局订阅者，失败全部回滚。结果页保留本局结果，返回房间可以重新准备开局；历史结果页刷新/重连通过房间订阅确认和 REST 恢复，不等待已清空的 activeMatchId。

010_room_match_rounds.sql 将一房一局约束改为同房最多一个 active 对局；参与者身份独立于可重配的房间座位，保留历史 View、动作和 AI 任务引用。迁移自动恢复旧版本卡住的 finished 房间，不关闭或重置仍活跃房间。已向开发库及独立 boardgame_test 应用 010，开发库只读确认 stuck_finished_rooms=0；没有覆盖 .env 或清理开发库。

验证：`pnpm test:integration` 10 文件/57 项全部通过，包含完整结算和二次开局、结算 WS 通知、获胜写入故障的房间/状态/RNG/receipt 回滚、历史房间迁移、缩减座位后读取旧参与者结果，以及 AI 冻结获胜提案恢复。补充“第二局开始后重试上一局获胜请求”的断言后，`pnpm test tests/integration/color-match.test.ts -t 'isolates private views'` 再次通过（其余 16 项为名称筛选未运行）。`pnpm test tests/unit` 30 项、`pnpm typecheck`、`pnpm lint`、`pnpm build` 全部通过；build 包含生产 bundle 和 API runtime 检查，仍有既有 >500 kB chunk 提示。

`pnpm test:e2e tests/e2e/color-match.spec.ts tests/e2e/room-close.spec.ts tests/e2e/stage5-ai.spec.ts tests/e2e/stage6-model.spec.ts` 共 12 项通过。检查发现 Color Match 多浏览器 context 原先未继承项目设备配置，已修正并运行 `pnpm test:e2e tests/e2e/color-match.spec.ts`，真实桌面与 Pixel 5 配置共 2 项通过：结束结果保留、刷新/重新登录/断线恢复、返回等待房间、双方重新准备和新 matchId 开局。已查看两种尺寸的 waiting-after-win.png，按钮可用且无横向溢出。未重复执行本轮无关的全部 E2E 文件。

README、房间、协议、数据模型和架构说明已同步。游戏规则源文件和摘要未修改。运行中的 API 需加载新代码（未启用热重载时重启），已有页面刷新后读取修复状态。目录仍无 .git，无法提交或推送 GitHub，未擅自初始化。

## 房主强制关闭与返回首页（2026-09-25，后续调整）

按最新需求调整上一轮的关闭限制：普通成员仍不得中途退出，但房主可以强制关闭进行中的房间。关闭沿用原权限、revision、receipt 与事务边界，按 room → match 锁序将 active 对局改为 aborted；已结束对局不改写结算，重复关闭不再次推进 roomRevision，提交后才广播。

房间页显示“强制关闭房间”并明确确认会终止对局。关闭成功、收到 closed 房间快照或 room.closed 通知时，房主和其他在线成员回首页；对局页同样处理关闭通知，读取 aborted 快照时也回首页。使用替换历史记录和一次性导航保护，避免 HTTP 回复与 WS 通知重复跳转。直接打开已关闭房间会回首页，普通成员没有关闭按钮且接口返回 403。

回归先用 `pnpm test tests/integration/color-match.test.ts -t 'close racing'` 复现关闭返回 409，修复后转绿。最终 `pnpm typecheck`、`pnpm lint`、`pnpm test tests/unit`（8 文件/30 项）、`pnpm test:integration`（10 文件/56 项）及 `pnpm build` 全部通过。`pnpm test:e2e tests/e2e/room-close.spec.ts tests/e2e/stage2.spec.ts tests/e2e/stage5-ai.spec.ts` 桌面/Pixel 5 共 10 项通过，包含等待/进行中关闭、取消确认、房间及对局中的另一位成员回首页、旧链接回首页、返回房间与 AI 权限回归。已查看桌面及手机强制关闭入口截图，未见横向溢出。未重跑本轮无关的完整 E2E 集；build 仍有 >500 kB chunk 提示，无构建失败。

本轮无新增迁移，未覆盖 .env 或清理开发库。README、房间说明与协议同步最新关闭语义；下方上一轮“禁止房主关闭”的记录保留为历史，本节替代其当前行为。工作目录仍无 .git，无法提交推送，未初始化仓库。

## 房间、大厅与交互修复（2026-09-25）

本轮完成用户提出的九项修复：

1. 创建事务按 creator_account_id 串行校验，最多一个未关闭房间；同 requestId 重试不重复创建，转主不释放创建名额，关闭后可重新建房。
2. 进行中的对局禁止退出/关闭，包括房主通过关闭终止整局；结束后可退出/关闭。断线或返回房间不等于退出。
3. 快速创建和独立创建页共用表单，支持游戏、人数、公开/私人类型、可选密码及选项。
4. 增加公开游戏大厅，按游戏、密码类型和等待/进行中/已结束/已关闭状态筛选，支持游标分页与刷新。历史私人房不自动公开，列表不含成员、密码摘要、邀请码或秘密 View。
5. 真人座位禁用脚本托管，服务端拒绝且界面移除入口；专用 bot 保留脚本能力，原有个人模型托管保留。009 迁移归还既有 human/script 控制权并作废旧 epoch 任务。
6. Color Match 和两种计数扩展有精确版本的公开规则说明；建房/房间/对局页可展开及复制。同一说明进入脚本 worker 和模型 adapter，规则源文件/摘要不变。
7. 修复返回房间被初始 WS 快照再次导航至对局：仅等待→开局转换触发自动进入。并修复回归中复现的晚到同步响应覆盖离线状态问题。
8. 快速创建和独立创建均成功后直接进入房间。
9. 点击邀请码复制，成功与失败都有提示；规则也支持复制。

验证记录：新增并发建房测试首先复现两个请求均返回 200，密码房创建首先复现 400；修复后通过。`pnpm test:integration` 10 文件/55 项通过，随后补充大厅分页、终局退出与释放名额断言，最终 `pnpm test` 18 文件/86 项全部通过（30 单元、56 集成，无 skip）。`pnpm test:e2e` 桌面与 Pixel 5 共 18 项全部通过，覆盖大厅密码错误/正确加入、游戏/类型筛选、创建直达、配额提示、邀请码与规则复制回调、返回房间及刷新不跳走、真人脚本禁用、专用 AI 和模型 mock。`pnpm typecheck`、`pnpm lint`、`pnpm build` 最终均通过，build 包含生产 bundle 与 API runtime 检查，仍有既有级别的 >500 kB chunk 提示。已实际查看桌面大厅、手机大厅和密码房截图，布局无横向溢出；截图在 test-results/lobby-* 下。

`pnpm db:migrate` 已向开发库应用 009，独立 boardgame_test 也已应用；`pnpm games:sync` 验证现有三个版本未变化。未覆盖 .env、未重置开发库。E2E 为每个用例独立清理测试账户，避免配额受其他用例影响，不与集成命令并行清理同一数据库。

限制：历史数据库未记录创建者，迁移按当时房主回填；历史超额房间保留，不擅自终止，需要关闭旧房后才能新建。计数房仍为无玩法按钮的身份验收扩展，进行中的历史计数局不提供普通玩家强制终止入口。模型提示规则已接入，真实外部供应商未在本轮调用；浏览器复制通过受控 Clipboard.writeText 回调验证，实际系统剪贴板权限拒绝会给出手动复制提示。没有观战功能，因此非成员不能加入进行中/已结束房间。运行中的旧 API 若未启用自动重载，需重启以加载新代码。

Git：开始与结束均确认本目录不存在 .git，git status/branch/remote 返回 not a git repository；无法提交或推送，未初始化仓库或猜测远程。待提供仓库地址/恢复 Git 元数据后才能同步。本轮协议、数据模型、架构、SDK、AI 契约、房间文档和 README 均已同步。

更新：2026-09-24

## 阶段 1

| 子任务 | 状态 | 证据 |
| --- | --- | --- |
| S1-01 仓库/环境 | 完成 | 初始仅三个规格文件；Node 22.17.0、pnpm 11.15.1、Docker/Engine 29.5.3、PostgreSQL 17-alpine |
| S1-02 workspace/配置 | 完成 | 8 个 workspace 项目、严格 TypeScript、环境 schema、锁文件、web/API 构建 |
| S1-03 PostgreSQL | 完成 | 健康容器监听宿主 5434；真实迁移及扩展同步连续两次均幂等；独立 `boardgame_test` 测试库 |
| S1-04 SDK/注册 | 完成 | manifest、SDK 兼容范围、重复注册拒绝、明确装配层及测试 |
| S1-05 Test Counter | 完成 | 服务端规则、私密投影、事件、序列化、确定性 RNG、非法动作测试 |
| S1-06 runner/API | 完成 | 真动作、revision 冲突、TTL/容量限制、重开和生产开关测试 |
| S1-07 health/catalog/WS | 完成 | live/ready 分离、真实目录、数据库断开/恢复、WS ping/pong/坏消息/来源/限流测试 |
| S1-08 前端 | 完成 | 首页、状态页、实验台、404；桌面与 Pixel 5 浏览器闭环及截图 |
| S1-09 资源/音效/AI 契约 | 完成 | 资源与 sound-map schema、引用校验、AudioPort/StorageAdapter/DecisionProvider |
| S1-10 验收/文档 | 完成 | 冻结安装、typecheck、lint、16 项测试、7 项独立集成测试、4 项 E2E、生产构建均通过 |

## 阶段结论与下一步

阶段 1 的 A01–A17 曾在 2026-09-19 全部通过，详细证据见 `docs/acceptance-stage-1.md`。2026-09-24 已恢复 PostgreSQL 并完成阶段 2 回归；开发实验台仍严格限定为开发用途，其对局只存在 API 内存中。

阶段 2 已从 accounts/sessions、rooms/members/seats、正式授权边界与持久化初始对局继续实现；开发测试座位未被复用为正式认证。

## 阶段 2

| 子任务 | 状态 | 证据 |
| --- | --- | --- |
| S2-01 核对/ADR | 完成 | 保留阶段 1 runner；新增 ADR-001，继续模块化单体 |
| S2-02 迁移/repository | 完成 | 002/003 迁移、FK/唯一/check/index、真实 PostgreSQL 验证 |
| S2-03 管理 CLI | 完成 | admin init 幂等、创建、重置、停用/启用均在测试库实际执行 |
| S2-04 session/安全 | 完成 | Argon2id、CSRF/Origin、跨进程 CLI 撤销通知和 WS 断流；真实数据库测试通过 |
| S2-05 创建/列表/邀请 | 完成 | 分页、摘要邀请码、并发建房/加入、过期与刷新码、限流测试通过 |
| S2-06 座位/准备/配置/转主 | 完成 | 并发抢座、ready 失效、改名保留准备、退出转主与空房关闭测试通过 |
| S2-07 receipts/开局 | 完成 | 并发 start 同 matchId、setup 故障注入回滚、资源清单校验测试通过 |
| S2-08 初始 view | 完成 | session account 映射固定 seat；C 读取返回 404 |
| S2-09 认证 WS/presence | 完成 | 订阅变更竞态、多标签页、跨进程撤销断流、关闭最终快照测试通过 |
| S2-10 页面/E2E | 完成 | 1440px/390px、三独立账户上下文与独立建房页，共 8 项 E2E 通过 |
| S2-11 回归/交接 | 完成 | typecheck、lint、全量测试、真实 DB 集成、浏览器 E2E、生产构建通过；详见 `docs/acceptance-stage-2.md` |

第二阶段停止在持久化初始对局和私密初始视图。阶段 3 从正式动作事务与 Color Match 开始，不复用 testSeatId。

## 阶段 3（2026-09-24）

| 子任务 | 状态 | 证据 |
| --- | --- | --- |
| S3-01 Color Match 扩展 | 完成 | 独立 `games/color-match` shared/server/client；40 张牌、确定性洗牌、2–4 人、私密手牌、公共牌、同色/同数字出牌、摸牌及弃牌重洗 |
| S3-02 回合与结算 | 完成 | 数字 5 持久化目标选择，完成效果后胜利；无牌可摸可跳过，全员连续跳过按最少手牌结算并列；六项规则测试及四账户正式动作整局覆盖 4 人 |
| S3-03 正式动作事务 | 完成 | `MatchService` 按 session/participant 授权，锁 room/match，去重先于 revision，原子保存 State/RNG/动作/receipt；拒绝无副作用 |
| S3-04 私密实时视图与事件 | 完成 | HTTP 和认证 WS 按座位投影，带 revision 的 `match.snapshot`；事件仅经 `projectEvents` 投递，带 eventId 并在客户端去重 |
| S3-05 游戏桌面 | 完成 | 扩展注册表加载 Color Match；点击选牌、高亮、出牌、摸牌、目标选择、行动记录和胜负状态；桌面与 390px 手机可点选完整对局 |
| S3-06 持久化与文档 | 完成 | 004 迁移新增 `match_actions`；同步安装新游戏；README、协议、数据模型、SDK 与架构说明已更新 |

本轮实际执行：`pnpm install --frozen-lockfile`、`pnpm typecheck`、`pnpm lint`、`pnpm test`（14 文件、44 测试通过）、`pnpm test:integration`（8 文件、27 测试通过）、`pnpm test:e2e`（桌面与 Pixel 5 共 10 测试通过）、`pnpm build`（含生产 bundle 与 API runtime 检查）均通过。开发库执行 `pnpm db:migrate` 应用 004、`pnpm games:sync` 安装 Color Match。集成与 E2E 使用与开发库不同的 `boardgame_test`；曾在容器未启动时出现 `ECONNREFUSED`，启动本地 PostgreSQL 后完成上述验证。浏览器用例覆盖两个独立账户从登录、建房、开局到获胜，并检查移动端无水平溢出。

未解决/未验证：正式 Color Match 目前使用 CSS 牌面，图包后台和音效事件播放属于后续阶段；没有 AI、托管、观战或公网部署。事件列表只展示当前页面收到的实时事件，历史回放与长期断线补发属于阶段 4。当前工作目录没有 Git 元数据，无法提供 Git diff/提交；未重建仓库。下一步按阶段 4 做断线可靠性、重启恢复及更长期的同步验收，不在本轮提前实现。

## 架构审查后续处理（2026-09-25）

核对 `docs/architecture-review-2026-09-24.md` 与阶段 3 当前代码后，修复 A07 的房间快照一致性风险：多次查询改为同一连接上的只读 `REPEATABLE READ` 事务，异常回滚并释放连接；新增真实数据库并发交错测试，检查旧 revision 不会拼接新成员列表。其余建议的当前状态见审查文档的后续核对表。

本轮实际执行：`pnpm typecheck` 通过、`pnpm lint` 通过、`pnpm test tests/unit`（6 文件、17 测试）通过。`pnpm test:integration` 在准备测试库时因 `127.0.0.1:5434 ECONNREFUSED` 中止；尝试 `pnpm db:up`，Docker Desktop Linux 引擎管道不存在，因此新增并发测试及其余集成测试尚未验证。恢复 PostgreSQL 后需重新执行 `pnpm test:integration`；本轮没有改动或重置开发数据库。当前目录仍无 Git 元数据。

随后 Docker Desktop 启动，`pnpm db:up` 成功；重新执行 `pnpm test:integration`，独立 `boardgame_test` 数据库上的 8 个文件、28 项测试全部通过，包含 A07 并发交错测试。此前的数据库阻塞已解除；仍未进行本轮浏览器 E2E 或生产构建。测试库准备脚本确认测试数据库名与开发数据库名不同。

## 阶段 4：联机可靠性与恢复（2026-09-25）

按 [第四阶段实施映射](stage-4-plan.md) 在现有正式动作链路上补齐：对局回执改为随对局保留；本人回执查询与原 ID 重试；事务内 session 复核、关闭竞态和安全恢复错误；新对局规则/资源摘要；WS 订阅初始 View、心跳与周期同步；前端刷新时保留待确认动作，结果不明时暂停新动作。事件只从 live 投影消费，刷新不补播。迁移 `005_match_reliability.sql` 已应用于开发库和独立测试库，没有修改旧迁移或重置开发数据。

实际验证：`pnpm db:up`、`pnpm db:migrate`、`pnpm typecheck`、`pnpm lint`、`pnpm test`（14 文件、59 项）、`pnpm test:integration`（8 文件、42 项）、`pnpm test:e2e`（桌面和手机共 10 项）及 `pnpm build` 均执行并通过。专项测试在真实 PostgreSQL 上覆盖独立连接同 ID 重试、关闭竞态、保存失败回滚、待选目标与重洗 RNG 恢复、损坏存档、版本缺失、代表性旧数据迁移及连接故障后恢复；通过真实 API 子进程验证 COMMIT 前终止与 COMMIT 后丢回复。浏览器专项验证回复丢失后刷新、短暂离线、在线时漏一帧 WS 通知后周期同步，以及初始 WS 快照迟于新状态时不倒退，随后继续完整对局。最新完整矩阵与仍未单独故障注入的场景见 [阶段 4 验收记录](acceptance-stage-4.md)。

当前边界：仍为单 API 实例；没有 AI、托管、资源上传、音效播放器、历史回放或备份恢复演练。旧对局无法可靠回填源码摘要，迁移保留 NULL；生产构建需包含用于规则摘要的可信源码文件。当前工作目录无 Git 元数据，无法提供 Git diff 或提交；未初始化或清理目录。下一步按 [阶段 5 交接](stage-5-handoff.md) 实现脚本 AI 与主动托管，不在第四阶段提前调用模型。

2026-09-25 后续补验：关闭 D23/D39 部分项。MatchPage 的动作、控制权和模型配置异步写回均受页面 generation 保护，并在对局切换时清除旧 busy 状态。新增桌面/手机回归，延迟旧局 View 至新局打开后返回，确认新局不被覆盖；连续刷新三次并核对旧 WS 关闭、活动 match WS 始终唯一。`pnpm typecheck`、`pnpm lint`、`pnpm test tests/unit`（10 文件/40 项）、`pnpm test:e2e tests/e2e/color-match.spec.ts`（桌面/手机 2 项）及 `pnpm build`（生产 bundle/API runtime 检查）通过，build 有既有 >500 kB chunk 提示。集成与全量 E2E 未因这次前端窄改动重跑；先前阶段完整验证记录见验收表，D23/D39 已补齐。Git 元数据仍不可用，未提交/推送，未初始化。

## 阶段 5：脚本 AI 与真人托管（2026-09-25）

完成 waiting 房间专用 AI 席位、无账户 bot 参与者、真人主动托管/收回、controllerEpoch fencing、principal 回执迁移、Color Match `basic-v1` 确定性策略、安全 decision context、PostgreSQL 持久任务、leaseGeneration、可终止 worker、合法兜底、冻结提案与启动/周期恢复扫描。AI 和真人继续使用同一扩展校验、State/RNG 保存、事件投影和正式动作事务。控制与任务状态使用独立版本，相同 match revision 的变化也能实时合并。

迁移 `006_script_ai.sql` 已应用于开发库和独立测试库，旧真人 seat/participant/receipt 保持 human 与原 request hash/controllerEpoch。新增 UI 在房间页支持添加/移除脚本 AI，在游戏页支持本人托管、收回、控制/任务状态；专用 bot 私密 View 和提案没有公共读取接口。

本轮已执行并通过：`pnpm typecheck`、`pnpm lint`、`pnpm test`（15 文件、63 项）、`pnpm test:integration`（9 文件、45 项）、`pnpm test:e2e`（桌面与 Pixel 5 共 12 项）及 `pnpm build`。专项覆盖全托管完整终局、隐藏状态不影响策略结果、同步死循环 worker 终止与合法 fallback、旧 epoch 请求失效，以及 frozen proposal 在 API 重启后保持 action/requestId 并只提交一次。完整 E01–E45 证据和深度限制见 [阶段 5 验收记录](acceptance-stage-5.md)。

边界：仍为单 API 部署目标；未做两个 API 进程同时领取的生产压测、running worker 的 OS 强杀或 10 局/40 连接定量负载记录。没有外部模型、密钥、自动断线托管、观战、资源上传或音效播放器。当前目录仍无 Git 元数据，无法提交或推送；没有初始化新仓库。下一步按 [阶段 6 交接](stage-6-handoff.md) 增加外部模型适配与预算，不改变现有安全 View、任务、epoch、proposal 和统一提交边界。

## 阶段 6：模型 AI 与个人配置（2026-09-25）

完成固定服务端点目录、个人 profile/profile version、AES-256-GCM 凭证写入与撤销、模型 attempt/预算账本迁移、OpenAI-compatible 非流式适配器、明确标识的 mock 适配器、严格 decisionId/choiceId 解析，以及 `/settings/models` 设置页。模型功能默认要求 `MODEL_CREDENTIALS_KEY`，缺失时明确不可用且不影响脚本 AI；API key 不回传或进入浏览器存储、日志和 WS。

本轮已执行：`pnpm db:migrate`、`pnpm typecheck`、`pnpm lint`、`pnpm test`（16 文件、65 项）、`pnpm test:integration`（9 文件、45 项）、`pnpm test:e2e`（桌面与 Pixel 5 共 14 项）及 `pnpm build` 均通过。mock 浏览器流程完成模型设置、连接测试、模型控制器绑定及与脚本 AI 混合完成 Color Match；007/008 迁移已应用开发库和独立测试库。真实供应商凭证不可用，F47 未执行；预算 reservation 与模型长租约/续租、未知外部请求恢复、profile 编辑版本化和真实 fake-provider 故障矩阵仍待完成，因此不能宣称所有 F01–F50 已通过。自动检查结束后已打开本地设置页供人工确认；人工结论待记录。当前目录无 Git 元数据，无法提交或推送。

2026-09-25 补充：按人工配置需求增加自定义 OpenAI-compatible Base URL 与 API key 输入。自定义端点按账户隔离，公网 HTTPS/DNS 校验与真实请求固定解析地址、TLS 校验和禁重定向已落实；本轮 `pnpm typecheck`、`pnpm lint`、`pnpm test`（17 文件/67 项）、`pnpm test:integration`（10 文件/46 项）、`pnpm test:e2e`（14 项）及 `pnpm build` 通过。真实服务商调用和页面人工确认仍待完成；验收细节见 [阶段 6 验收记录](acceptance-stage-6.md)。

2026-09-25 DNS 修复：Node `BlockList` 将 IPv4-mapped IPv6 子网同时匹配 IPv4 查询，造成 `oai.sb` 公开 IPv4 被误判。mapped IPv6 现单独拒绝，普通公网 IPv4 和可公开路由的 IPv6 按各自地址族校验。原始 `https://oai.sb/v1` 解析复现通过；新增公网 IPv4 回归测试由红转绿。修复后 typecheck、lint、17 文件/68 项测试和生产 build 均通过。人工供应商连接测试仍待用户在设置页完成。

2026-09-25 设置页修复：模型 profile 与凭证保存成功后，异步回调访问失效的 `event.currentTarget` 引发空指针，并错误显示“保存失败”。提交时缓存 form 引用后再重置；端到端断言先复现失败，修复后桌面模型设置 E2E、typecheck 和 lint 通过。用户重复提交造成的既有重复 profile 已保留。

## 模型设置可用性与连接故障修复（2026-09-25）

补齐已保存配置的编辑、取消、删除确认、密钥替换/撤销后重新填写；编辑留空保留密钥，更换地址必须重新输入。配置与密钥改为同一事务保存，防止密钥写入失败留下半成品；加入 expectedVersion、防止并发覆盖和软删除审计保留。设置响应由共享 schema 解析，错误显示在对应配置下，加载失败不再一律跳登录。加密主密钥缺失在页面提前提示。活跃模型托管中的配置须先收回控制才能编辑或删除，完整对局配置快照绑定仍待后续实现。

连接故障复现为 Node 22 HTTPS 的 lookup all:true 回调收到单地址格式，导致请求到达供应商前即失败；修复为按 options.all 返回相应形态，仍保持公网校验、地址固定和 TLS 校验。完整 chat/completions URL 不再重复拼接，取消强制 temperature/response_format 扩展参数，保留严格输出校验。HTTP 密钥错误、权限、路径/模型标识、限流/额度、参数兼容性及网络/超时分别提供安全提示；测试连接等待上限为 30 秒。测试用单条查询读取端点及对应密钥，避免并发编辑时混用。

实际验证：`pnpm test tests/unit` 8 文件/29 项通过；`pnpm test:integration` 最终 10 文件/52 项通过；`pnpm test:e2e` 桌面与 Pixel 5 共 16 项通过，最后并发读取修复后再执行 `pnpm test:e2e tests/e2e/stage6-model.spec.ts`，4 项通过。`pnpm typecheck`、`pnpm lint`、`pnpm build` 均通过，包含生产 bundle/runtime 检查。单元与集成新增测试先复现失败后转绿；覆盖 DNS 回调、接口路径、安全 HTTP 错误、版本化编辑/删除、越权拒绝、密钥保留/替换、故障回滚、更换端点重新授权和并发编辑。浏览器覆盖保存、修改、刷新、取消/确认删除、密钥撤销与恢复及错误位置；桌面/手机截图位于 test-results 对应 stage6-model 目录，已检查布局无横向溢出。E2E 使用独立随机加密测试主密钥，不依赖开发凭证。

一次全量集成的既有脚本 AI 整局测试出现 15 秒超时，单独重跑及最终全量均通过，未扩大测试时限或修改游戏逻辑。测试库仍为独立 boardgame_test，未清理开发数据。未调用真实供应商完成验收，HTTP 故障使用受控传输/浏览器响应验证；真实密钥、额度、模型权限及真实整局结果仍需实际连接确认。对局模型超时/租约、预算和授权 fencing 的既有阶段 6 缺口未宣称完成。当前目录无 Git 元数据，无法提交或推送，未初始化仓库。下一步在设置页用用户自己的服务配置点击测试连接，按具体错误核对服务商参数。

## 阶段 7：图片与短音效自定义（2026-09-25）

已实现独立资源契约和安全 JSON schema、管理员草稿/上传/映射/校验/固定预览/发布/归档/删除、内容 hash 持久存储、配额与处理状态恢复、不可变版本和引用保护、延迟 GC/完整性检查。真实 FFmpeg 解码运行于无网络、非 root、无宿主挂载且有资源/时间上限的 Docker 容器；不可用时明确失败，不降级为无隔离处理。迁移 011/012 已应用开发库和测试库。

房主 waiting 选择精确版本，真人 ready 失效；开局原事务锁定 version/hash。Color Match 接入原创 classic/paper 卡面、牌背、背景、图标和短 WAV；对手仅按公开数量显示通用背面，缺图保留语义操作。旧空默认包与历史规则/资源摘要保留，不伪造迁移为新图。资源故障不阻断游戏规则恢复。

统一 AudioManager 提供用户解锁、测试声、总静音、game/ui 音量和账户偏好、缓存/并发/冷却限制。游戏 cue 只来自提交后的已投影 WS live 批次，按 event/cue 消费与 revision 水位去重；初始/刷新/重连、过期加载与旧世代不补播。Web Locks 约束同账户同局唯一可见 owner，切换先同步；预览使用固定数据与独立播放器。无 Web Locks 时自动游戏声保守停用并提示。

实际验证：typecheck、lint、全量 `pnpm test`（21 文件/106 项，无跳过）、独立 `pnpm test:integration`（11 文件/66 项）以及 production build（含 bundle/runtime 边界检查）通过。开发 `assets:seed` 安装两套 54 个文件，`assets:check` 无丢失、摘要错误或孤儿。完整浏览器回归最终结果与 G01–G48 的逐项证据以 [阶段七验收记录](acceptance-stage-7.md) 为准；早期完整回归暴露阶段二旧自动开局声断言，已按本阶段初始快照不播放要求更新。旧阶段五测试在后台扫描未关闭时清库导致死锁，已修正测试生命周期，后续全量通过。

尚未满足完整验收：G47 人工实际听音待确认，Android/iOS 实机与 WebKit 未测；配额极值、部分并发/进程强杀及迁移夹具覆盖详见验收表的“部分”项，不将审查当成实测。没有付费模型调用、Grid Garden 或公网部署，阶段六既有缺口保持独立。工作目录无 Git 元数据，无法提交/推送，未初始化仓库。下一步补齐验收表剩余证据及人工听音；后续扩展使用 [第八阶段交接](stage-8-handoff.md)，不另建上传和播放器。

阶段七最终浏览器补充：修正旧初始播放断言后，完整 `pnpm test:e2e` 桌面与 Pixel 5 共 26 项全部通过（2.9 分钟）；已检查实际纸质替换包桌面/手机和管理员预览截图。最后 `pnpm lint` 通过。G47 仍待人工实际听音，自动浏览器 source.start 证据不替代物理音频设备验收。
