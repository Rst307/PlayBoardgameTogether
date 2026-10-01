# 第九阶段验收（2026-10-01）

本地实施完成。环境：Windows、Node 22.17.0、pnpm 11.15.1、Docker 媒体容器、PostgreSQL 独立 boardgame_test、Playwright Chromium / Pixel 5 模拟。没有运行公网部署，没有真实模型付费调用。测试脚本确认测试库独立于开发库，013 迁移、两款游戏和四套资源均 unchanged。

## 命令和实际结果

| 命令 | 结果 |
| --- | --- |
| 修改前 `pnpm test:e2e tests/e2e/color-match.spec.ts tests/e2e/grid-garden.spec.ts` | 6 项全部通过，基线图片保存在 before |
| `pnpm install --frozen-lockfile --offline` | 通过；Web 声明已锁定的 zod 4.1.5，未升级依赖 |
| `pnpm typecheck` | 最终通过，9 个 workspace；初稿 fixture 缺 contentId 已修复 |
| `pnpm lint` | 最终通过，含依赖边界 |
| `pnpm test tests/unit` | 11 文件、46 项通过，无 skip；含真实 Docker 媒体校验 |
| `pnpm test:integration` | 12 文件、77 项通过，无 skip；受限 Windows 首先发生 userInfo ENOMEM，正常进程环境成功 |
| `pnpm test:e2e` | 首轮 30 通过 / 6 失败：折叠控制面板的旧定位、场景 label 精确匹配、四人准备顺序 |
| `pnpm test:e2e tests/e2e/stage9-ui.spec.ts tests/e2e/stage5-ai.spec.ts tests/e2e/color-match.spec.ts tests/e2e/grid-garden.spec.ts` | 12 通过 / 2 失败；两游戏、AI 和视口草稿通过，四人流程揭示入座清除准备的既有规则 |
| `pnpm test:e2e tests/e2e/stage9-ui.spec.ts tests/e2e/grid-garden.spec.ts` | 10 通过 / 2 失败；新对比/触摸检查通过，四人已到终局但得分定位混入行动记录，手机还需等待每步版本同步 |
| `pnpm test:e2e tests/e2e/stage9-ui.spec.ts -g "four real accounts"` | 最终桌面和手机 2 项通过（18.4 秒），键盘登录/入座/准备/确认，三轮四人并列 |
| `pnpm test:e2e tests/e2e/grid-garden.spec.ts -g "two human gardens"` | 桌面/手机 2 项通过（16.7 秒）；最终真实纵向预览及终局截图持久保存到 docs |
| `pnpm build` | 最终通过，含生产场景/React 开发 runtime 排除及 API runtime；明确 Web 构建入口防止本地 development 改变产物，主 JS 336.58 kB，不再出现 >500 kB 提示 |
| `node scripts/check-web-runtime.mjs` | 通过；真实 Chromium 加载构建登录页无 pageerror，开发两个路由均404，不提交登录、不访问数据库 |

本轮 38 个浏览器项目用例均有通过证据，来自完整运行及失败/受影响范围重跑，不能描述为“单次全量 38 项通过”。unit + integration 共 123 项覆盖当前全部 Vitest 用例；没有再以 `pnpm test` 重复同一批检查。后续客户端/测试定位修改没有改写规则或服务端；按影响范围补验，不重复 DB 验收。

## U01–U40

