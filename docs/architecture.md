# 架构

## 注册入口（2026-10-03）

`registration-routes.ts` 管理公开注册的 Origin/JSON/正文上限和有界 IP 限流，app 只装配；AuthService.register 复用既有 Argon2id 和 accounts，在 social-write 锁与单事务中创建普通账户及指定初始好友 ID。协议校验位于 protocol/auth.ts，client-sdk.register 解析输入/公开结果；Web RegisterPage 按需加载，有重复提交锁与卸载清理，成功后返回 LoginPage，仅传递公开 ID。登录支持可选 @，继续使用原 session/CSRF 体系。无新数据库迁移或运行服务。

## 在线游戏 ZIP（2026-10-03）

catalog/package-service 与 package-routes 拥有固定三文件 ZIP 校验、安装事务与持久回执；registry/package-runtime 使用有界 QuickJS WASM 适配既有 GameExtension，同步 JSON 方法不注入宿主对象或权限。规则与空默认清单只在 registry 装配；已有 rooms/matches 仍拥有身份、状态、RNG、revision、事件投影与事务。Web game-registry 对在线版本装配 PackageBoard，sandbox iframe 只收到本人 View/live 投影事件，动作回到原平台命令链路。

023/024 在 PostgreSQL 保存不可变包，提交后装配；涉及游戏的请求前读取版本目录并补齐新版本，包含下架版本以恢复旧局。安装源码不依赖上传者账户生命周期，不执行 npm/子进程或 Node.js 动态 import，不创建额外服务。桌面 HTML 是公开程序。v1 只支持自包含同步规则/HTML 和真人玩法，原静态扩展保留所有已有能力。详情见 [ADR-005](adr/005-runtime-game-packages.md)。下方关于“没有上传/热加载”的记录为此前能力边界。

## 社交模块（2026-10-03）

022 将好友 ID 修改间隔与最后修改时间持久化于 social_settings/accounts；social 服务拥有管理员设置的规则/事务，与 ID 修改共用社交写锁和回执，不新增独立配置服务。后台总览 SocialSettingsPanel 经 typed client-sdk 编辑；FriendIdCard 消费服务端 eligibility。平台后台导航补齐 SPA 白名单，「更多」只保留管理入口、个人设置与开发专用工具，管理子项集中在后台。

API `social/service` 与独立 routes 拥有可变好友 ID、申请/关系、私聊/单调读取水位、定向房间邀请；复用既有 auth，protocol/social.ts 与 client-sdk 提供严格 schema/DTO。Web FriendsPage 按 `/friends`、`/friends/add`、`/friends/requests`、`/friends/invitations` 和 `/friends/chat/:accountId` 渲染独立任务页面；统一页面路由和 SPA 白名单管理地址/标题/历史，主导航在所有子页保持选中。FriendIdCard、DirectChat、InviteFriends 各自管理表单和交互，共用可取消的每 5 秒 HTTP 同步 hook，无新运行单元或私聊 WS 广播。浏览器只收到本人有权读取的社交投影。

020 持久化社交表，短写事务通过 PostgreSQL advisory lock 排序，重验活跃账户/session，内容摘要回执在 revision 前去重；只读 REPEATABLE READ 保持一致。定向邀请与 room 锁序保持 room → account/session，接受在同一事务调用 rooms 受信任 joinMemberWithClient，复用原状态/成员/密码/容量/ready/revision 规则，邀请结果与回执一起提交；commit 后经原 room realtime 广播。没有新建认证、座位权限或平行游戏动作系统。完整边界见 [社交功能](social.md)。

## 花砖物语扩展（2026-10-03）

`games/azul` 的 `azul.base@1.0.0` 拥有经典彩墙规则、隐藏袋序、公开板、逐砖计分与存档守恒检查。API registry 装配摘要/说明/音频契约，Web registry 按需加载桌面，policy worker 装配只消费 View 的策略。复用 rooms/matches 的身份、回执、revision、事务、恢复与终局房间复位，不增加平台规则分支或迁移。

