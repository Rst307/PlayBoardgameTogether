# 对局可靠性

## 提交与去重

正式动作通过 session account 找固定参与者；同一事务依次锁 room、match，复核 session/账户，再查 `(account,match.action:<matchId>,requestId)` 回执。命中同请求返回原 appliedRevision；相同 ID 不同内容返回 `REQUEST_ID_CONFLICT`。新请求随后检查终态、房间状态、expectedRevision、控制器和精确游戏版本。

规则只处理从数据库反序列化的 State 与可恢复 RNG。成功动作在同一事务更新 State、RNG、revision、status，并插入 `match_actions` 和永久回执。提交后才返回成功并向各参与者投影实时视图；通知失败不会撤销已提交动作，客户端每 15 秒和窗口重新聚焦时读取权威视图以收敛。PostgreSQL 行锁是并发正确性边界，单进程 WS 仅用于及时通知。

## 客户端未知结果

页面在发送前将当前账户、对局、requestId、expectedRevision、动作和尝试次数保存到当前标签页 `sessionStorage`。网络失败保留该记录并禁止新动作。恢复时先查询本人回执：accepted 后拉最新视图；not_found 时用原 ID/内容重试，自动重试次数有界；用户可手动继续确认。not_found 与超时都不等于请求已失败。账户切换、登出或会话撤销时清除本地待确认记录和私密视图。

明确的 `STATE_CONFLICT`、`CONTROLLER_CONFLICT` 或 `CONTROLLER_NOT_HUMAN` 表示本次动作已拒绝，即使 envelope 的 retryable 为 true，也不属于结果未知。客户端清除原待确认请求并读取最新视图；真人检查游戏保留的草稿后再次确认，生成新的 requestId 和 expectedRevision。retryable 在这里表示可以重新作出合法决定，不能盲目重发已被拒绝的旧 revision/epoch。

WS 重连后重新鉴权、订阅并获取完整本人 View；同步前写操作停用。页面忽略较旧 revision，live 事件按 eventId 去重；刷新、回执和同步快照不补播历史事件或将其交给未来音效播放器。连接心跳、在线事件与周期同步处理静默失活和漏广播。断线不会改变座位、准备、房主或控制器。

2026-10-02：一般 WS 断线也立即通过原认证 HTTP 快照复核。过期 session 在升级握手时被拒绝可能没有 4001；复核 UNAUTHENTICATED 后清除旧 View 与待定请求，不继续重连。异步复核结束后仅在页面世代、socket 和有效视图仍一致时安排重连；离线恢复仍通过已有 online 事件，不创建平行请求或动作通道。

## 当前边界

- 单 API 进程内广播；多副本和跨进程消息协调不在本阶段。
- 成功动作的 `match_actions` 是命令记录，不是完整事件溯源；历史回放、音效播放和资源上传留待后续阶段。
- 规则摘要读取本工作区的可信源码。生产包必须随服务保留这些源码文件；部署若只拷贝编译产物，registry 初始化会失败。阶段 10 的容器构建需明确包含源码或改用构建期签名清单。
- 旧局没有可验证的规则摘要，只锁定阶段 3 已存的精确版本字段。迁移不伪造摘要；有版本不确定的历史局需另行核对后再允许高保证恢复。
