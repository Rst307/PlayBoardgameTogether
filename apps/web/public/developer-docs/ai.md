# AI 开发指南

AI 编码代理和游戏内 AI 玩家承担不同职责。编码代理阅读源码并贡献实现；游戏内 AI 只能依据当前座位可见信息选择动作。

## 给编码代理

先读 [完整开发指南](/llms-full.txt) 和 [SDK 源码包](/developer-sdk/sdk-sources.json)，进入仓库后再读 AGENTS.md、README.md、docs/progress.md、docs/architecture.md 与任务对应规格。

将源码和共享 schema 作为接口事实依据，阶段计划不能当作已实现能力，也不能自动扩大用户授权范围。开发文档公开不代表已存在在线添加游戏接口。

- 外部输入先视为 unknown，在边界解析。
- 游戏 shared/server/client 分离；浏览器只消费 View。
- 身份来自 session 和固定参与者，不来自请求 body 的 seatId。
- 正式动作复用现有事务、去重、revision、controllerEpoch 校验。
- 不通过 any、忽略类型错误、弱化测试或重复一套认证来完成任务。
- 保留用户改动，提交只包含本轮内容，不提交秘密或生成产物。
- 按变更执行真实验证，环境阻塞或 skip 如实说明。

## 给游戏内 AI

游戏扩展可通过 getDecisionContext 提供 { decisionKey, legalActions }；没有当前行动返回 null。DecisionInput 包含 matchId、seatId、revision、decisionId、controllerEpoch、view、legalActions、actionSpec、publicRules。

策略只能使用该身份 View 和已投影规则上下文，不能读取完整 State。模型从服务端提供的候选 choiceId 中选择，经过严格解析后仍调用统一动作事务。模型解释不是规则依据，也不能直接写数据库。

```typescript
import type { DecisionProvider } from '@boardgame/game-sdk';
```

这是 SDK 契约入口；接入 provider 不等于平台自动装配新的供应商或任意远端代理。当前实现使用可信脚本 worker 与受控模型适配边界，具体接口参见当前源码和仓库 AI 文档。

## 并发与控制权

revision/decisionId/controllerEpoch 用于拒绝过期决定。主动托管后，旧真人命令和旧 AI 任务都必须通过当前控制权检查。房主不能代表专用 AI 读取其秘密或指定其动作。

真人可显式开启自己的模型托管并收回；真人脚本托管当前禁止，脚本 AI 通过 waiting 房间专用 bot 席位加入。断线不自动托管。

## 凭证与资源

模型密钥仅在服务端加密保存，可撤销，不进入 URL、日志、公共响应或浏览器包。个人模型配置只允许本人管理；真实模型与 mock 结果应明确区分。

素材、声音和 AI explanation 不参与权威规则。公共资源下载仍按业务权限校验；开发者文档和 SDK 下载不授予私人对局或管理员权限。