客户端有界队列仅播放 MatchPage 提供的去重 live `round.scored` 投影，最新 View 与服务端计分保持权威，不阻塞操作或补播历史。`scripts/azul-audio.ts` 生成原创短音，经既有 seed-assets 和隔离媒体校验安装；AudioManager 维持偏好和 owner，没有另建播放器。游戏 build 复制 CSS 至生产 client 位置。

## 管理员后台（2026-10-03）

apps/api/src/admin 拥有平台非秘密统计、账户状态与安装版本启停事务；routes 负责传输和既有认证边界，app 只装配。protocol/admin.ts 与 client-sdk 提供共享 schema 和类型化方法，Web 后台按需加载，并在渲染内容前验证管理员身份。资料审核、展示和资源仍由原 catalog/assets 模块拥有。

019 的 admin_revision 触发器覆盖接口及 CLI 的实质状态更新；独立管理回执与状态/会话撤销/通知原子提交，重复成功先于 revision 检查。房间安装校验通过共享安装行锁与版本启停串行化。健康检查允许已安装版本下架，游戏目录仍只返回已启用版本；matches 精确规则恢复不依赖目录启用状态。不新增运行单元、动态代码执行或第二套游戏规则系统。

## 游戏接入申请（2026-10-03）

catalog/submissions 与 submission-routes 拥有纯资料申请、本人读取及管理员审阅；app 只装配。protocol 定义严格输入/输出，client-sdk 提供六个类型化方法，公开 SDK 白名单包含新协议源码。018 持久化申请与去重/审核记录；事务锁与数据库配额防止并发重复和无限存储，写入内重验 session/active account/管理员角色。申请相关路由有有界、无定时器的单进程 IP 请求限流，错误和成功均 no-store。

不接收文件或规则入口，不使用 fetch、DNS、解压、动态 import、eval、子进程或安装命令；GitHub 地址只作为资料。reviewed 不是源码安全认证，不改变静态 registry、game_installations、房间或旧局版本。现有可信注册流程继续保留；第三方代码隔离运行及动态发布尚未实现。

## 可选交互教程（2026-10-03）

`game-sdk/tutorial` 定义公开练习帧、步骤、动作反馈与纯进度转换；不依赖 React 或具体游戏规则。Web `game-registry.tsx` 的 `clientTutorials` 按精确 gameId@version 装配可选异步教程，详情仅在提供教程时显示入口。`/games/:id/:version/tutorial` 按页加载，先确认公开目录仍启用该版本，再加载原 GameBoard 与教程。TutorialPlayer 管理步骤、重试、进度、高亮和完成返回；练习操作只调用扩展教程回调。刷新重新开始，不持久化完成记录。

Color Match 的 `client/tutorial.ts` 只使用固定公开练习 View 和投影格式事件；游戏语义与动作解析由扩展拥有。客户端不导入 server、不读取正式 State、不调用正式动作 API、不创建练习房间，不改变既有规则 manifest/源码摘要、对局事务或权限。单元测试将每步动作和 View/事件与真实 server 规则对照，防止练习漂移；正式规则仍只在 server 执行。 璀璨宝石的独立 ./tutorial 导出复用同一播放器，十一个固定场景仅加载合成公开投影；离线作者脚本调用真实规则生成练习数据，测试逐动作核对完整 View 与投影事件。正式桌面不加载练习数据，规则摘要与存档不变。公开 SDK 白名单包含教程契约源码，开发者可选择不注册教程。

## 游戏目录与详情入口（2026-10-02）

首页的 GameCatalog 消费既有公开游戏目录，经本地 Zod schema 解析 unknown，排除 developmentOnly；登录与未登录页面共用目录。`/games/:id/:version` 按页加载 GameDetailPage，`/games/:id/:version/new` 复用 NewRoomPage/RoomCreateForm 并带入精确目录版本，缺失时禁用创建而不自动换版本；旧 `/rooms/new` 保留兼容。navigation 的页面链接白名单包含新路由，延续 history、焦点及无刷新导航。

