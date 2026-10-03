# 协议

## 好友 ID 冷却规则（2026-10-03）

socialIdentity 增加 changeIntervalDays（0–3650）、nextChangeAt（ISO UTC 或 null）、canChange。首次自定义或 0 天不受限，实际改名后按服务端时间重新计算；失败、原成功请求重试及相同 ID 不重新计时。冷却期间改名为 RATE_LIMITED。GET `/api/v1/admin/social-settings` 返回 `{friendIdChangeDays,revision}`，PUT 接收 `{requestId,expectedRevision,friendIdChangeDays}`，管理员/Origin/CSRF 校验与事务角色重验，严格拒绝额外字段。成功回执先于 revision；设置与改名串行。旧 ID 回执重试保留原 friendId/revision，并补齐当前策略元数据。

## 好友、私聊与邀请（2026-10-03）

好友名字输入（ID 编辑、精确搜索和申请）接受可选单个 `@`，trim 后去前缀、lowercase 并严格校验；`@RST307` 与 `rst307` 指向同一名字。DTO 保持无前缀值，Web 展示与复制使用 `formatFriendId` 输出 `@rst307`。数据库及关系身份仍使用原账户 UUID。

新增需 session 的 `/social`、`/social/search`、`/social/id`、`/social/requests`、`/social/friends/:id`、`/social/friends/:id/messages`、`/social/friends/:id/read`、`/social/invitations/:id` 以及 `/rooms/:id/friend-invitations`。严格 schema/DTO 由 protocol/social.ts 共享，client-sdk 逐响应解析 unknown。写请求保留 Origin/CSRF，并在事务重验活跃账户/session；UUID 回执摘要绑定操作、目标和完整内容，重复成功先于 revision。私聊按双方关系授权，分页游标和已读水位不能跨会话。社交同步采用可见页面每 5 秒认证 HTTP 读取，未新增 WS 广播私聊正文。字段、配额和错误见 [社交 API](social.md#api)。

## 管理员后台（2026-10-03）

新增 GET `/api/v1/admin/overview`（真实非秘密计数）、GET `/api/v1/admin/accounts?search=&before=`（20 项账户概要分页）、PUT `/api/v1/admin/accounts/:id/status`、GET `/api/v1/admin/games`（全部安装版本，包括下架）、PUT `/api/v1/admin/games/:id/versions/:version/status`。均要求管理员 session，响应和错误 no-store/nosniff。写入额外校验 Origin/CSRF，并在事务内重验身份。

账户命令为严格 `{requestId: UUID, expectedRevision: positive integer, status: active|disabled}`；游戏命令为严格 `{requestId,expectedRevision,enabled:boolean}`。同一管理员 UUID 请求跨目标/内容复用返回 REQUEST_ID_CONFLICT，相同成功重试优先返回原 DTO；旧 revision 返回 STATE_CONFLICT。禁止通过 body 修改角色，禁止后台停用管理员账户。上架规则/资源缺失返回 GAME_VERSION_UNAVAILABLE，不存在版本 GAME_NOT_FOUND。共享 schema 位于 protocol/admin.ts；client-sdk 提供五个类型化管理方法并解析请求/响应。

下架仅更改安装启用状态，隐藏目录、阻止新建/开局，已开始对局按原锁定版本继续；游戏安装检查用共享行锁与上下架串行化。健康就绪检查核对安装和清单，不要求所有安装版本启用。申请审核沿用既有接入 API，没有安装或执行代码能力。见 [管理指南](admin.md)。

## 游戏接入申请（2026-10-03）

`POST /api/v1/game-submissions` 接收 gameSubmissionInputSchema：UUID requestId、gameId、version、name、description、固定格式 HTTPS GitHub repositoryUrl。只存纯文本资料，不下载/执行代码或修改游戏目录。登录用户 GET 同一路径（before UUID 游标，20 项分页）与 `/:id` 只读取本人；越权/不存在统一 GAME_NOT_FOUND/404。

管理员 GET `/api/v1/admin/game-submissions`、`/:id` 读取全部申请；POST `/:id/review` 接收 gameSubmissionReviewSchema：UUID requestId、expectedRevision、reviewed/rejected、必填 reviewNote。仅 pending 可审核，revision 1 → 2；reviewed 仅代表资料审阅。写入沿用 Origin/session/CSRF，事务内再次验证账户、会话及管理员角色。创建按账户 + requestId 去重，审核按申请 + 审核者 + requestId 去重，重复成功优先于配额/revision 检查；内容冲突 REQUEST_ID_CONFLICT，竞争审核 STATE_CONFLICT。

DTO 不包含申请人/审核人 ID、请求回执或会话信息，全部响应 no-store。仅 JSON，8 KiB 上限，未知字段拒绝；传输错误按 VALIDATION_ERROR 返回 400/413/415。配额与单进程 IP 限流及完整示例见 [公开接入指南](../apps/web/public/developer-docs/add-game.md)。client-sdk 提供六个类型化方法，逐边界解析共享 schema；没有上传、安装或热加载端点。

## 游戏展示配置（2026-10-02）

`GET /api/v1/games/presentations` 无需登录，返回 `{gameId,version,revision,iconUrl,coverUrl,backgroundUrl}[]`，没有配置时 revision 为 0、地址为 null。`PUT /api/v1/games/:id/versions/:version/presentation` 仅管理员可调用，继续验证 Origin/session/CSRF，输入 `{expectedRevision,iconUrl,coverUrl,backgroundUrl}`。地址为 null、公开 HTTPS（不含凭据/查询/片段）或 `/game-art/` 图片路径；禁止脚本/data/私密 API 和路径穿越。旧 revision 返回 STATE_CONFLICT，停用或不存在版本返回 GAME_NOT_FOUND。接口 no-store；返回公开展示字段，不返回修改者。协议 schema 与 client-sdk 方法共用校验。此配置不进入规则清单、对局状态或图包摘要，不提供上传端点。

## 本人资料与历史（2026-10-01）

- `GET /api/v1/profile`：返回 id、username、displayName、avatar、bio、createdAt，只能读取当前 session 账户。
- `PUT /api/v1/profile`：严格输入 `{ displayName, avatar, bio }`，昵称 trim 后 1–32 字，avatar 为内置枚举，bio trim 后最多 300 字；需要 Origin 和 CSRF，返回保存后的本人资料。不接收 accountId 或外部图片 URL。
- `GET /api/v1/profile/matches?before=<match UUID>`：返回 `{ items, nextCursor }`，每项仅 id、gameId、gameVersion、roomName、status、createdAt；按固定参与者身份过滤，每页 20 项。before 必须是 UUID，非本人游标不返回记录。

共享 schema 与类型在 protocol/profile.ts，client-sdk 的 profile/saveProfile/matchHistory 解析 unknown 响应。未新增全局胜率或胜负推断，游戏结果仍由各扩展的本人 View 展示。

## 第七阶段资源接口

GET `/assets/contracts`、`/assets/versions?gameId=...`、`/assets/versions/:id`、`/assets/files/:id` 需要登录。文件先鉴权后 ETag，private/max-age=0/must-revalidate、nosniff、正确 MIME 和长度。

管理员 `/admin/assets/drafts` 支持 GET/POST；`/:id` GET/PATCH/DELETE；`/:id/files` GET/POST；`/:id/validate`、`/:id/publish` POST；`/admin/assets/versions` GET，`/:id/archive` POST，`/:id` DELETE。写请求保持 Origin/CSRF/session/role。上传原始媒体正文，头部 X-Request-Id、X-File-Name（URI 编码仅显示）、X-File-Size、X-Content-SHA256，接收前预留配额；重复请求绑定全部内容。草稿编辑传 manifestText，服务端检查重复 JSON 键；发布传 expectedDraftRevision/contentHash/requestId。

PUT `/rooms/:id/assets`：requestId/expectedRoomRevision/versionId，只允许 waiting 房主，复用房间命令事务与 ready 失效。RoomSnapshot 增加 assetVersionId；MatchView 增加 nullable assetBinding(versionId/manifestHash/contractVersion) 和可选 cues(eventId/cueIndex/cueId)。cue 只在已投影 WS live 完整批次出现，HTTP receipt/initial/resync 静默；同 revision 的完整 cue 批次消费后关闭水位。错误复用 VALIDATION_ERROR、FORBIDDEN、STATE_CONFLICT、REQUEST_ID_CONFLICT、GAME_VERSION_UNAVAILABLE、SERVICE_UNAVAILABLE。

HTTP envelope 为 `{ok:true,data,traceId}` 或 `{ok:false,error:{code,message,retryable},traceId}`。认证/房间/match 响应带 `Cache-Control: no-store`。

## HTTP

- `POST /api/v1/auth/login`、`GET /auth/me`、`POST /auth/logout`
- `GET/POST /api/v1/rooms`、`POST /rooms/join`；列表默认 20、最大 50，返回 `{items,nextCursor}`，用 `?cursor=...` 翻页
- `GET /rooms/:id`
- `PATCH /rooms/:id/config`
- `POST /rooms/:id/invite|leave|host|start|close`
- `PUT|DELETE /rooms/:id/my-seat`、`PUT /rooms/:id/my-ready`
- `PUT|PATCH|DELETE /rooms/:id/seats/:seatId/bot`：waiting 房主添加/修改/移除 AI。script 输入 policyId=basic-v1（兼容省略 controllerType）；model 输入 controllerType=model 与本人的 profileId。请求严格校验并携带 requestId/expectedRoomRevision；回执绑定目标 seatId。模型变更取消真人准备，开局重新校验并固定授权。快照仅房主可见 botModelProfileId，其他成员该字段为 null；没有 profile 地址、密钥或 bot 私密 View。
- `GET /games/:id/ai-policies`：公开兼容策略描述，不返回模块路径。
- `GET /api/v1/matches/:id/view`
- `POST /api/v1/matches/:id/actions`：`{requestId,expectedRevision,expectedControllerEpoch,action}`；不接受客户端 seatId/automation 标记。epoch 0 的旧阶段 4 请求保留兼容，发生控制切换后必须携带当前 epoch。
- `PUT /api/v1/matches/:id/my-controller`：本人 set human/model（human 座位设置 script 返回 FORBIDDEN），带 requestId、expectedControllerEpoch；model 必须提供本人的 profileId。
- `POST /api/v1/matches/:id/seats/:seatId/ai-retry`：本人或专用 bot 房主重试 blocked 调度。
- `GET /api/v1/matches/:id/commands/:requestId`：只允许当前 session 对应的固定参与者查询本人 `match.action` 结果。返回 `{outcome:'accepted',requestId,appliedRevision}` 或 `{outcome:'not_found',requestId}`；not_found 不证明正在执行的请求最终不会提交，客户端必须以原 ID 和原内容重试。

所有房间写请求带 requestId；依赖当前决定的写请求再带 expectedRoomRevision。身份字段不由 body 接收。未找到和非成员对外统一 404 语义。

正式动作按 session account 映射固定参与者，事务内再次检查 session/账户状态，先查同一 requestId 的已提交结果，再检查 match revision 与规则。相同请求返回原 revision/View，但不重放原 live 事件；不同内容复用 ID 返回 `REQUEST_ID_CONFLICT`；旧 revision 返回 `STATE_CONFLICT`；非法或终局动作返回 `ACTION_NOT_ALLOWED`。成功后同一事务保存状态、RNG、revision、动作和结果引用。正式动作回执在对局保留期内不设 7 天 TTL；客户端不可把旧回执 View 当作最新视图。

阶段 5 新增 `CONTROLLER_CONFLICT`、`CONTROLLER_NOT_HUMAN`、`AI_POLICY_UNAVAILABLE`、`AI_NOT_SUPPORTED`、`AI_TASK_STALE`、`AI_BLOCKED`。内部 lease 细节不通过公共接口泄露。

## 模型设置

模型设置接口（均以当前 session 为所有者，写入保留 Origin/CSRF 校验，响应 no-store）：

- `GET /api/v1/model-endpoints`：公共可选服务目录；`GET /api/v1/me/model-settings`：只返回 credentialsAvailable。
- `GET/POST /api/v1/me/model-profiles`：列出本人未删除配置／原子创建配置与可选 apiKey。
- `PATCH /api/v1/me/model-profiles/:id`：完整编辑字段加 expectedVersion；可选 apiKey 缺省表示保留，地址改变必须重新提供密钥；版本冲突返回 STATE_CONFLICT。
- `DELETE /api/v1/me/model-profiles/:id`：软删除并撤销凭证；正在用于活跃对局模型托管的配置拒绝编辑和删除。
- `PUT|DELETE /api/v1/me/model-profiles/:id/credential`：替换／撤销本人密钥，不返回密钥内容。
- `POST /api/v1/me/model-profiles/:id/test`：显式触发一次无私密游戏数据的连接测试，返回 attemptId、status、kind（real/mock）。

共享 modelProfileInputSchema、modelProfileUpdateSchema 及响应 schema 位于 protocol，client-sdk 在响应边界解析，不再由调用者传泛型断言模型设置响应。

## WebSocket

`/api/v1/ws`：公开诊断 hello/ping/pong。

`/api/v1/ws/session`：cookie session + Origin。客户端发送 `room.subscribe(roomId)`、`room.unsubscribe(roomId)`、`ping`；服务端发送 `session.ready`、`room.snapshot`、`room.presence`、`room.closed`、`subscription.revoked`、`pong`、`error`。snapshot 是完整替换，客户端只接受不低于当前 roomRevision 的版本。presence 使用独立 presenceSeq，不推进 roomRevision。每连接最多订阅 10 个房间、每秒最多处理 10 条消息；会话失效时断开连接。

订阅正在进行的房间时，服务端在 `room.snapshot` 后发送本人初始 `match.snapshot`。阶段 5 snapshot 增加本人 controller、公开 controllers 和 aiStatus；控制/任务状态可在相同游戏 revision 下更新。客户端分别按 revision、controllerVersion、aiStatusVersion 合并，仍只对 live 游戏事件按 eventId 去重。

正常结算提交后推送 finished 的 `match.snapshot` 和 waiting 的 `room.snapshot`；两者分别按自身 revision 合并，不依赖到达顺序。waiting 快照的 activeMatchId 和 matchStatus 均为 null，真人 ready 为 false。历史结果继续通过原 matchId 的 View 接口按参与者身份读取。订阅 waiting 房间不会补发上一局 match.snapshot；结果页在房间订阅确认后用 REST 同步已结束的对局，不无限等待已移除的 activeMatchId。

## 房间大厅与规则（2026-09-25）

- POST /rooms：共享 createRoomInputSchema；可选 visibility=public/private、password（1–128 字符）。缺省 private 保持旧客户端隐私。重复 requestId 不重复建房；新请求超过一个未关闭创建房间返回 ROOM_CONFIG_CHANGED/409。
- GET /rooms/lobby：需要会话；limit 默认 20、最大 50，cursor、gameId、roomType=open/password、status=waiting/in_game/finished/closed 可选。返回 lobbyPageSchema 的公开概要与 nextCursor，不返回成员、私密 State、邀请码或密码摘要。
- POST /rooms/:id/join：公开房通过 requestId 和可选 password 加入。私人房返回 ROOM_NOT_FOUND。邀请码路径 POST /rooms/join 同样接受 password；密码错误 FORBIDDEN/403；共享加入频控。
- GET /games/:id/versions/:version/rules：精确版本的公开规则文本，返回 gameId/version/rules；未知版本明确 404。
- room.snapshot 增加 visibility、hasPassword、matchStatus；进行中退出返回 ROOM_ALREADY_STARTED/409；关闭仅限房主，允许终止 active 对局，非房主返回 FORBIDDEN/403。关闭与终止同事务提交，成功后广播关闭快照/通知。导航不改变成员资格。

新大厅/创建结果/规则的客户端响应均经共享 schema 校验。控制器仍保留协议 script 枚举用于专用 bot 与历史回执；真人新请求无法开启脚本。
