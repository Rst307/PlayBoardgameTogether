# 阶段 8 验收记录

日期：2026-09-26。环境：Windows、Node 22.17.0、pnpm 11.15.1。本轮 Docker Desktop Linux engine 未运行，`127.0.0.1:5434` 拒绝连接。获准后台启动 Docker Desktop 后，backend 因 secrets-engine socket 无法重命名而崩溃，45 秒内未创建 engine pipe；未重置或删除 Docker 用户数据。因此真实 PostgreSQL、浏览器和进程故障矩阵未能重跑；下表严格区分本轮实测与环境阻塞。

## 自动检查

| 命令 | 结果 |
| --- | --- |
| `pnpm typecheck` | 通过，9 个 workspace 项目 |
| `pnpm lint` | 通过，含依赖边界检查 |
| `pnpm test tests/unit/grid-garden.test.ts tests/unit/registry.test.ts` | 通过，2 文件/9 项 |
| `pnpm test tests/unit --exclude tests/unit/stage7-assets.test.ts` | 通过，10 文件/40 项；排除依赖 Docker 媒体容器的一组 |
| `pnpm build` | 通过，含生产 bundle 与 API runtime；保留 >500 kB chunk 提示 |
| `pnpm test tests/unit` | 44 项通过、2 项失败；失败均为阶段 7 Docker 媒体解码测试在 Docker engine 不可用时返回安全校验错误，Grid Garden 6 项通过 |
| `pnpm test:integration` | 阻塞：PostgreSQL `ECONNREFUSED 127.0.0.1:5434` |
| `pnpm db:up` | 阻塞：Docker Desktop Linux engine pipe 不存在；后台启动后 backend 因 secrets-engine socket 被占用而崩溃 |
| `pnpm test:e2e` | 未执行：依赖同一独立 PostgreSQL 与迁移/seed 前置条件 |

## H01–H46

| ID | 状态 | 证据或限制 |
| --- | --- | --- |
| H01–H04 | 通过（规则）；DB 回归阻塞 | 单测覆盖 2/3/4 人开局、3 能量、空棋盘、本人选择与对手隐藏；集成测试已覆盖两账户 View，但本轮未运行 |
| H05 | DB 回归阻塞 | 正式动作复用既有 receipt；集成用例包含同 ID 查询，需 PostgreSQL 重跑 |
| H06 | 通过（规则） | `canBuild` 同时检查能量与合法位置；harvest 始终保留；恢复不变量拒绝损坏棋盘 |
| H07–H09 | 通过（规则） | 最后一份选择同次转换产生 reveal/energy，混合选择只留下 builders，全 harvest 自动推进 |
| H10–H13 | 通过（规则） | 空棋盘 24 个唯一候选；schema 拒绝小数/错误方向，规则拒绝越界、重叠和重复 |
| H14–H17 | 通过（规则） | 独立棋盘、最后落子推进、独立计分公式与多人 winners 均有单测 |
| H18–H20 | 部分 | 集成源码覆盖同 revision 一成功一冲突；单测覆盖不同提交顺序同结算；本轮 DB 并发未跑 |
| H21–H24 | 阻塞 | 使用既有持久 View、事务、receipt 与房间关闭锁序；需 PostgreSQL/子进程故障测试重跑 |
| H25 | 通过（契约） | `getDecisionRequests` 枚举所有未提交/未放置席位；4 席断言存在 |
| H26–H27 | 部分 | 调度仍以当前 View/revision/epoch 判断并 stale 旧任务；Grid Garden 专项 DB 测试待补跑 |
| H28 | 部分 | 迁移 013 持久化稳定决策组及 2 次上限；重启/并发证据因 DB 阻塞未跑 |
| H29–H31 | 部分 | 选择/落子候选、脚本与 fallback 已实现；统一 action/epoch/lease 沿用；真实模型未调用 |
| H32–H34 | 待重跑 | E2E 已改为真人首轮建造、A1 横向预览确认、后续自动推进并检查 390px/桌面无横溢；本轮环境阻塞 |
| H35 | 部分 | 资源解析是可选表现层、固定 Grid Garden 管理预览已接入；真实替换需 DB/浏览器重跑 |
| H36 | 通过（静态/规则） | `choice.submitted` 不含 choice，reveal 前无 choice 专属 cue；presentation 只映射 reveal/place/finish |
| H37 | 阻塞 | cue 去重沿用阶段 7；本轮无可用数据库/浏览器/物理输出设备，未实际听音 |
| H38 | 部分 | View 投影拒绝未知 seat，正式权限复用 match participant；无权 HTTP 本轮未重跑 |
| H39 | 通过（规则）；DB 阻塞 | deserialize 新增 board/phase/result/outcome 跨字段校验；持久版本/资源锁的 DB 恢复未重跑 |
| H40–H41 | 待重跑 | registry 同时注册两游戏；Color Match 完整 DB/E2E 回归因环境阻塞未执行 |
| H42–H43 | 通过（规则） | reducer 返回新 State；非法动作在转换前拒绝；损坏/重叠 fixture 明确只用于单测 |
| H44 | 通过（静态） | lint 与边界检查通过；扩展性审计逐项核对装配与依赖 |
| H45 | 通过（文档） | `game-sdk.md` 与 `games/grid-garden.md` 记录注册、动作、View、资源和 AI 步骤 |
| H46 | 部分 | typecheck/lint/build 通过；迁移/存量任务兼容需 Docker 恢复后重跑 |