详情页默认复用 Lobby 的 gameId 筛选、密码与分页，在列表标题旁提供创建入口；RoomInviteForm 与 GameRules 放到列表下方的折叠区域。邀请码仍决定实际房间，服务端权限与校验保持。公开加入有请求锁与页面世代检查，卸载或筛选变更后的迟到回复不导航。首页保留参与房间。

catalog/GamePresentationService 与独立 routes 拥有目录展示配置，管理员写入继续使用 AuthService 的角色、Origin 和 CSRF 校验。迁移 015 的 game_presentations 按精确安装版本保存图片地址/revision；保存锁安装版本行并在事务内检查 revision，避免并发首写或编辑覆盖。公开只投影三个地址与版本，不暴露修改者。protocol/client-sdk 共用 schema，Web 将游戏清单与公开展示配置合并；客户端 catalog-art 提供游戏专属默认插画，GameArtwork 处理图像加载失败。新增公开源码也进入开发 SDK 下载白名单。图片配置不修改 manifest/rule digest、秘密 State、房间版本或对局资源绑定，不新增媒体上传或规则分支。

## 平台外壳与依赖检查（2026-10-02）

Web 的 app/routes.tsx 统一路由、工作区标题和按页加载；App 只保留站点外壳、导航和文档标题更新，RootPage 管理首页会话状态。app/developer-guides.ts 为路由标题与文档目录提供同一份元数据，文档页不再在卸载时覆盖下一页标题。app/PageBoundary.tsx 隔离页面加载/绘制失败，保留导航和整页重新加载入口；main 的路径 key 与房间/对局 ID 隔离继续保留。

scripts/check-boundaries.ts 自动发现游戏，通过 dependency-boundaries.ts 的 TypeScript AST 校验 Web、UI、client-sdk、protocol、game-sdk 及全部游戏源目录；覆盖字面量静态/动态/类型导入与再导出及相对路径归一化。不是第三方依赖完整图或计算型导入校验，生产 bundle/API runtime 检查仍独立执行。没有改变业务 API、数据库、规则、身份或广播。审查和后续批次见 [项目优化](project-optimization-2026-10-02.md)。

MatchPage 在 WS 非专用失效码断线后也通过既有认证 HTTP 读取复核会话，处理升级握手拒绝而没有 4001 的情况。复核发现 UNAUTHENTICATED 时清除旧 View 与待定请求；只有当前页面世代、当前 socket 和有效快照仍存在才安排重连，避免过期异步结果创建额外连接。继续使用同一身份化快照接口，不新增协议或权限通道。

## 公开开发者文档（2026-10-02）

Web 主导航新增无需 session 的 `/developers` 及指南子页面，页面按需加载并读取 `apps/web/public/developer-docs/*.md`。受限 Markdown 渲染使用 React 文本转义，不解释 HTML 或可执行链接；文档目录、搜索、页内锚点和下载保留浏览器语义。

`apps/web/developer-publication.ts` 是 Vite 构建/开发插件，只读取显式白名单中的 game-sdk、client-sdk、protocol 公开源码及 package.json，生成 `/developer-sdk/sdk-sources.json`、逐文件源码与 `/llms-full.txt`。开发与生产使用同一生成器，源码包记录 SHA-256，避免手工副本漂移；不遍历仓库、不发布 API/游戏 server、环境或本地资源。业务 API 的 session/Origin/CSRF/成员权限不变，没有新增安装游戏的业务端点或 npm 发布流程。

## 大厅与个人资料（2026-10-01）

