# 数据模型

## 个人资料 014（2026-10-01）

`014_account_profiles.sql` 为 accounts 新增 avatar（dice/leaf/cat/rocket/star/coffee，默认 dice）和 bio（最多 300 字，默认空字符串），保留既有 display_name 与账户 UUID。历史列表直接查询 match_participants → matches → rooms 的非秘密概要，不新建第二份对局记录，不读取 State、RNG 或动作。单语句使用 created_at/id 降序游标，每页 20 项，游标也要求属于本人；关闭房间不删除参与历史。

## 第七阶段 011/012

新增 asset_drafts（manifest/revision/status/report/hash）、asset_files（staged/processing/validated/failed/tombstone/deleted、source/final hash、元数据、reserved_bytes）、asset_versions（packId+version 唯一、不可变 manifest/hash/contract）、asset_version_files/asset_draft_files 引用及 asset_receipts。版本状态只允许发布/归档/逻辑删除；触发器阻止原地改写清单身份与内容。相同最终内容可由多个文件记录共用 storage_key，权限仍由各自版本/草稿引用决定。文件内 delete_after 承担持久删除任务。

rooms.asset_version_id 与 matches.asset_version_id 外键绑定精确版本；match 保存 asset_manifest_hash 和 asset_contract_version。保留已有 resource_pack_id/version/digest，历史 NULL 继续旧 CSS 空清单，不改 State/RNG/revision/控制/预算/回执。新引用在统一 catalog 锁下建立；全部保留 match 状态都阻止删除。

- `schema_migrations`：迁移版本、checksum；已应用 SQL 不可静默修改。
- `game_installations`：精确扩展 manifest 与启用状态。
- `accounts`：canonical username 唯一、display name、Argon2id hash、role、status；不物理删除。
- `sessions`：account、唯一 token hash、CSRF hash、绝对 expiry、revocation。
- `rooms`：host、状态、锁定前的游戏配置、seatCount、roomRevision、activeMatchId。
- `room_members`：room+account 主键及稳定 joinedAt。
- `seats`：服务端 seat UUID、room 内唯一 index，`occupant_kind=human|bot`。真人 owner 必须是成员；bot 无 owner/account，保存服务端名称和精确策略版本。
- `room_invites`：每房当前 code hash、issuedAt、expiresAt；无原码。
- `matches`：一房多轮历史、同房最多一个 active 对局；每局保存精确游戏/内容/资源版本、完整 state、RNG state、match revision 和状态。迁移 005 为新局增加 `state_schema_version`、`rule_digest`、`resource_digest`；旧局无法可靠回填摘要，保留 NULL 并按原精确版本恢复，不伪造构建指纹。
- `match_participants`：开局时固定 match/seat/index/owner；真人 account 非空，专用 bot 为空。controller、controllerEpoch、独立 controller/AI status 版本及精确策略引用均在此保存。
- `command_receipts`：`principal_key+operation+requestId` 唯一；human principal 保留 account 外键，automation principal 由服务端按 match/seat/epoch 构造。房间命令默认 7 天；match 动作与控制命令随对局保留。
- `match_actions`：每局 revision 唯一，保存 principal、已提交动作、操作者私密结果 View 和已投影事件；automation 动作的 account 为空，普通客户端不能读表。
- `ai_tasks`：决策快照键、策略摘要、状态、有限 attempt、lease fencing、冻结 proposal/requestId 和安全错误。唯一决策键防重复唤醒。

房间写操作统一先锁 `rooms` 行，再读取/修改成员和座位。数据库唯一约束是并发最后防线。`rooms(active_match_id,id)` 复合外键只能引用同房 match。邀请、session 和密码原文均不持久化；普通 receipts 不保存邀请码、session 或私密状态。

迁移 `004_match_actions.sql` 为第三阶段新增表；不修改已应用的历史迁移。正式动作依次锁房间和 match，在同一事务提交 state、rng_state、revision、status、match_actions 与 command_receipts。

迁移 `005_match_reliability.sql` 不重写旧迁移。新局的规则摘要由 registry 对可信扩展的 manifest、游戏 shared/server 源码及 game-sdk 源码计算；资源摘要覆盖当前内置资源清单。当前内置资源清单为空，尚无阶段 7 的上传文件及其字节摘要。普通客户端只能读取本人 View 和本人命令回执，不能读取 `match_actions`、State、RNG 或他人回执。

迁移 `006_script_ai.sql` 将既有座位/参与者回填为 human、既有回执 principal 回填为 `human:<accountId>`，不改变旧 request hash 或 controllerEpoch。任务索引覆盖可领取、过期 lease 与 match/seat 查询。

模型配置修复沿用既有 007/008 表结构，无新增迁移：model_profiles 保存当前配置，model_profile_versions 每次编辑追加不可变的非秘密快照，model_credentials 保存密文及撤销状态。保存时锁 profile 行并检查 expectedVersion；凭证替换、旧凭证撤销和版本插入同事务。删除设置 deleted_at/enabled 并撤销凭证，不移除历史外键引用。模型绑定以 profile 共享锁与编辑/删除串行化；已有活跃模型绑定时暂时拒绝编辑/删除。

迁移 009_room_lobby.sql：rooms 新增 creator_account_id、visibility、password_hash 与创建者/大厅索引。历史创建者以当前房主回填；历史房为 private，既有重复房间保留，配额由创建事务串行强制检查。密码原文不写入响应或 receipt result_ref。历史 human/script controller 被归还 human、推进 epoch/controllerVersion 并取消旧 epoch 任务；专用 bot 与模型控制器保留。

迁移 010_room_match_rounds.sql：移除 matches.room_id 的全局唯一约束，改为 status=active 的部分唯一索引并增加房间历史索引。match_participants.seat_id 是开局固定的身份，移除其对可重配 seats 的外键，使下一轮缩减座位不破坏历史；动作与 AI 任务仍通过 match_id/seat_id 复合外键引用参与者，开局仍从锁定的房间座位创建参与者。迁移仅将引用 finished 对局的 in_game 房间恢复 waiting、清空 active_match_id、递增 room_revision、取消真人准备。后续结算在原动作事务中执行同样复位，失败完整回滚，旧请求回执不再次复位房间。
