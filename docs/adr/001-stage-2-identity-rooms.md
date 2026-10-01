# ADR-001: 持久会话、私人房间与正式演示扩展

## Status
Accepted

## Context
第二阶段需要真实身份、可重载房间、并发安全开局和按账户隔离的初始对局视图，同时必须保留第一阶段开发实验台。

## Decision
- 会话使用浏览器不透明随机 token，数据库仅存 SHA-256 摘要；密码由 `argon2` 0.45.1 以 Argon2id 默认安全参数编码。
- CSRF 随机值与会话绑定并存摘要；原值通过 SameSite cookie 与登录/`me` 响应交付，写请求同时校验 Origin 和 `X-CSRF-Token`。
- 房间、成员、座位、邀请、match 和 receipts 均由 PostgreSQL 所有。房间写入统一先锁 room 行，再检查 revision。
- 邀请码使用 12 位 Crockford Base32，数据库只存摘要；创建/刷新成功响应只显示一次。
- 第一阶段 `demo.test-counter@0.1.0` 保持 developmentOnly；新增不可变版本 `demo.counter-room@1.0.0`，复用规则实现但只允许真实参与者读取视图。
- 保持模块化单体和同一 API 进程；不引入 Redis、队列或微服务。

## Alternatives Considered
- JWT：撤销、停用与密码重置需要额外撤销表，未减少本阶段复杂度。
- 将 test-counter 改为生产扩展：会改变已发布 manifest 的语义，违反版本不可变约定。
- 单独房间服务：当前没有独立伸缩、部署或隔离需求。

## Consequences
### Positive
- 会话可立即在每次 HTTP/WS 权限检查时撤销。
- 房间和开局在进程重启后仍是数据库真相。
- 规则层仍不知道账户、HTTP 或 PostgreSQL。

### Negative
- 登录和加入限流为单进程内存状态，进程重启会重置。
- presence 是单进程内存状态，尚不支持多 API 副本。

## Revisit When
需要多 API 副本、跨进程广播或独立部署房间负载时重新评估共享 presence/广播基础设施。
