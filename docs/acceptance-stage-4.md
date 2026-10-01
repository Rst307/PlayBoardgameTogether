# 第四阶段验收记录

日期：2026-09-25。环境：Windows/PowerShell、Node 22、pnpm 11、本地 PostgreSQL 17；集成与 E2E 均使用独立 `boardgame_test`，开发库只执行新增迁移。测试前 `pnpm db:up` 成功。本文件的“通过”仅针对列明的验证，不等同生产容量或多副本保证。

## 故障矩阵

| ID | 结果 | 实际证据 / 边界 |
| --- | --- | --- |
| D01 | 通过 | 正式动作集成测试核对 state/RNG/revision/action/receipt；事务提交后才返回。 |
| D02 | 通过 | 顺序同 ID 重试返回原 revision，事件为空，不再修改状态。 |
| D03 | 通过 | 两个独立 HTTP/数据库连接并发同 ID，只有一条 `match_actions`。 |
| D04 | 通过 | 现有集成测试以同 ID 修改 action，返回 `REQUEST_ID_CONFLICT`。 |
| D05 | 通过 | Bob 与 Alice 使用同 requestId，分别取得自己的 appliedRevision；C 不可查。 |
| D06 | 通过 | 同 revision 两个不同动作竞争，结果为 200/409。 |
| D07 | 通过 | 非法出牌拒绝且 revision 不变；保存故障时 State/RNG 原样保留。 |
| D08 | 通过 | PostgreSQL trigger 在动作记录插入处抛错，State/RNG/revision/动作/回执整体回滚。 |
| D09 | 通过 | 真实 API 子进程在 COMMIT 前退出；重启后原 ID 成功且只执行一次。 |
| D10 | 通过 | 真实 API 子进程在 COMMIT 后、回复前退出；重启后查到 accepted，重试不二次执行。 |
| D11 | 通过 | 浏览器把已提交动作的 HTTP 回复丢弃，刷新后按原 ID 查询并恢复。 |
| D12 | 通过 | 对局进一步推进后重试旧请求仍返回旧 appliedRevision，数据库保持新 revision。 |
| D13 | 通过 | 原请求被数据库 advisory lock 挡住时查询返回 not_found；同 ID 双请求最终一条动作。 |
| D14 | 通过 | 浏览器首个动作提交后丢回复并立即刷新，原请求记录在 sessionStorage 中恢复。 |
| D15 | 通过 | 阶段 2/3 浏览器用例刷新后恢复本人 View、席位和终局。 |
| D16 | 通过 | 测试局打出数字 5 后，新 API 实例读取 `choose_target`，选择目标后只加一次牌。 |
| D17 | 通过 | 将测试局设置为需要弃牌重洗，新 API 实例继续摸牌；持久 State/RNG 等于确定性规则计算结果。 |
| D18 | 通过 | 桌面与手机浏览器模拟短暂离线、恢复并继续完整对局。 |
| D19 | 通过 | 桌面与手机 Playwright 在真实 WS 上拦截 pong，并用浏览器时钟推进 81 秒；心跳判定失活、暂停操作，随后重新连接并恢复。另覆盖浏览器离线/上线。 |
| D20 | 通过 | Playwright 延迟同账户第三标签页的 revision 1 初始 WS 快照，先送达 live revision 2，再补送旧快照；页面保持 revision 2。HTTP 丢回复、WS 与周期同步交错也通过。 |
| D21 | 通过 | 第三标签页在初始 match snapshot 被延迟时保持“同步中”且不能操作；订阅期间发生动作，live revision 2 到达后恢复，旧初始快照随后不覆盖它。 |
| D22 | 通过 | Playwright 在连接保持在线时拦截并丢弃 revision 2 的 `match.snapshot`；桌面与手机均由 15 秒权威读取追上 revision 2 并继续完整对局。 |
| D23 | 通过 | E2E 延迟旧局的权威 View 响应，页面先返回房间并打开新局，再释放旧响应；页面仍显示新局 revision 0。动作、控制权和模型配置响应均受组件 generation 保护。 |
| D24 | 通过 | 同账户两个真实浏览器标签用同 revision 同时提交不同 requestId，得到一次 200、一次 409；后续对局仍可结束。 |
| D25 | 通过 | 阶段 2 集成测试验证多标签 presence 与最后连接消失后的离线缓冲；不释放座位。 |
| D26 | 通过 | 阶段 2 集成测试验证登出、过期与跨进程凭据撤销；桌面/手机对局页登出后清私密视图并显示会话失效，原账号重新登录后可读取原局。停用账户沿用服务端统一 session 校验。 |
| D27 | 通过 | 非参与者 C 读取 View/回执为 404；订阅权限由现有阶段 2 WS 集成测试覆盖。 |
| D28 | 通过 | 伪造他人手牌 ID 的动作被拒；客户端 seat/actor 无授权入口。 |
| D29 | 通过 | 房主 close 与有效动作并发，最终 match 为 aborted，关闭后新动作拒绝。 |
| D30 | 通过 | aborted 在新 API 实例恢复为终态且拒绝动作；finished 经浏览器刷新保留胜负。 |
| D31 | 通过 | 规则摘要不符返回 `RECOVERY_BLOCKED`，精确扩展缺失返回 `GAME_VERSION_UNAVAILABLE`，原 revision 不变。 |
| D32 | 通过 | 损坏 RNG 快照只阻塞该局并保留原数据；其他测试局继续可用。 |
| D33 | 通过（连接故障注入） | 真实 PostgreSQL 测试局注入一次数据库连接失败，动作返回可重试 503、不产生内存假成功；恢复连接后按持久 View 继续原局。未停启整个 PostgreSQL 容器。 |
| D34 | 通过 | 浏览器刷新后已发生事件不再显示为 live；另一在线客户端仍收到实时行动记录。 |
| D35 | 通过 | 双账户 View/WS 与 C 权限检查无对手手牌、牌堆和 RNG；检索 API 日志调用后将通用异常与启动异常日志收窄为错误类别，避免 PostgreSQL `detail` 携带失败行内容。未做生产日志平台审计。 |
| D36 | 通过（代表性旧数据） | 空测试库执行 005；另在回滚事务内构造已开始的阶段 3 对局与限期回执，执行 005 后核对 State/RNG/revision 不变、动作回执变为无限期、房间回执仍保留原期限、旧摘要保持 NULL。未使用生产数据副本。 |
| D37 | 通过 | `demo.counter-room` 身份视图和 Color Match 完整对局回归；核心无游戏 ID 规则特判。 |
| D38 | 通过 | 桌面与手机双账户经 HTTP 回复丢失、刷新、离线恢复和一次 WS 通知丢失后继续到合法终局。 |
| D39 | 通过 | E2E 在桌面与手机各连续刷新三次，逐次等待旧 WS 关闭并确认最多一个当前 match 订阅；卸载清理 WS、监听器、心跳和重试计时器。 |
| D40 | 通过 | typecheck、lint、测试、集成、10 项 E2E、生产构建和 runtime/bundle 检查通过。 |

