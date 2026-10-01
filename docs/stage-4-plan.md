# 第四阶段实施映射（2026-09-25）

## 已核对基线

- 正式动作入口为 `POST /api/v1/matches/:id/actions`，由 `MatchService.act` 在一个 PostgreSQL 事务内锁房间与对局，再保存 State、RNG、revision、`match_actions`、`command_receipts`。重复请求先于 revision 检查，原有集成测试覆盖同 revision 竞争与私密视图。
- `GET /api/v1/matches/:id/view` 从 session account 映射固定参与者；`/api/v1/ws/session` 用房间订阅发送身份化 `match.snapshot`。
- `MatchPage` 原先只在首次和重连时读取 HTTP 快照；动作失败后换新 requestId 的风险来自未保存提交中的请求。页面没有连接同步门闩、心跳或漏广播校准。
- 对局回执原先沿用房间命令的 7 天 TTL，过期后旧动作可能再次执行。`matches` 原有精确版本名，但没有构建/资源摘要。Color Match 的待选目标、终局状态和牌堆均保存在序列化 State；RNG 快照含算法名和状态。
- 阶段 3 的动作记录是成功命令记录，不是完整事件溯源。房间 close 使用 room 行锁，与动作锁顺序一致。

## 本阶段实现顺序

1. 迁移已有正式动作回执为对局生命周期内不失效；新回执同样永久保留，并提供仅本人可查的结果接口。
2. 对局创建时记录规则和资源摘要；恢复时对精确版本和可解析状态失败给出安全错误，保留旧数据。
3. 客户端保存待确认动作，同 ID 查询和重试；页面重连后取权威快照，周期校准漏广播，拒绝旧 revision/旧连接写回。
4. 用独立测试库覆盖重试、冲突、回滚、权限、版本缺失；另做真实 API 进程终止和浏览器断线验证，结果写入阶段验收记录。

历史对局的代码摘要无法从数据库可靠回推，迁移保留空值。它们继续按精确 `game_id@game_version` 与资源标识恢复，不伪造摘要；新开对局必须保存摘要。