首页 DashboardPage 收拢为游戏大厅，展示参与房间、邀请码和公开大厅；创建只通过大厅按钮进入 `/rooms/new`，导航保留游戏大厅与我的资料。`ProfileService` 拥有本人资料更新和参与历史概要查询，app 只装配现有认证/CSRF 与 schema 边界。资料与历史由 protocol/client-sdk 共享类型，ProfilePage 不读取秘密 State。旧对局沿用 MatchPage 身份化 View；初次打开 aborted 对局只读展示，不订阅已关闭房间，在线 active 对局被关闭时仍回大厅。下方快速创建描述为历史实现。

## 第九阶段 UI 边界

平台共享 PageFeedback、ActionHint 与 GameErrorBoundary；MatchPage 的 GameSurface 在渲染边界内调用现有 clientGame，不从具体 server State 推导提示。规则、动作事务、DTO 与资源锁未改变。Grid Garden 新增最近公开行动表现，仍只接收 MatchPage 过滤并按 eventId 去重后的 live 事件；恢复不补入历史表现。App 按 room/match ID 挂载页面，RoomPage 在卸载后停止旧写回复导航。

开发 `/dev/ui` 使用匿名公开 View 和本地点击记录，与正式 API/模型隔离；生产 build 关闭开发标志并替换开发模块，检查场景数据没有进入构建。UI 系统与维护见 ui-system.md、ui-development.md。

## 第八阶段多行动者扩展

`games/grid-garden` 是第二个正式规则扩展：服务端拥有 4×4 独立棋盘、秘密选择、原子公开、落子和计分；客户端只消费身份化 `GardenView`。最后选择/落子仍由既有 `MatchService` 在 room → match 锁、receipt、revision、epoch 和事务边界内提交，平台核心不包含 Grid Garden 规则分支。

game-sdk 的可选 `getDecisionRequests` 表达一个快照中的多个合法行动席位。AI 调度器据此为每个席位创建任务，但 claim 查询保持同局单自动任务；任务计算后仍以 sourceRevision/controllerEpoch/lease fencing 进入统一动作服务。`ai_decision_groups` 跨 sourceRevision 记录模型外部发送次数，避免同一决策组在 stale/重启后无限计费。

Grid Garden 独立 asset contract 与 presentation adapter 复用阶段 7 的不可变资源版本、AssetResolver 和 AudioManager。未公开选择只产生不含 choice 的公共提交事件，只有 reveal/place/finish 投影事件映射声音。

## 第七阶段资源与表现

API assets 模块拥有草稿/媒体状态/配额/清单/引用/回执，LocalAssetStorage 保存不可变字节。上传先预留、事务外隔离 FFmpeg 解码与写文件、短事务激活。Docker 工具容器使用 65534、无网络、只读、无挂载及 CPU/内存/PID/时间限制，不是额外常驻业务服务。房间先锁 room 再锁资源 catalog，资源管理不反向锁 room；match 同事务固定资源引用。旧 CSS 资源锁和规则摘要不改写。

可信游戏独立 assets 入口声明 contract 与已投影事件到 cue 的适配器，仅 registry 装配。Web AssetResolver 校验精确清单 hash，游戏通过逻辑 key 渲染；统一 AudioManager 消费同步后 WS live 完整批次、控制世代/水位/owner，不参与规则或 AI。管理预览使用固定演示数据及独立音量。详见 ADR-003、assets.md、audio.md；下方旧阶段不含资源的描述为当时边界。

## 运行单元与模块

- `apps/web`：React 平台外壳；只接收公开 DTO 和当前账户的玩家视图。
- `apps/api`：Fastify 模块化单体，包含 auth/session、rooms、matches 正式动作、room/match realtime、持久 AI 调度、registry 和开发 runner。
- PostgreSQL：账户、会话、房间、邀请码、match 状态与动作、参与者、receipts 和扩展安装元数据的真相来源。
- `games/test-counter`：同一规则实现提供 developmentOnly `demo.test-counter` 和正式身份验收用 `demo.counter-room` 两个不可变 manifest。
- `games/color-match`：独立的 2–4 人完整卡牌游戏；server 规则、shared schema 和 client 桌面分离。

