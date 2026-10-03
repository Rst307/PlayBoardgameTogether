# UNO 管理员上传测试包

此目录是独立 `boardgame-package-v1` 源码，不预注册进平台，方便测试管理员上传后即时上架。游戏为 `online.uno@1.0.0`，名称「UNO · 休闲版」，支持 2–4 名真人、108 张牌、私密手牌与存档恢复。

## 打包与上传

在项目根目录执行：

```powershell
node scripts/package-uno.mjs
```

生成 `dist/game-packages/uno-1.0.0.zip`。ZIP 根目录恰好三个文件：`game.json`、`server.js`（由本目录 `server.txt` 原样生成）、`client.html`，无父目录和附加说明文件。生成包与截图在忽略的 dist 中，不提交二进制产物。

管理员进入「更多 → 管理员后台 → 游戏管理 → 上传游戏 ZIP」，选择该 ZIP 并「安装并上架」。在大厅选择「UNO · 休闲版」，创建 2–4 人房间，其他账号加入、入座和准备，房主准备后开局。在线 v1 包不支持脚本/模型 AI。这里只提供包，不自动安装到开发数据库，保留管理员实际上传作为人工验收。

同包重复上传应复用原安装；同版本不同源码会冲突。修改玩法再上传时请同步提升 server.txt 中 version/contentVersion/defaultAssetPack.version 与输出文件名，不覆盖原对局版本。

## 玩法边界

- 同色或同符号出牌，万能牌选色；+4 仅在无当前颜色手牌时可出，不含质疑流程。
- 跳过、反转、+2/+4；两人反转等于跳过，不叠加罚牌，最后一张罚牌也先执行效果再结算。
- 可主动摸一张；只能出这张新牌，或保留并结束回合。新牌不可出时自动换人。
- 剩两张时勾选「出牌时喊 UNO」；未喊立即自动罚摸两张，无抓漏喊窗口。
- 单局出完即胜，无累计 500 分。弃牌重洗保留顶牌；全员无法补牌或 2000 回合上限按最少手牌结算，可并列。
- 原创文字与几何牌面，不携带官方美术。对手只看到牌数，公共事件不包含摸到的牌和牌堆顺序。

桌面核心任务为当前回合出牌：玩家/回合 → 桌面颜色与弃牌 → 本人手牌与摸牌。万能牌用模态选色，完整规则折叠，UNO 只在必要时出现；长手牌独立横向滚动，手机将玩家排成两列。

## 验证

```powershell
pnpm test tests/unit/uno-package.test.ts tests/unit/game-packages.test.ts
node scripts/check-uno-package.mjs
pnpm typecheck
pnpm lint
```

单元测试实际使用平台 readGamePackage 和 QuickJS PackageRuntime，并覆盖完整合法动作对局、私密投影、108 张牌守恒、非法动作/RNG不变、罚牌、UNO、摸牌、重洗、僵局与 JSONB 键重排恢复。浏览器检查使用实际 sandbox/CSP 桌面消息桥；父页面只提供固定公开测试 View 和传输反馈，不能替代真实 HTTP/数据库上传验收。截图位于 dist/uno-check。