## 实际命令与结果

- `pnpm db:up`、`pnpm db:migrate`：PostgreSQL 运行；开发库应用 005，旧迁移保持 unchanged。
- `pnpm typecheck`：通过。`pnpm lint`：通过，依赖边界检查通过。
- `pnpm test`：最终全量 14 文件、59 项通过。
- `pnpm test:integration`：最终全量 8 文件、42 项通过，包含旧数据迁移演练与数据库连接故障恢复。
- `pnpm test:e2e`：桌面与手机 10 项通过。曾因 Playwright 离线网络模拟未稳定发出浏览器 `offline` 事件而失败一次；测试同时触发该事件后全量重跑通过。
- `pnpm build`：通过，包含生产 bundle 排除开发实验台和编译 API registry 加载检查。

未做公网发布、真实资源包上传、AI 联调或备份恢复。Git 元数据在当前目录不可用，未提供提交哈希。

## 后续专项补验（2026-09-25）

为关闭 D23/D39 的专项缺口，MatchPage 的动作忙碌状态、控制权写回及模型配置加载现在均校验页面 generation；页面切换时立即清空旧 busy 状态。`pnpm test:e2e tests/e2e/color-match.spec.ts` 桌面与手机 2 项通过：延迟旧局 HTTP View 到新对局打开后再释放，旧响应未覆盖新局；重复刷新期间旧连接关闭，活动 match WebSocket 保持单一。`pnpm typecheck`、`pnpm lint`、`pnpm test tests/unit`（10 文件、40 项）和 `pnpm build`（生产 bundle/runtime 检查）通过；build 有既有 >500 kB chunk 提示。此前两次专项测试因测试观测接口/断言时机不当失败，修正后最终运行通过。
