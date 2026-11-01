# 对局昵称修复交付（2026-11-01）

平台 `1.1.0 → 1.1.1`，兼容的展示缺陷修复，PATCH +1。MatchView 原有公开参与者名称继续独立于规则 View；本轮把映射通过 registry 和 PackageBoard 的 `boardgame:view.playerNames` 传给游戏，并在元数据变化时发布。本人回放使用原帧公开名称，不改变动作、身份或秘密视图。

真人显示昵称，本人附加“（你）”；AI 使用参与者名称。等待、目标、公开行动和结果使用相同座位映射。未提供名称保留匿名回退，名称按文本展示，长昵称可换行。UNO 原先按 View 去重遗漏同局面改名，本轮补齐名称变化检测，并保留草稿与原提交锁。

## 分仓交付

各游戏均在 `codex/player-names`，平台在 `codex/game-player-names`。下面均为已推送的功能提交及待审 PR，不表示合并、正式发布或线上安装。

| 仓库 | 提交 | PR | 本轮版本 |
| --- | --- | --- | --- |
| UNO（含毫不留情） | `53b51cd` | [#2](https://github.com/PlayBoardgameTogether/playboard-game-uno/pull/2) | ZIP 1.2.1 / 1.0.1 |
| 五子棋 | `3c1419f` | [#3](https://github.com/PlayBoardgameTogether/playboard-game-gomoku/pull/3) | ZIP 1.0.4 |
| 拉密 | `f4cae0c` | [#3](https://github.com/PlayBoardgameTogether/playboard-game-rummikub/pull/3) | ZIP 1.0.4 |
| 卡坦岛 | `5f221b3` | [#3](https://github.com/PlayBoardgameTogether/playboard-game-catan/pull/3) | ZIP 1.0.2 |
| 波多黎各 | `0d98206` | [#4](https://github.com/PlayBoardgameTogether/playboard-game-puerto-rico/pull/4) | ZIP 1.1.1 |
| 阿瓦里 | `488c7b6` | [#3](https://github.com/PlayBoardgameTogether/playboard-game-awari/pull/3) | ZIP 1.0.1 |
| Color Match | `81e7be6` | [#2](https://github.com/PlayBoardgameTogether/playboard-game-color-match/pull/2) | 客户端包 1.0.1，规则 1.0.0 |
| Grid Garden | `41e5b1d` | [#2](https://github.com/PlayBoardgameTogether/playboard-game-grid-garden/pull/2) | 客户端包 1.0.1，规则 1.0.0 |

平台集成草稿锁定两个内置游戏的完整提交 `81e7be68329f3e82d08bdb8697e989ff0842e4d6`、`41e5b1d72e050797eee1c3572fed6c758144faec`；须先完成对应游戏 PR 审查合并，再审查平台集成。规则 manifest、服务端规则、RNG、资源版本和旧对局锁定语义保持，发布清单区分客户端包 version 与 gameVersion。在线游戏的集成副本和来源锁保持原提交，后续正式引入另审，不因订阅更新漂移。

官方目录登记已核对，无需改动：catalog.json 与八个独立 release.config.json 的仓库、名称、游戏 ID、archive 和玩法一致；六个 ZIP 仓库的构建校验同时核对包内 manifest。内置游戏保持 builtin。未创建新标签、正式 Release 或附件，未执行订阅同步和安装。旧 ZIP 对局继续使用其原桌面，不会因平台新增字段自动变更标签；新桌面需按原流程发布并审核安装。

## 实际验证

- 八个独立游戏 `pnpm test` 共 99/99；各仓库 `pnpm build`、`pnpm verify` 通过。两个内置仓库 `pnpm typecheck` 通过。
- 六个 ZIP 仓库 `tests/player-names.test.ts` 各通过，覆盖七个安装包的 1440/390px、真人与 AI 名称、同局面改名、回放、HTML 特殊文本及匿名回退；截图保留各隔离工作区 test-results/player-names。
- UNO `pnpm test:ui` 四视口通过，覆盖选牌、颜色、UNO、重复提交和重试；波多黎各四视口 `pnpm test:ui` 8/8。手机长昵称挤压五子棋标题、卡坦岛帮助按钮和阿瓦里计分区的问题作局部修正并重验。
- 平台 `pnpm typecheck`、`pnpm lint`、`pnpm build` 通过，包含 20 个 AST 源码边界、生产 bundle、API runtime、隔离 ZIP 和 AI worker 检查。`pnpm test tests/unit/developer-publication.test.ts` 4/4。
- `pnpm exec playwright test --config tests/config/player-names.config.ts --output .data/names-ui-final`：桌面与 320px 手机 10/10，四款内置棋桌及真实 registry→iframe 桥覆盖名称、改名和匿名兼容；ZIP 桥另覆盖 ready 和回放名称发布。实际查看内置与在线游戏手机截图。首轮 lint 的测试未使用变量已修正；首轮 UI 9/10，一项测试期间发生页面重载丢失测试挂载函数，构建完成后重验 10/10，未放宽断言。
- `node scripts/check-game-repositories.mjs --remote`：10 仓库、142 集成文件精确来源核对通过。
- Color Match 与 Grid Garden 真实 E2E 使用原 test:e2e 的 prepare/migrate/sync/seed/runner 链，专用 `boardgame_player_names_20261101` 测试库、5579/3409 独立端口；首轮 3/6。Grid Garden 旧结算座位断言更新为当前昵称，并增加双人玩家区名称断言，定向重验双端 2/2。Color Match 手机的模拟时钟在异步 socket close 后冻结了新建的重试计时器；测试改为继续推进时钟并等待实际恢复，原掉 pong、恢复、重复连接和刷新断言保留，手机定向重验 1/1。六个不同用例最终均有本轮通过记录；新断言/时钟同步代码另经 ESLint 检查。保留隔离保护，未清理开发库，未改原工作区 .env。

本轮不涉及认证、数据库、动作或 WS 逻辑修改，未扩大执行全量集成、全站 E2E 或全部单元测试。物理手机、Safari、生产部署与生产订阅未验证。用户明确要求“先不同步”，因此不合并、不部署，保留各 PR 和本地分支以供审查。
