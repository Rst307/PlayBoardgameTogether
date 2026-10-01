# 第九阶段实施计划（2026-10-01）

已读取阶段计划、任务书、进度、架构、阶段 8 验收及阶段 5–9 交接。阶段 4 没有独立交接文件，恢复边界以 reliability.md、MatchPage 和现有恢复测试为准。

当前目录没有 .git；无法核对历史差异、提交或推送，不初始化仓库。现有大厅已支持公开房间，这是后续产品调整，本阶段保留，不按旧任务书删除。规则、State、迁移、通信与资源锁保持原契约。

| 优先级 | 实际缺口 | 实施位置 |
| --- | --- | --- |
| P1 | 大厅读取失败误跳登录，加入无提交保护 | apps/web/src/pages/DashboardPage.tsx |
| P1 | 秘密选择按钮立即提交，草稿不能取消 | games/grid-garden/src/client/index.tsx |
| P1 | 卡牌无取消入口，目标一步提交无本地确认 | games/color-match/src/client/index.tsx |
| P1 | 扩展渲染失败可能影响整个页面 | 公共 UI 边界、MatchPage |
| P1 | 等待者与 AI 状态文案、成功保存反馈不充分 | 两游戏 View、MatchPage 公开 controllers |
| P2 | 浅色旧变量与硬编码表面不一致、手机顶部过长 | styles/base.css、stage9.css、App |
| P1 | 无开发固定场景与生产排除检查 | /dev/ui、check-production-bundle.mjs |

先运行两款游戏现有桌面/手机 E2E 保存基线，再完成公共组件与样式、平台恢复反馈、两款游戏操作。游戏容器只通过 clientGame 装配；扩展仅使用公开 View 与既有 onAction。统一动作入口仍为 MatchPage.act，未知请求继续查询原 receipt，冲突后人工再次确认。

最终集中运行 typecheck、lint、全部 unit/integration、全部 E2E、build。新增视口/键盘/开发场景检查；真实后端完整局与开发截图分开记录。测试使用独立 boardgame_test，集成与 E2E 顺序执行。真机、物理听音、真实模型未测需保留限制。
