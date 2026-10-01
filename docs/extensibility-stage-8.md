# 第八阶段扩展性审计

## 结论

Grid Garden 通过一个新扩展包和两处装配入口接入。认证、房间、match 事务、回执、恢复、WS、AI 任务、模型适配、资源存储和 AudioManager 均复用现有实现。`MatchService`、权限层和预算模块没有按 `grid-garden` 分支解释规则。

## 新增与必要平台变化

- `games/grid-garden` 拥有 manifest、schema、规则、View、事件投影、策略、棋盘 UI、公开说明和资源契约。
- API registry 注册可信 server/rules/assets 入口；Web registry 注册 shared schema/client 入口。这是允许的扩展装配层。
- game-sdk 新增可选 `MultiActorDecisionRequests`。它只表达 `{seatId, decisionKey}` 集合，不包含授权；旧扩展无需修改。
- 调度器枚举上述集合，并保持每局最多一个自动任务执行。revision、controller epoch、lease 与统一动作提交仍是授权边界。
- 迁移 013 持久化 `(match, seat, epoch, decisionKey)` 的模型外部尝试次数，上限为 2；stale 或重启不会清零，耗尽后走当前快照的合法 fallback。

## 必答问题

| 问题 | 结果 |
| --- | --- |
| 是否支持多行动者 | 是；选择阶段为所有未提交者，放置阶段为所有未完成建造者 |
| 规则是否自定义 JSON State | 是；权威 State 留在 server 扩展，并在恢复时校验跨字段不变量 |
| 同时选择是否私密投影 | 是；本人仅看到自己的选择，对手在 reveal 前只有提交标记 |
| 棋盘 UI 是否只用平台公开能力 | 是；只收 View、`onAction` 与 `AssetResolverPort` |
| 模型与脚本是否共享 action | 是；均从同一 `legalActions` 选择并进入 `MatchService` |
| 图包和声音是否可替换 | 是；复用 asset contract、版本锁和 AudioManager |
| Color Match 是否仍保持独立 | 是；其 State、client、策略和资源契约未迁入 Grid Garden |

依赖检查由 `scripts/check-boundaries.mjs`、TypeScript project references 和生产 bundle/runtime 检查共同覆盖；浏览器入口没有导入 Grid Garden server State。