| ID | 状态 | 证据与范围 |
| --- | --- | --- |
| U01 | 通过 | stage2 真实登录、集成凭据拒绝、Color Match 登出会话失效与重新登录恢复；错误视觉 fixture |
| U02 | 通过 | stage9 注入真实页面 503，不跳登录、不误报空列表，解除故障后原页重试；空状态说明 |
| U03 | 通过 | lobby 真实创建/密码加入/复制；stage9 剪贴板拒绝后可选择 12 位原码手动复制 |
| U04 | 通过 | stage2 两账户及 stage9 四账户准备/开局；席位变更清除准备后全员重新准备 |
| U05 | 通过 | stage2、room-close、集成拒绝未授权访问及非管理员资源管理；不增加权限 |
| U06 | 通过 | room-close waiting/active 两客户端、取消确认及旧地址恢复；页面返回不退出 |
| U07 | 通过 | 实际两游戏桌面/手机截图；clientGame 装配边界保持，自己的花园优先 |
| U08 | 通过 | Color Match 当前行动/目标/等待，Grid Garden 本人提交及真实等待三位玩家 |
| U09 | 通过 | Color Match 双真人完整终局，出牌、指定目标确认、摸牌、保存和多轮房间恢复 |
| U10 | 通过 | 20 张手牌 fixture 局部滚动、可出/不可出/已选文字、取消草稿及真实出牌 |
| U11 | 通过（既有隔离回归） | Color Match 私密 View、伪造动作、双账户/多标签；对手 DOM 只生成数量和通用牌背，客户端边界通过 |
| U12 | 通过 | 本地收获/建造选择可取消，确认后真实保存锁定；四账户三轮、两真人建造 |
| U13 | 通过 | 双真人刷新本人 myChoice、他人 myChoice/revealedChoices 为空；四账户第一个提交后同样核对 |
| U14 | 通过 | DB 公共提交事件无 choice；新最近行动仅统一“已保存选择”，揭示前无差异声音/图标 |
| U15 | 通过 | 双真人 H/V、方向键/Enter、越界/重叠、禁止确认、其他玩家更新保留本人预览 |
| U16 | 通过 | 两真人、真人+脚本、四真人三轮；最后选择/落子自动推进，无新增推进动作 |
| U17 | 通过 | roundResults 持久公开轮次可查看；全 harvest 自动进下一轮仍显示上轮记录 |
| U18 | 通过 | 四真人每人占格0/能量4/总分4并列，双真人6/5分；使用 outcome，不由 UI 重算 |
| U19 | 通过 | Color Match 多标签同 revision 一成功一冲突；pendingRef 冻结单意图，DB 同 ID 回执只执行一次 |
| U20 | 通过 | 回复丢失、刷新、原请求回执/重试，真实 before/after COMMIT 退出恢复；未改变此管线 |
| U21 | 通过 | 双真人同 revision 冲突保留建造草稿，显示持久错误，最新 View 后人工再次确认 |
| U22 | 通过 | Color Match 旧 View 跨新对局、刷新订阅唯一；房间写回复卸载保护与 ID 页面隔离 |
| U23 | 通过（通用回归） | controller epoch 集成 fencing，个人配置 mock 整局、logout 清 pending/私密 View；前序模型深度缺口仍保留 |
| U24 | 通过 | Color Match 真实 offline/online、心跳失活恢复；版本缺失/摘要变化/损坏 RNG 集成阻塞而不重开 |
| U25 | 通过（脚本/mock） | stage5 与 stage6 真实状态 UI；AI_FALLBACK_USED 显示兜底，blocked 可见，脚本 worker 超时/冻结恢复集成；无真实供应商验收 |
| U26 | 通过 | live 多事件按 eventId 去重，两个游戏最近行动；stage7 浏览器重复 live 批次仅一次声音 |
| U27 | 通过 | stage7 initial/resync 不补播，Color Match 重连；动画只在新公开记录入场，不维护阻塞队列 |
| U28 | 通过（浏览器） | 静音/音频未启用保留操作；prefers-reduced-motion 关闭 CSS 动画，200% 字体核心入口可达 |
| U29 | 通过（浏览器） | stage7 真实包锁定/替换、图片失败与声音降级；GardenImage 加载失败移除装饰，文字/格点保留 |
| U30 | 通过 | 320/390 固定场景无页面溢出，390 真人两游戏完整局，手牌局部滑动与格点点击 |
| U31 | 通过 | 844×390、768×1024、1440×900 固定场景矩阵；真实桌面完整局 |
| U32 | 部分（外部设备） | 自然页面滚动，无覆盖内容的固定底栏，动作区 safe-area 预留；真实手机软键盘/浏览器工具栏未测 |
| U33 | 通过（自动键盘） | 四账户关键按钮 Enter、登录 Enter；棋盘方向/Home/End/Enter/Space，导航 disclosure Enter 开闭焦点保留；未做屏幕阅读器人工审计 |
| U34 | 通过（公共基线） | 自动算正文/弱化文字≥4.5、关键边界≥3，320 宽选择按钮≥44×44，200% 字体；自定义图包未逐素材审计 |
| U35 | 通过 | registry 精确版本规则，说明加载失败重试；真实模型设置/管理员资源全流程 E2E |
| U36 | 通过 | 开发 View 场景零正式动作 POST/模型调用；最终 build marker 排除开发数据 |
| U37 | 通过 | 双账户、四账户与 Color Match 同账户标签回归；GameSurface 只接本人 View |
| U38 | 通过 | typecheck、lint、123 Vitest 用例及 production build/runtime；安装的规则/资源 unchanged |
| U39 | 通过 | 1440×900 与390×844两游戏真实从登录入房到终局；Grid Garden 另有四真人并列和混合AI |
| U40 | 通过 | stage-9-plan、ui-system、ui-development、阶段验收及第十阶段交接已交付 |

## 截图与局限

持久图片在 `docs/screenshots/stage-9/after`：login/lobby、room-four（邀请码遮罩）、color-initial/color-finished、garden-preview-real/garden-finished-real、conflict-real、offline-real、multiple-waiting、tie-real；`fixture-*` 是匿名视觉场景，包含长手牌、四人房、多等待者、放置、并列及异常的 390/1440 图。已查看真实两游戏、长手牌、棋盘及多人并列桌面/手机图片，无页面横向溢出或主要操作遮挡。

before 保留两游戏原预览/终局和结算后房间；未保存本轮修改前登录/大厅/四人房全套截图，不伪造完整前后基线。实际预览 PNG 也保存于 Playwright test-results，后续运行可能清理，以 docs 的证据为持久入口。

真实 iOS/Android、WebKit、物理听音、真实模型供应商没有可用验收条件，均未测。前序模型预算/长租约与 Grid Garden 调度并发专项未因本轮界面验收而补齐。未宣称全平台无障碍认证、多副本生产容量或灾备完成。

工作目录无 .git，不能提供提交/分支/推送结果；已请求恢复仓库连接，未初始化或猜测远程。没有改写 .env、重置开发库或执行公网部署。
