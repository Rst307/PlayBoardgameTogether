# 游戏扩展 SDK

扩展实现 `GameExtension<State, Options, Action, View, InternalEvent, PublicEvent>`，包含 manifest、options/action 运行时校验、setup、玩家视图、动作说明、服务端校验与转换、事件投影、结局、序列化、恢复和 AI 合法兜底。支持脚本 AI 的扩展另实现 `getDecisionContext`，返回当前座位的稳定 decisionKey 与完整合法候选；无行动需求返回 null。若同一快照可以等待多个席位，再实现可选 `MultiActorDecisionRequests<State>`，返回所有 `{seatId, decisionKey}`。这只描述需求，不替代 revision、参与者身份或 controller epoch 授权。

State 只在服务端存在；View 是面向一个身份单独构造的类型。内部事件必须经 `projectEvents` 过滤后才能发给客户端。动作列表用于交互提示，不替代 `validateAction`。

随机只使用 `DeterministicRng` 的 `nextInt`；存档保留 `mulberry32-v1` 状态。失败转换不得提交状态或 RNG。

新增可信扩展步骤：

1. 建立独立包，拆分 shared/server/client 导出。
2. 用 `manifestSchema` 校验 manifest，并声明 SDK 兼容范围。
3. 服务端只在 `apps/api/src/registry` 注册 server 入口。
4. 前端只在 `apps/web/src/game-registry.ts` 注册 client 入口。
5. 运行投影、非法动作、确定性、序列化和边界测试。
6. 升级版本后运行 `pnpm games:sync`；不得改写已安装同版本含义。

## Grid Garden 多行动者示例

`games/grid-garden` 在 selecting 阶段为每个尚未提交的 seat 返回 `round:N:select`，在 placing 阶段为每个尚未落子的 builder 返回 `round:N:place`。平台调度器枚举这些需求，但同局一次只执行一个自动任务。扩展的 `getDecisionContext` 仍按单一 viewer 生成合法候选，脚本、模型与 fallback 共享这些动作。

秘密选择只存在于服务端 State 和本人 View。公共 `choice.submitted` 事件只含 seat；全部提交后才投影 `choices.revealed`。棋盘客户端从 `GardenView` 渲染并通过平台 `onAction` 提交，不导入 server State。资源图片由 `AssetResolverPort` 提供，cue 在服务端事件投影之后生成，均不参与规则。

## Color Match 示例

`games/color-match` 分为 `shared/server/client`。规则状态包含 40 张实例牌的私密牌堆、各座位手牌、弃牌堆、阶段和胜者；客户端只解析当前座位的 View。服务端 `validateAction/applyAction` 处理 `play_card`、`draw_card` 和 `choose_target`，平台只负责身份、事务与修订号。数字 5 的目标选择是持久化阶段；若数字 5 为最后一张，目标效果完成后才结算胜利。牌堆和可重洗弃牌都空时，摸牌成为跳过；全员连续跳过按最少手牌结算，可并列。

客户端通过点击卡牌选择并高亮，再提交动作；合法卡牌和目标列表来自玩家 View，仅作为提示。最终校验始终在服务端进行。实例牌 ID 为 `card.<color>.<number>.<copy>`，逻辑内容 ID 为 `card.<color>.<number>`，显示资源不参与规则。

Color Match 的 decision context 只由该座位 View 派生出 `play_card`、`draw_card` 或 `choose_target` 候选。平台调度器不理解颜色、数字或目标语义；`basic-v1` 位于游戏服务端包，worker 策略注册只做可信装配。复杂游戏未来可以扩展为按需候选协议，本阶段不要求无限枚举。

## 公开规则说明

各游戏通过独立 ./rules 入口导出 publicRules，在 API registry.rules 中按 gameId@version 装配。Color Match、计数测试与正式计数房均有公开说明，涵盖目标、回合、合法动作、特殊效果、终局和信息边界。房间/建房/对局页支持展开及复制；调度器将同一版本文本注入脚本 worker 的 publicRules 和模型 adapter 的 rules。说明不包含 State、隐藏手牌或凭据，不改变原有规则摘要或存档版本。新增游戏需同时注册其公开说明。
