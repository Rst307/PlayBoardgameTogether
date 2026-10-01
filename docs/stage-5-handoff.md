# 阶段 5 交接：脚本 AI 与托管

阶段 4 继续沿用单一 `MatchService.act` 正式动作事务。当前控制器字段 `match_participants.controller_type='human'`、`controller_epoch=0`；阶段 5 应以新迁移扩展 controllerType，并在托管开启/收回时原子递增 epoch。AI 结果必须带决策时的 match revision、controllerEpoch、decisionId，在动作事务里复核；旧结果失效后不得转为新 requestId 继续提交。

AI 决策在事务外执行，只接收当前 seat 的 `getView` 与 `getActionSpec`，不能读取 State/RNG、他人 View 或直接改库。提交动作复用身份与控制权验证、requestId 去重、expectedRevision、规则校验和 commit 后投影。脚本 AI 的重试要复用同一决策的 requestId；收到 `not_found` 时用原内容重试，不能假定失败。收回真人控制后，在途 AI 结果因 controllerEpoch 不匹配被拒绝。

玩家断线继续等待，不自动开启托管。恢复接口为本人 `GET /api/v1/matches/:id/view` 与本人回执查询；客户端只播放 live 投影事件。游戏、内容、资源版本和新局源码摘要按 match 锁定，不能让旧 AI 决策在升级后使用另一套规则。

当前阶段尚无 worker、任务队列、脚本 AI 或托管 UI；这些由阶段 5 实现，不能把本交接视为功能完成。
