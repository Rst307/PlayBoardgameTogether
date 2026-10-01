# 脚本 AI 调度器

`ai_tasks` 是权威队列，进程内唤醒只降低延迟。启动及默认每 5 秒扫描 active 对局，补偿开局/动作提交后进程退出的窗口。逻辑唯一键是 `(match_id, seat_id, source_revision, controller_epoch, decision_key)`。

任务按 availableAt、createdAt 领取，使用 PostgreSQL `FOR UPDATE SKIP LOCKED`、15 秒 lease 与递增 leaseGeneration。默认全局并行 4，同局最多一个 running/proposed/submitting 任务。短事务生成本人 View 与合法候选后释放数据库连接；策略在 `worker_threads` 中运行，默认 2 秒后真正 terminate。worker 只有可克隆 DTO，没有数据库、State、RNG 或其他视图句柄。

结果冻结为 proposedAction、proposalHash 和稳定 requestId。提交时锁 room → match → participant → task，并复核 revision、controllerEpoch、策略版本/摘要、lease owner/generation、账户状态及行动需求；随后调用与真人相同的扩展 parse/validate/apply 和状态/RNG 保存。动作、automation principal 回执与 task succeeded 在同一事务提交。

恢复规则：running 租约过期后有限重试；proposed/submitting 租约过期后保留原 action/requestId，重新领取只继续提交；回执已存在时补记 succeeded，不再应用动作。revision、epoch 或 lease 失效标 stale/cancelled。两次失败后 blocked，不忙循环。

配置：`AI_GLOBAL_CONCURRENCY`、`AI_DECISION_TIMEOUT_MS`、`AI_LEASE_MS`、`AI_SCAN_INTERVAL_MS`、`AI_MAX_ATTEMPTS`。当前仍是单 API 部署目标；数据库 fencing 支持重复领取防线，但阶段 10 以前不宣称多节点生产高可用。