```text
web -> client-sdk -> HTTP / authenticated WS
                       |
                    Fastify routes
                       |
       auth/session -- rooms service -- PostgreSQL
                          |
                     registry interface
                          |
                     trusted game setup
```

路由只做 schema、身份和浏览器安全边界；房间 service 拥有房间事务，match service 拥有正式动作事务、锁、revision、receipts 与身份化 View。游戏规则不依赖 React、HTTP、账户或数据库。registry 是平台引用具体 server 扩展的唯一装配层。

## 关键数据流

登录：Origin → 统一凭据错误/限流 → Argon2id verify → 随机 session/CSRF → token 摘要落库 →安全 cookie 与公开账户 DTO。

房间命令：session → Origin/CSRF → receipt 去重 → `SELECT room FOR UPDATE` → 成员/房主/revision/状态规则 → 原子写入并递增 revision → commit → WS 完整快照。

开局：锁 room → 校验全员入座、ready 和 active account → 精确 registry 安装版本与默认资源清单 → 注入 RNG 调用 setup → serialize/deserialize 自检 → 保存 match/participants/state/RNG → room 进入 in_game → commit 后广播 matchId。

视图：session account → match participant seatId → deserialize 权威 state → `getView(seat viewer)`；房主没有越权读取其他座位的接口。

房间快照：在单个连接的只读 `REPEATABLE READ` 事务内读取房间、成员、座位与扩展安装信息，确保同一响应的 roomRevision 与内容来自同一数据库视图；身份与成员权限仍在每次查询时校验。

正式动作：session → Origin/CSRF → 锁 room 与 match → 固定参与者/控制权 → request receipt 去重 → match revision → 扩展 parse/validate/apply → 原子保存 state、RNG、revision、动作和结果引用 → commit 后分别投影并广播玩家 View/事件。失败回滚且不广播。

第四阶段恢复：正式动作在锁内再次检查 session/账户；对局回执与 match 同生命周期保留。客户端未知结果先查询本人回执，再用原 requestId 重试；刷新后从数据库完整快照恢复，不调用 setup。新对局锁定规则源码与内置资源清单摘要，状态/RNG 不兼容时只阻塞该局。WS 订阅提供本人初始快照，客户端按 revision 合并并通过 15 秒权威读取收敛漏广播。详情见 [可靠性](reliability.md) 和 [恢复步骤](recovery.md)。

第五阶段 AI：waiting 房间座位可由无账户 bot 占用；开局固定 owner/occupant/controller/policy。调度器从 PostgreSQL 任务表扫描并领取，短事务生成当前 seat 的 View 与合法候选，在可终止 worker 中运行可信策略，冻结 proposal 后按 room → match → participant → task 锁序调用统一动作事务。automation principal、revision、controllerEpoch、策略摘要和 leaseGeneration 共同 fencing。控制与 AI 状态使用独立版本并按身份广播，不推进游戏 revision。

## 边界与限制

阶段 6 设置修复（2026-09-25）：`model-profiles.ts` 拥有个人配置、版本、加密凭证与事务；`model-ai.ts` 保留公网地址校验、模型传输和输出解析。`app.ts` 只装配认证路由，client-sdk 解析共享 DTO，设置页管理表单和逐配置操作状态。模型调用继续沿用原调度器与正式动作入口。当前使用活跃绑定检查阻止在对局中修改配置，完整的版本化绑定、预算和模型长租约仍属未完成项。

`/api/v1/ws` 仍只做公开诊断。`/api/v1/ws/session` 使用 cookie、Origin，并在订阅、消息和广播时重验会话/成员。presence 在单 API 进程内维护，最后连接关闭 10 秒后离线，不改变 roomRevision。

开发实验台仍需 `NODE_ENV=development && ENABLE_DEV_LAB=true`，正式页面不提供 test seat 切换。阶段 5 只包含内置脚本策略，不包含外部模型、资源上传、事件音效、观战或公网部署。match 页继续按身份投影视图并用 eventId 去重。服务仍是单 API 实例，不能把进程内广播当成多副本协调。

