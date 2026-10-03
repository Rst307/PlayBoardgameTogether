# 脚本 AI 与控制权

阶段 5 将座位、所有者、控制器与控制世代分开。真人参与者保留 `account_id`；2026-09-25 起禁止真人切至脚本，专用 bot 没有账户，开局即由脚本控制。真人仍可显式切至个人模型并收回。任何控制改变都在房间、对局、参与者锁序下递增 `controller_epoch` 与独立的 `controller_version`，不会修改游戏 revision、State 或 RNG。

真人动作携带 `expectedControllerEpoch`。旧版第四阶段请求未携带该字段时只兼容 epoch 0，以保留旧回执重试；一旦发生过控制切换，缺字段或旧 epoch 都不能执行。托管使用本人私密 View，不会把专用 bot 的手牌、合法候选或冻结提案返回给房主。

`basic-v1@1.0.0` 是仓库内置的确定性 Color Match 策略。出牌优先保留更多同色后续牌，稳定按颜色、数字和实例 ID 打破平局；目标优先公开手牌数较少者，再按座位顺序；无可出牌时摸牌。它不读取 State、牌堆、对手手牌、RNG 或数据库。主策略异常、超时或给出非法动作时，扩展在同一快照合法候选中选择稳定兜底，仍经统一规则校验。

控制 API：

- `PUT /api/v1/matches/:id/my-controller`：本人显式设置 `human` 或 `model`；真人设置 `script` 返回 FORBIDDEN，带 requestId 与 expectedControllerEpoch。
- `POST /api/v1/matches/:id/seats/:seatId/ai-retry`：本人或专用 bot 的房主重试 blocked 状态。
- 断线、登出和 session 过期不自动改变控制权；停用账户会阻止该真人席位后续自动动作。

客户端分别按 match revision、controllerVersion 和 aiStatusVersion 合并状态。相同游戏 revision 的收回控制不会被旧快照覆盖。

## 模型 bot（2026-10-03）

waiting 房主可通过 PUT /rooms/:id/seats/:seatId/bot 添加模型 AI，以 PATCH 修改已有 AI 的类型或 profileId。模型配置限当前房主本人，修改会清除真人准备；不能把 bot 席位转成房主账户身份。新房主不能用旧房主配置开始下一局，须显式改选自己的配置或切回脚本。对局已经开始则保留原授权 owner，不能在进行中修改 bot 设置。模型只消费该 bot 的 View；房主仍不能看私密信息。真人模型启用/收回与 bot 设置分开。
