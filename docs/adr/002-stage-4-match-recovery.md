# ADR-002：正式对局以完整快照和持久回执恢复

日期：2026-09-25  
状态：Accepted

## 背景

阶段 3 已在 PostgreSQL 保存每步完整 State/RNG，并用 `match_actions` 与 `command_receipts` 记录成功动作。但对局回执沿用房间命令的 7 天 TTL，浏览器刷新丢失待确认 requestId，实时通知丢失时在线页面可能长期停在旧 revision。

## 决定

正式动作继续采用单事务完整快照，不引入事件重放作为恢复前提。对局回执保留到对局清理；旧 ID 重试先读回执，再判断当前 revision。客户端在当前标签页保存原意图，未知结果时先查本人回执，再以原 ID 重试。WS 只发送身份化完整 View，恢复和定期校准走鉴权 HTTP View。游戏与内置资源由精确版本及新局摘要锁定，缺失或不兼容只阻塞该局。

现有 `room.subscribe` 同时拥有房间和对应对局的订阅生命周期；服务端在注册订阅后发送 `room.snapshot` 与本人 `match.snapshot`，不新增平行的 `match.subscribe` 状态表。快照沿用 `delivery:'snapshot'|'live'`，初始与重同步由调用上下文区分；Color Match 的合法动作提示包含在本人 View。浏览器按 revision 合并，HTTP/WS 都不能让旧状态覆盖新状态。

## 后果与边界

恢复时间随单局 State 大小增长，但当前小规模自部署与 Color Match 可接受。`match_actions` 不构成完整事件溯源；历史回放另设计。单 API 进程内广播仍可能丢，但周期同步可收敛已提交状态；多实例广播与跨进程协调留待部署需求出现。旧局无法可靠补规则源码摘要，迁移保留 NULL。源码摘要依赖生产部署包含可信源码，阶段 10 可改为构建期签名清单。
