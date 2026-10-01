# 阶段 5 验收记录

日期：2026-09-25  
环境：Windows、Node 22.17.0、pnpm 11.15.1、PostgreSQL 17（独立 `boardgame_test`）、Playwright Desktop Chrome / Pixel 5。

## 已执行结果

- `pnpm db:migrate`：开发库成功应用 `006_script_ai.sql`。
- `pnpm typecheck`、`pnpm lint`：通过。
- `pnpm test`：15 文件、63 项通过；包含策略确定性、合法候选、隐藏信息变化不影响决策及全部集成回归。
- `pnpm test:integration`：阶段 2–4 原 42 项全部通过；加入阶段 5 后为 9 文件、45 项。
- `pnpm test -- tests/integration/stage5-ai.test.ts`：3 项通过；覆盖无账户 bot、全托管完整终局、旧 epoch 真人请求拒绝、同步死循环 worker 终止与合法兜底、冻结提案重启恢复且只提交一次。
- `pnpm test:e2e`：桌面与 Pixel 5 共 12 项通过。阶段 5 专项两端均完成添加 AI、托管、收回、再次托管到终局和无水平溢出；专项初次桌面运行因用例未等待登录跳转而超时，修正等待后全量通过。
- `pnpm build`：通过，生产 bundle 与 API runtime 检查通过。

## E01–E45

| ID | 状态 | 证据 |
| --- | --- | --- |
| E01 | 通过 | 房间 API/E2E；bot 持久化并使真人 ready 失效 |
| E02 | 通过 | host 校验与既有非成员/非房主回归 |
| E03 | 通过 | room 行锁、统一成员+bot 容量查询、唯一座位约束 |
| E04 | 通过 | 1 真人+bot 集成；模型允许 2–4 席，无 bot 账户 |
| E05 | 通过 | 扩展 `getDecisionContext`/白名单检查阻止不兼容开局与托管 |
| E06–E07 | 通过 | decision context 只在当前行动需求非空时建任务；完整终局 |
| E08–E10 | 通过 | 单元隔离测试；HTTP/WS 无 bot View、候选或 proposal 字段 |
| E11–E20 | 通过 | epoch/明确 set/回执/统一锁序；集成与 E2E 覆盖托管、收回和旧请求 fencing |
| E21 | 通过 | 任务唯一约束，完整局断言无重复 decision key |
| E22–E23 | 通过（数据库防线） | `SKIP LOCKED` + leaseGeneration 条件冻结/提交；未做两个独立 API 进程压测 |
| E24–E26 | 通过 | 真 worker 死循环 fixture、非法输出路径、有限 fallback/blocked 状态 |
| E27–E29 | 通过 | proposed 重启测试保持 action/requestId；回执与动作原子提交 |
| E30–E31 | 通过（恢复扫描） | 启动扫描补任务、过期 lease 有限重领；未单独对 running worker 做 OS 强杀 |
| E32–E34 | 通过 | 阶段 4 数据库/关闭/版本锁回归仍通过，任务另加策略摘要核验 |
| E35–E37 | 通过 | 后台不依赖 WS；授权独立于 session；automation 提交复核 owner active |
| E38 | 通过 | controllerVersion/aiStatusVersion 独立合并；状态 WS 同 revision 投递 |
| E39 | 通过（调度设计） | 全局并行与同局串行、公平 SQL 排序；未单独记录 10 局最长等待时间 |
| E40–E42 | 通过 | 迁移保留 human 回执，HTTP 无 automation actor 字段，共用扩展校验/事务 |
| E43 | 通过 | 桌面与 Pixel 5 实际浏览器流程 |
| E44 | 通过 | 网络响应不含私密提案；eventId 仍按 revision 去重 |
| E45 | 通过 | 阶段 2–4 的 42 项真实数据库集成回归及构建 |

## 已知限制

当前仍是单 API 运行单元；E22/E23 的数据库 fencing 已实现，但没有把两个 API 节点作为生产拓扑验收。E31 未额外用 OS 强杀 running worker；本轮真实重启覆盖的是更危险的 frozen proposal 窗口。E39 未执行规格建议的 10 局/40 连接定量压测。上述是压力与故障深度证据缺口，不改变本阶段单实例功能停止点，将在阶段 10 容量/部署验收补齐。

无 GPT/Claude 调用、模型密钥、自动断线托管、全 AI 观战、资源上传或音效播放器。
