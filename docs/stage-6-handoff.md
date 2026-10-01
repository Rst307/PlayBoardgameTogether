# 阶段 6 交接：大模型 AI

阶段 5 已完成安全决策上下文、controllerEpoch、持久任务、worker 超时、冻结提案、automation principal 与统一动作提交。阶段 6 的模型适配器必须替换“策略计算”这一段，不得另建动作入口、读取完整 State 或在外部调用期间持有数据库事务。

模型只能收到本人 View、合法动作、规则摘要、revision、controllerEpoch 和 decisionId；输出仍先做结构校验、合法候选检查和现有兜底。外部超时、预算、重试、用量与凭据保管新增在适配器层。冻结后继续沿用同一 action/requestId；收回控制、版本缺失和租约 fencing 语义不变。

本阶段没有模型密钥、个人模型设置、远程调用或费用功能。不要把 `basic-v1` 的房主选择界面当成个人模型配置。
