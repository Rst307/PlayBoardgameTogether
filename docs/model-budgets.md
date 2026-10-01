# 模型预算与用量

`model_attempts` 记录每次可能计费的外部调用，状态区分 reserved、dispatching、completed、failed、unknown 和 cancelled。`model_budget_buckets` 与 `model_budget_reservations` 为后续调度器提供按账户、配置和对局的原子预留边界；未知请求不会自动退还全部占用，也不会与游戏 command requestId 合并。

目前页面不显示虚构价格。usage 缺失保持 null，真实供应商账单仍以供应商控制台为准。