## 未验证边界

- 未使用真实模型凭证，不把 mock/脚本计为真实模型联调。
- 未进行物理设备听音、Android/iOS 实机或 WebKit 验收。
- Docker/PostgreSQL 恢复后必须依次执行迁移、全量 unit、integration、E2E；集成与 E2E 不并行清理测试库。
- 当前目录没有 `.git`，无法提交或推送；未初始化仓库或猜测远程。

## 2026-10-01 接续验收

以下为新一轮结果，保留上方 2026-09-26 的历史阻塞记录。后台启动已安装的 Docker Desktop 后，engine 29.8.0 与现有 PostgreSQL 容器恢复；测试脚本确认独立 `boardgame_test`，013 迁移、两款游戏及四套资源安装均为 unchanged，没有重置开发库或改写迁移。

补齐本人已锁定选择显示、同轮未确认行动草稿、方向键/Home/End 棋盘导航、越界/重叠文字提示；跨玩家更新保留落子预览，本人完成或换轮清除。新增真实数据库四人整局、选择保密与非法请求无副作用、最后选择公开/最后落子前后真实 API 进程退出测试；复用已有进程故障 fixture。

| 命令 | 本轮结果 |
| --- | --- |
| `pnpm typecheck` | 通过，9 个 workspace 项目 |
| `pnpm lint` | 通过，含依赖边界检查 |
| `pnpm test tests/unit` | 11 文件 / 46 项通过，无 skip，包含真实 Docker 媒体解码 |
| `pnpm test:integration` | 12 文件 / 77 项通过，无 skip；Grid Garden 8 项、Color Match 17 项 |
| `pnpm build` | 通过，生产 bundle/API runtime 检查通过；保留 >500 kB chunk 提示 |
| `pnpm test:e2e` | 首轮 25 通过 / 5 失败；暴露共享冲突处理问题与心跳测试采样时点问题 |
| `pnpm test:e2e tests/e2e/grid-garden.spec.ts tests/e2e/color-match.spec.ts` | 冲突修复后 Color Match 桌面/手机 2 项通过；Grid Garden 4 项失败为测试在 placing 等待已移除按钮、错误计入拒绝请求的 revision |
| `pnpm test:e2e tests/e2e/grid-garden.spec.ts` | 修正定位条件及版本预期后，桌面/Pixel 5 四项全部通过（19.9 秒） |
| `pnpm --filter @boardgame/web typecheck`、`pnpm --filter @boardgame/web build` | 共享冲突处理修复后通过；最新受影响文件用本地 ESLint 入口检查通过，生产 bundle 检查通过 |

本轮采用批次集中验证：unit 与 integration 各执行一次，避免 `pnpm test` 再次重复运行相同用例。集成结束后才启动 E2E，不同时清理同一测试库。

| ID | 本轮新增证据与边界 |
| --- | --- |
| H05、H18 | 真实 DB 同 revision 一成功一冲突；同 ID 返回原结果，不同 ID 重选拒绝；他人无法查询本人回执 |
| H19、H32–H34 | 双隔离浏览器通过真实同 revision 冲突保留草稿，再次人工确认；刷新后本人选择仍锁定、对手 View 不公开；方向键/Enter 纵向预览、越界/重叠文字、其他玩家更新后预览保留、三轮自动推进与最终分数；桌面和 Pixel 5 均通过 |
| H16–H17 | 四账户三轮完整整局独立核对分数 6/5/5/4、能量 0/3/6/9；持久终局后新动作拒绝，房间恢复 waiting |
| H21–H23 | 最后选择与最后落子在 before/after COMMIT 真实 API 进程 exit 86；提交前无半结算，提交后回执 accepted；原 ID 两次重试仍只一次状态转换 |
| H38、H42 | 非参与者读取 404，伪造 seat 与重选拒绝；State/RNG/revision 保持原值，公共提交事件无 choice，另一玩家 View 无 choices |
| H39、H41、H46 | Color Match 17 项正式链路回归通过；精确版本、损坏 RNG、事务回滚和进程恢复用例通过；测试库 013 与资源同步通过 |

尚未新增 Grid Garden 模型连续 stale/重启、控制切换/租约/凭证撤销、两游戏同时运行和关闭与最终动作并发的专项证据，H24、H26–H31、H40 不因本轮通用回归而升级为完整通过。真实模型联调、物理听音、Android/iOS 实机与 WebKit 仍未执行。当前目录仍无 Git 元数据，无法提交或推送。

实际截图已检查：`test-results/grid-garden-two-human-gard-3dd68-ices-and-keyboard-placement-desktop/garden-keyboard-preview.png` 和 `test-results/grid-garden-two-human-gard-3dd68-ices-and-keyboard-placement-mobile/garden-human-finished.png`。同目录另有桌面/手机预览与结束截图；它们是本轮生成的本地证据，后续 Playwright 运行可能清理，不计作持久发布产物。