## 房间体验修复（2026-09-25）

大厅公开概要和密码加入继续由 rooms 拥有；app 仅装配认证/频控，protocol/client-sdk 提供共享 schema 边界。快速创建和独立创建页共用 RoomCreateForm，大厅筛选/分页由 Lobby 管理。新增公开说明由各游戏的独立 rules 入口导出，仅在 API registry 精确版本装配，再供规则接口和 AI context 共用；不修改已有规则源文件或摘要，旧局规则锁不受说明文案影响。真人脚本托管禁用不取消既有模型配置功能。

正常结算由 matches 在原动作事务和 room → match 锁内恢复房间 waiting、清除本局关联和真人准备；真人与 automation 共用事务内复位函数。commit 后 match 变更通知标记房间也有变化，由 app 同时广播两类快照。房间可承载多轮，固定的 match participant 不依赖后续房间座位是否保留；旧对局的 View、receipt、规则摘要继续独立恢复。

## 璀璨宝石扩展（2026-10-01）

2026-10-02 独立 assets 契约在 API registry 注册，Web registry 将精确 AssetResolver 传入桌面并装配固定素材预览。scripts/seed-splendor-assets.ts 通过现有 AssetService 安装 SVG 空映射和本地 TTS 完整映射，重用媒体隔离、哈希、不可变发布和既有房间/对局绑定。不改变 shared/server/catalog 源码或其摘要，不增加数据库迁移；原空绑定对局保持兼容。素材仅持久于本地资源存储，不放入浏览器包或规则 State。

新增 games/splendor，shared 定义动作/View 和功能牌表，server 拥有权威牌堆、预留、阶段、规则与存档检查，client 绘制原创 SVG 并提供确认式交互。API registry、Web game-registry、AI policy worker 与安装脚本分别装配该包；没有新增平台规则分支、HTTP/WS 协议或数据库表。splendor.base@1.0.0 摘要额外覆盖 catalog 源码。存档恢复按字段验证最终分数，允许 JSONB 键重排。详见 [璀璨宝石](games/splendor.md)。


2026-10-02 璀璨宝石可玩性优化：Web registry 将现有 MatchPage 去重后的 live 公开事件传给 SplendorBoard；客户端 Activity 在边界解析事件、按 eventId 保留短记录并展示临时行动／购买卡面。visuals 共享精确资源与失败回退，interaction 用本人 View 的合法候选校验本地宝石草稿，正式提交仍由原 matches 链路处理。没有改变 shared/server/catalog、规则摘要、事件投影、HTTP/WS 或数据库；既有存档和图包锁继续兼容。

## 模型 bot 授权（2026-10-03）

RoomService 复用原房间写事务添加和修改 bot 的脚本/模型配置；协议共用 botSeatCommandSchema 与 roomSnapshotSchema，client-sdk saveRoomBot 解析请求和完整房间响应。房间公开模型类型，仅房主快照包含 botModelProfileId，成员不读取私人模型配置、端点或密钥。Web BotSeatSettings 只管理候选和表单，RoomPage 保持命令、revision 与页面世代处理。

开局时 bot 的 account_id 仍为 NULL；model_owner_account_id 单独固定授权房主，复合外键保证 profile 归属。调度器以该授权账户取得凭证，按 bot 自己的 View 决策，自动动作仍走原 matches 事务；提交时也检查授权账户 active。profile 行共享锁与编辑/删除串行化，活跃模型 bot 与真人模型绑定共同阻止配置编辑/删除。见 [ADR-004](adr/004-model-bot-authorization.md)。

模型决策组：单行动者扩展按 sourceRevision + decisionKey 区分已提交动作后的下一次决定，避免固定 phase/seat 键令整局两次调用后永久兜底；有 getDecisionRequests 的同时行动扩展保留原跨 revision 决策组。每组最多两次外部尝试，旧 epoch/proposal/lease fencing 保持。
