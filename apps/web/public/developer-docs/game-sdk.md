# 游戏 SDK

## 统一回放（2026-10-04）

内置和在线 ZIP 游戏自动保存已提交局面，无需新规则接口；回放页按原版本读取本人 View，桌面应遵守 busy=true 禁止动作。当前按步骤切换局面，静音，不重放计分或移动动画。原参与者从对局记录进入；进行中的对局不开放回放。

## 可选玩家显示名称

平台 Web 注册的 GameBoard 第七个可选参数 playerNames 是 seatId→displayName 的公开名称映射，不属于游戏 State 或规则 View。@boardgame/game-sdk/presentation 导出 PlayerNames 与 playerLabel(seatId, seats, viewingSeatId, names?, fallback?)；有名称时本人附加「（你）」，未传名称时本人为「你」、其他为编号标签。昵称不提供动作权限，教程可不传。当前花砖物语与璀璨宝石已接入，在线 ZIP 消息桥尚未增加该参数。

包：@boardgame/game-sdk，当前版本 0.1.0。入口为根包、/assets、/multi-action、/tutorial。浏览器只引用公开类型和资源端口，游戏完整 State 留在 server 入口。

## 可选交互教程

开发者可自由选择编写教程。只有 Web 注册表按 gameId@version 注册教程后，游戏详情才显示「进入教程」。教程无需登录，复用原游戏桌面，操作成功后才允许下一步，支持重试、返回上一步和重新开始；刷新会从头开始，不创建正式房间或保存成绩。

契约见 [教程 SDK 源码](/developer-sdk/packages/game-sdk/src/tutorial.ts)：GameTutorial 包含 title、description 与非空 steps（步骤 ID 唯一）。每个 TutorialStep 定义 id、title、instruction、initial 的公开 view/events、可选 focusArea（桌面区域的 aria-label）以及 onAction({ action, frame })。

回调通过游戏 schema 解析 unknown 动作和 View。未达目标返回 { accepted:false, feedback }；成功返回 { accepted:true, frame:{ view, events }, complete, feedback }。complete=false 可继续接收操作，适用于先出牌再选目标的多步教学；complete=true 才允许玩家主动进入下一课。每个场景独立，不强制沿用上一课的桌面。

startTutorialStep 克隆初始练习帧，applyTutorialAction 隔离回调输入；拒绝操作不改变场景，完成后忽略重复操作。练习只能含开发者编写的公开固定数据与投影格式事件，不能嵌入正式 State、他人秘密、账号或凭据，不能提交正式动作或调用模型。固定结果需用测试与真实规则对照。当前实例是 games/color-match/src/client/tutorial.ts，其他游戏可不提供教程。

## 核心契约

```typescript
import type { GameExtension } from '@boardgame/game-sdk';

type Extension = GameExtension<
  State, Options, Action, View, InternalEvent, PublicEvent
>;
```

上面的类型参数由具体游戏定义。完整、精确的当前接口见 [SDK 源码快照](/developer-sdk/packages/game-sdk/src/index.ts)。

| 方法 | 输入与职责 |
| --- | --- |
| manifest | 经 manifestSchema 校验的游戏清单 |
| validateOptions(value) | 解析 unknown 选项，返回 Options |
| parseAction(value) | 解析 unknown 动作，返回 Action |
| setup({ seats, options, rng }) | 返回初始 state 和内部 events |
| getView(state, viewer) | 返回当前身份可见的 View |
| getActionSpec(state, viewer) | 返回 JSON 动作提示，不替代规则校验 |
| validateAction(state, actor, action) | 非法动作抛错，不改变状态 |
| applyAction(state, actor, action, rng) | 返回新 state 和内部 events |
| projectEvents(events, viewer) | 投影为允许该身份接收的 PublicEvent[] |
| getOutcome(state) | 返回 JSON 结局 |
| serialize(state) | 返回可持久化 JSON |
| deserialize(value) | 校验存档并恢复 State |
| getFallbackAction(view, actionSpec) | 返回合法兜底动作或 null |
| getDecisionContext(state, viewer) | 可选；返回 decisionKey、legalActions 或 null |

Viewer 为 { kind: 'seat', seatId } 或 { kind: 'spectator' }；Actor 为服务端构造的 seat（含 controllerEpoch）或 system。类型中存在 spectator 不代表平台已开放观战接口。客户端不能自选 Actor 或 seat 获得权限。

## 清单与版本

manifest 包含 id、version、sdkRange、contentVersion、name、description、players、mode、capabilities、defaultAssetPack、developmentOnly。mode 当前为 rules-driven。capabilities 可使用 private-view、turn-based、simultaneous、spatial。

id 遵守 manifestSchema 的命名约束；version/contentVersion 使用三段版本。当前注册表接受 ^0.1. 系列 SDK 范围。defaultAssetPack 必须匹配注册的默认资源清单。已安装同版本的规则含义不可覆盖；改变规则或存档含义时升级版本，并保留旧局需要的代码。

## 随机数与存档

```typescript
import { DeterministicRng } from '@boardgame/game-sdk';

const rng = new DeterministicRng(42);
const roll = rng.nextInt(1, 7); // 下界包含，上界不包含
const saved = rng.snapshot();
const restored = DeterministicRng.restore(saved);
```

RNG 存档算法为 mulberry32-v1；clone() 可复制状态。规则只能使用传入的 RandomSource，不用 Math.random() 或当前时间生成结果。失败动作不能消耗持久 RNG；平台事务在成功时保存状态与 RNG。

deserialize 接收 unknown，必须校验存档字段和版本，不能强制断言。恢复已有对局不能重新调用 setup。

## 私密信息与事件

State 可以含秘密牌堆、手牌或秘密选择，View 只能含当前身份允许读取的信息。房主也不能读取其他玩家秘密。内部事件先经 projectEvents 再广播，不能直接发送原始动作或内部事件。

动作提示只帮助界面，最终权限和合法性由服务端判断。applyAction 推荐生成独立的新状态，不修改输入 State。

## 同时行动与 AI

多个席位同时等待决定时，实现 /multi-action 的 MultiActorDecisionRequests<State>：getDecisionRequests(state) 返回所有 { seatId, decisionKey }。它只描述决策需求，不授予身份或控制权。

getDecisionContext 必须提供当前座位 View 可安全推导的合法候选，无需行动返回 null。脚本、模型和 fallback 继续走统一动作链路。参考 games/grid-garden 的秘密选择与放置阶段。

## 资源与音频

/assets 提供 AssetContract、packManifestSchema、AssetResolverPort 和 PresentationCue 等契约。图片与音频不能决定规则结果。客户端在资源缺失时保留可玩的语义回退。

仅消费已投影的 live cue，按 eventId 去重；刷新、重连、追赶和音频解锁不补播历史。素材来源与许可需在资源清单中明确，不分发未获授权的第三方素材。
