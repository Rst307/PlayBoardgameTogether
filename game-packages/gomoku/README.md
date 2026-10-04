# 五子棋上传包

双人自由五子棋，游戏 ID 为 online.gomoku，版本 1.0.1。15×15 棋盘，座位 1 执黑先手；横、竖或斜线连续五枚或更多获胜，满盘无人获胜和棋。不设三三、四四、长连禁手，不含交换开局、悔棋或计时。

在项目根目录运行：

```powershell
node scripts/package-gomoku.mjs
```

生成 [gomoku-1.0.1.zip](../../dist/game-packages/gomoku-1.0.1.zip)，根目录仅 game.json、server.js 和 client.html。规则源文件使用 server.txt，打包时改名 server.js；ZIP 固定时间戳，无外部依赖或网络资源。生成 ZIP 不提交 Git。

1.0.1 将内容宽度上限从 680px 扩大到 1000px，手机仍按屏幕宽度适配；棋盘保持 15×15。ResizeObserver 随棋盘、规则展开和窗口宽度变化报告内容高度，平台 Web 的 PackageBoard 接收有界高度，消除原 560px 窗口的内部滚动。需更新平台 Web 并上传审核新版包；同版本不能覆盖，已开始的 1.0.0 对局保留旧桌面，下一局选择 1.0.1。没有迁移或替换旧局规则。

管理员从「更多 → 管理员后台 → 游戏管理 → 上传游戏 ZIP」选择包，检查并审核后上架。大厅选择五子棋，创建双人房间；另一位真人加入准备，或在空座位添加基础脚本 AI，然后开局。规则包沿用当前平台 QuickJS、身份、正式动作、请求去重、修订号和持久化恢复，无需改平台 registry 源码。不要直接上传 game-packages/gomoku 目录压缩包。

点击空交叉点选点，再点击「确认落子」。蓝色点标记最后落子，蓝色圈标记获胜连线。可用方向键移动焦点，空格/回车选点。规则折叠展示，返回房间和再次开局沿用平台控件。

基础脚本 AI 按候选顺序优先直接获胜、阻挡对方一步获胜和扩展连线，棋力有限。可用平台已有个人模型配置添加模型 AI；本轮未验证真实外部供应商调用。棋盘公开，不包含他人秘密或模型凭据。存档只记录座位和落子历史，恢复时验证并重建棋盘，拒绝重复位置、越界和胜利后继续落子。

验证命令：

```powershell
pnpm test tests/unit/gomoku-package.test.ts
pnpm exec playwright test --config playwright.gomoku-ui.config.ts --output .data/gomoku-validation
pnpm typecheck
pnpm lint
```

浏览器专项使用真实 React PackageBoard、QuickJS 规则、身份化 View 和 sandbox 消息桥，验证桌面及 320px 手机的选点/确认、忙碌保护、双方完整胜利、键盘操作、序列化后刷新及横向溢出。额外检查棋盘宽度、无内部纵向滚动、规则展开/收起后高度增长/恢复、窗口变窄和非法高度/错误来源消息。不访问数据库，也不替代管理员真实 HTTP 上传、房间权限、数据库持久化或公网部署验收。没有平台音效、图包切换、内嵌展示图或交互教程。
