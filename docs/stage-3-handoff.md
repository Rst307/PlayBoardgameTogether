# 阶段 3 接续说明

> 本文记录阶段 2 结束时的交接基线。阶段 3 已于 2026-09-24 实施，当前结果以 [开发进度](progress.md) 和代码为准。

正式入口已经存在：`rooms.start` 创建 `matches` 和 `match_participants`；`GET /api/v1/matches/:id/view` 从 session account 映射固定 seatId，并通过 registry 的 `deserialize/getView` 返回私密视图。

阶段 3 应在同一正式身份链路上增加 Color Match 和动作提交：锁 match，按 match+account 解析 actor，检查动作 request receipt 和 expected match revision，克隆已保存 RNG，调用 parse/validate/apply，事务保存 state、rngState、revision 和命令结果，再按身份广播。不得复用 `/dev/lab` 的 `testSeatId`，不得创建第二套房间或认证。

当前 `matches.revision=0`，`state/rng_state` 已可重载；尚无正式动作表、动作 API、事件补偿或完整回放。`demo.counter-room` 只用于阶段 2 开局验收，不应演变为 Color Match。
