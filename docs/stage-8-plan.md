# 第八阶段实施映射

基线为阶段 7 的账户、房间、正式动作、AI 调度与资源/音频链路。第八阶段只新增 `grid-garden@1.0.0` 扩展，并为“一个 revision 有多个待行动者”补充最小通用契约；不建立第二套认证、事务、存档、上传或播放器。

| 子任务 | 实现位置 | 兼容策略 |
| --- | --- | --- |
| S8-01–05 规则、秘密 View、落子、结算 | `games/grid-garden/src/shared`、`server` | 独立 JSON State；继续使用 `GameExtension`、严格 revision 和正式动作事务 |
| S8-06 多行动者 | `packages/game-sdk/src/multi-action.ts`、registry、`AiScheduler` | `getDecisionRequests` 为可选能力；旧游戏继续只实现 `getDecisionContext` |
| S8-07 AI | Grid Garden `getDecisionContext`、fallback、`basic-v1`；`013_ai_decision_groups.sql` | 候选仍走统一 action 校验；模型稳定决策组最多两次外部发送 |
| S8-08 UI | `games/grid-garden/src/client` | 自定义棋盘只消费本人 View、公共资源解析器和平台 `onAction` |
| S8-09 资源与音效 | 独立 asset contract/presentation adapter；既有 seed、AssetResolver、AudioManager | 不增加游戏专用存储或音频管线 |
| S8-10–11 回归与文档 | unit/integration/e2e、阶段验收、扩展性审计、阶段 9 交接 | Color Match 状态和协议版本不变 |

必要 SDK 变化只有可选的 `MultiActorDecisionRequests<State>`。平台调度器使用它筛选当前所有合法行动席位，但每局仍只领取一个自动任务，避免模型并发制造 revision 冲突。没有该能力的旧扩展维持原行为。

