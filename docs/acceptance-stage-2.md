# 阶段 2 验收记录

日期：2026-09-24。环境：Windows、Node 22.17.0、pnpm 11.15.1、Docker Desktop、PostgreSQL 17-alpine。测试使用独立 `boardgame_test`，不清空开发库。

## 最终命令

| 命令 | 实际结果 |
| --- | --- |
| `pnpm test:integration` | 7 文件、24 项通过；001–003 迁移和两项游戏安装同步均显示 unchanged |
| `pnpm test:e2e` | 8 项通过：1440px 桌面与 390px 手机各完成目录/实验台、三账户开局及独立建房页 |
| `pnpm test` | 12 文件、35 项通过 |
| `pnpm typecheck` | 7 个 workspace 通过 |
| `pnpm lint` | ESLint 与依赖边界检查通过 |
| `pnpm build` | 全 workspace 构建通过；生产 bundle 不含开发实验台 UI，原生 Node 能加载编译后的 API 游戏扩展与资源 |

## B01–B31

主要证据位于 `tests/integration/stage2-flow.test.ts`、`tests/unit/room-snapshot.test.ts`、`tests/unit/registry.test.ts`、`tests/e2e/stage2.spec.ts`。下表的“通过”表示所述场景本轮实际执行；未把阶段 3 功能算入验收。

| ID | 结果 | 实际证据 |
| --- | --- | --- |
| B01 | 通过 | CLI `admin:init` 连续两次运行，第二次 unchanged，密码 hash 和昵称未被覆盖 |
| B02 | 通过 | CLI 尝试创建 `ALICE` 与现有 `alice` 碰撞，唯一约束拒绝，账户仍仅一条 |
| B03 | 通过 | 活跃账户登录成功；错误密码、未知用户、停用账户统一 401 错误码 |
| B04 | 通过 | 数据库密码为 Argon2id hash、session 存 token 摘要；`me` 响应不含密码/hash |
| B05 | 通过 | 缺失 Origin、缺失或伪造 CSRF 被拒；合法同源写入成功 |
| B06 | 通过 | 重登撤销当前旧会话、登出只撤本会话、过期 401；CLI 重置密码/停用撤销会话，旧 WS 因数据库通知关闭 |
| B07 | 通过 | A 创建、B 凭邀请码加入，同房成员/座位写入 PostgreSQL；E2E 双独立 context 完成 |
| B08 | 通过 | 轮换前邀请码、过期邀请码均 404；原码只在签发响应中出现 |
| B09 | 通过 | B/C 并发抢最后名额仅一个成功；成员数不超容量；已入房成员重复加入不增加成员 |
| B10 | 通过 | A/B 同时占目标座位仅一个成功；A 换座失败时原座仍保留 |
| B11 | 通过 | `my-ready` body 伪造 `accountId` 被 strict schema 拒绝 |
| B12 | 通过 | 非房主配置、开局、转主均 403 |
| B13 | 通过 | 座位结构/规则选项变更清除 ready；仅改名保留 ready；无变化配置不递增 revision |
| B14 | 通过 | 旧 `expectedRoomRevision` 返回 409 `ROOM_CONFIG_CHANGED` |
| B15 | 通过 | 未满/未准备开局被拒；精确扩展不可用时 422；默认资源清单解析并核对 ID/版本，示例 PNG/WAV 文件存在且头部有效 |
| B16 | 通过 | 同一 start requestId 并发重试返回同一 matchId，数据库仅一条 match |
| B17 | 通过 | 注入 setup 抛错后返回 `GAME_SETUP_FAILED`，无 match，房间仍 waiting 且 ready 保留 |
| B18 | 通过 | 开局后配置和换座请求被拒，固定 match 参与者落库 |
| B19 | 通过 | C 读取 match、订阅 A/B 房间被安全拒绝，不收到私人快照 |
| B20 | 通过 | A/B 初始 `myHint` 不同，正式响应不包含全表 `privateHints` 或 seat 切换参数 |
| B21 | 通过 | 单元测试验证延迟 HTTP 旧版本不能覆盖较新 WS 快照 |
| B22 | 通过 | 订阅同时修改 ready，最终收到 revision 1 的完整快照 |
| B23 | 通过 | 两个 A 标签关闭一个仍在线，关闭最后一个经缓冲后离线；房间 revision/成员不变 |
| B24 | 通过 | 房主退出后稳定转给 B，A 失去读取权；B 再退出则空房关闭 |
| B25 | 通过 | 关闭活动房间使 match aborted；WS 先收到最终 closed 快照，再收到 `room.closed` |
| B26 | 通过 | 关闭 API 实例与数据库连接后重新创建实例，旧 session、房间和初始 match view 仍可读；浏览器刷新私密视图不变 |
| B27 | 通过 | production-switch 集成测试、生产 bundle 检查和原生 Node 编译产物加载检查通过；正式扩展不开放 test seat |
| B28 | 通过 | 登录和邀请码连续失败触发 429 与 `Retry-After`；限流按时间窗口过滤 |
| B29 | 通过 | 相同 requestId 不同 body 返回 `REQUEST_ID_CONFLICT`；并发同 ID 建房仅一间 |
| B30 | 通过 | 1440px/390px、A/B/C 独立 browser context 走完整开局流程；A 开局后 B 无需点击即进入对局，浏览器测试观测到提示音振荡器启动；独立建房页可选已安装游戏/选项，无整页横向溢出 |
| B31 | 通过 | 阶段 1 SDK、目录、health、诊断 WS、生产开关的测试与全量构建回归通过 |

## 浏览器截图

- `docs/screenshots/stage-2/room-desktop.png`、`room-mobile.png`：真实等待房间，双方已准备。
- `docs/screenshots/stage-2/match-desktop.png`、`match-mobile.png`：正式对局初始私密视图。

截图不包含密码、session、CSRF 或邀请码。示例资源只验证清单、文件存在和 PNG/WAV 头部，未做完整媒体解码；资源文件分发、音效播放，以及正式动作、Color Match、AI/托管、观战和公网部署均不属于阶段 2。登录/join 限流与 presence 为单 API 进程内状态，不承诺多副本一致性。
