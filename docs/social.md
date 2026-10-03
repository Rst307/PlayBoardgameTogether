# 好友、好友 ID、私聊与房间邀请

2026-10-03 新增社交功能。主导航「好友」进入 `/friends`；「我的资料」和好友页均可复制、修改好友 ID。

## 使用

好友 ID 以 `@rst307` 这样的自定义名字展示和复制；设置、搜索和申请均接受带或不带 `@` 的名字。名字为 3–36 位字母、数字、下划线，大小写不敏感且全平台唯一，数据库和 DTO 保持无 `@` 的 canonical 值。新账户默认采用登录用户名，若该名字已被其他用户自定义占用则自动分配 `_2`、`_3` 等后缀，用户仍可自行修改。021 迁移只将未修改过的 `p_` + UUID 默认 ID 换成这种短名字，保留全部已经自定义的 ID，并推进被迁移账户的 social revision。修改只改变公开查找入口；登录用户名、内部账户 UUID、既有好友、消息与对局参与身份不变。旧 ID 修改后立即停止指向该账户，可被其他人使用；好友关系始终绑定内部账户，不会跟随旧 ID 转移。

精确搜索好友 ID 后发送申请；接收方接受或拒绝，发送方可以撤回。双向同时申请保留一条申请，仍需接收方确认。删除好友立即阻止双方新的私聊读取、发送和邀请，同时拒绝双方尚待回应的房间邀请。拒绝、撤回或删除后 24 小时内不能重复申请。消息仍持久保留；日后重新成为好友会重新显示原聊天记录。

好友 ID 修改间隔由管理员在「后台总览 → 好友 ID 修改规则」设置：默认 30 天，允许 0–3650 天，0 表示不限次数。首次自定义不受限制；后续从上次成功改成不同 ID 的服务端时间计算，每天为 24 小时。失败、成功请求重试或保存相同 ID 不重置时间。好友/资料页显示当前间隔与下次可修改时间；服务端拒绝冷却期间的实际修改（RATE_LIMITED），不能通过客户端绕过。管理员调整间隔立即按原修改时间重新计算，不重新开始计时。旧账户显式修改时间从历史成功回执补齐；自动分配或 021 缩短默认 ID 不启动冷却。

私聊仅支持文字，每条 trim 后 1–2000 字，React 按文本展示，不执行 HTML。列表显示未读；打开聊天后按已展示的最新消息推进本人读取水位。最新 30 条与更早历史分页读取，断网恢复按最后读取消息的 sequence 正序增量补取，超过 30 条继续分页。好友页与聊天页在可见时每 5 秒同步，恢复网络或回到页面时重新读取；页面卸载后清理定时器、监听器与进行中的读取。无推送通知、在线状态、图片、附件、群聊、语音或视频。

等待中的房间成员可从「邀请好友」发送指定接收人的邀请，24 小时有效，无需获取或公开房间邀请码。接收人在「好友 → 房间邀请」确认；密码房仍需输入密码。接受不自动入座，满员、已开局、关闭、邀请人已退出、账户停用、关系删除或邀请过期时不能加入。邀请不承诺预留席位。列表显示最近 50 条双方发出/收到的邀请。

## 实现和保护

新增迁移 `020_social.sql` 与短名字迁移 `021_friend_handles.sql`，通过 `pnpm db:migrate` 应用；不重置旧库、不改历史迁移。新账户默认名字分配与 ID 修改复用社交写锁，避免并发占用重名。`social` 服务负责关系、消息、水位、ID 和邀请。API routes 复用 session、Origin、CSRF，所有社交与资料响应 no-store。搜索仅提供活跃账户的 ID、好友 ID、昵称、内置头像，不提供用户名、简介、会话或游戏状态。私聊及游标限制在当前双方会话，第三人和管理员都不因角色获得私聊权限。

写命令携带 UUID requestId；同账户同请求原样重试先返回已保存结果，不受新的 revision 影响；复用编号改变内容返回 REQUEST_ID_CONFLICT。只保存内容 SHA-256 摘要与对应 DTO，不保存密码正文。关系命令携带 expectedRevision；修改 ID 携带本人 social revision。失败回滚关系、成员、准备、roomRevision、邀请状态与回执。

社交短写事务使用一个 PostgreSQL advisory lock 排序，适合当前小规模单 API 部署；包含房间的事务先锁 room，再锁活跃账户/session。接受邀请调用 rooms 的受信任 `joinMemberWithClient`，复用既有成员、容量、密码、waiting、ready 失效和 revision 逻辑，同一事务保存邀请结果；只有提交后通知原 room realtime。好友邀请不会增加一套游戏权限或动作接口。读取在 REPEATABLE READ 只读事务中保持关系、消息及邀请一致。

配额：每账户每分钟最多 120 个成功社交新命令（重复成功不占配额）；一对用户关联的 pending/accepted 关系合计达到 200 时拒绝新申请；发送人最多保留 20000 条消息；每天最多 100 个新邀请。精确搜索为每账户每分钟 60 次的有界单进程限流。回执、消息无自动过期清理，存储维护由维护者处理。客户端消息发送确认丢失时在当前聊天页面保留原正文和 requestId，允许重试；刷新会丢弃未确认表单，消息历史以服务端为准。

## API

所有路径前缀 `/api/v1`，均需 session；写请求额外需 Origin 与 X-CSRF-Token。共享 schema 在 `packages/protocol/src/social.ts`，client-sdk 提供对应类型化方法。

| 方法 / 路径 | 用途 / 请求 |
| --- | --- |
| GET `/social` | 本人 ID/revision、好友/未读、申请、最近邀请 |
| GET `/admin/social-settings` | 管理员读取 `{friendIdChangeDays,revision}` |
| PUT `/admin/social-settings` | 管理员保存 `{requestId,expectedRevision,friendIdChangeDays}` |
| GET `/social/search?friendId=...` | 精确活跃用户投影或 null |
| PUT `/social/id` | `{requestId,friendId,expectedRevision}` |
| POST `/social/requests` | `{requestId,friendId}` |
| POST `/social/friends/:id` | `{requestId,expectedRevision,action:accept/reject/cancel/remove}` |
| GET `/social/friends/:id/messages?before=...` | 最新/更早 30 条，items 为正序，nextCursor 为更早分页 UUID；可改用互斥 after UUID 正序增量补取，nextCursor 为继续补取游标 |
| POST `/social/friends/:id/messages` | `{requestId,text}` |
| POST `/social/friends/:id/read` | `{requestId,messageId}`，水位只前进 |
| POST `/rooms/:id/friend-invitations` | `{requestId,friendAccountId,expectedRoomRevision}` |
| POST `/social/invitations/:id` | `{requestId,action:accept/reject,password?}` |

邀请 available 是展示提示；接受事务重新检查，不能作为授权凭据。失败使用现有 FORBIDDEN、STATE_CONFLICT、ROOM_CONFIG_CHANGED、ROOM_FULL、ROOM_NOT_WAITING、INVITE_UNAVAILABLE、RATE_LIMITED 等错误码。

022 新迁移保存单行 social_settings 与 accounts.friend_id_changed_at。ID identity 增加 changeIntervalDays、nextChangeAt（ISO UTC 或 null）与 canChange。管理员设置复用 social 写锁、会话/角色重验及摘要回执，与 ID 修改串行，冲突/回执故障整体回滚；成功重试先于 revision 和冷却校验。加载 022 后才能运行新 API。
