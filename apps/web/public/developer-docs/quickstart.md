# 快速开始

## 环境与依赖

仓库当前使用 Node.js 22、pnpm 11.15.1、PostgreSQL 17（可通过 Docker Desktop 启动）。依赖以 package.json 和 pnpm-lock.yaml 为准。

```powershell
git clone https://github.com/Rst307/PlayBoardgameTogether.git
cd PlayBoardgameTogether
pnpm install --frozen-lockfile
```

首次开发按 .env.example 配置 .env；已有 .env 时保留原文件，不要覆盖。账户创建和敏感配置的具体操作参见仓库 README 与 docs/auth.md，密码通过 stdin 输入，不写进命令参数。

```powershell
pnpm db:up
pnpm db:migrate
pnpm games:sync
docker build -t boardgame-media:1 scripts/media
pnpm assets:seed
pnpm dev
```

Web 默认 http://127.0.0.1:5173，API 默认 http://127.0.0.1:3001。打开 /developers 可在未登录时阅读本文。不要在访问 URL 中携带密码、session、CSRF 或邀请码。

## 在工作区引用 SDK

游戏包的 package.json 使用现有依赖：

```json
{
  "dependencies": {
    "@boardgame/game-sdk": "workspace:*",
    "react": "19.1.1",
    "zod": "4.1.5"
  }
}
```

前端代码使用 @boardgame/client-sdk，协议 schema 使用 @boardgame/protocol。SDK 当前提供 TypeScript 源码默认入口及 production 条件下的 dist 入口；它们是现有工作区包，不是本文承诺已发布的 npm 包。

## 模块职责

| 目录 | 职责 |
| --- | --- |
| apps/web | 页面、会话交互、游戏容器，只消费当前身份的 View |
| apps/api | 认证、授权、事务、持久化、实时通信 |
| packages/protocol | 网络 DTO、命令、消息 schema 和错误码 |
| packages/client-sdk | 请求、协议解析和客户端通信 |
| packages/game-sdk | 游戏规则与扩展契约、确定性 RNG |
| games/* | 游戏 shared / server / client 分离 |

## 检查与构建

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```

根据修改范围选择检查。集成与 E2E 必须使用独立 TEST_DATABASE_URL，不能指向开发或生产库。脚本会准备、迁移和清理测试数据，不同时运行共享测试库的检查。skip 不算通过。

生产构建后运行 pnpm --filter @boardgame/api start。Web 静态部署应将页面路径回退到 index.html，并直接提供 /developer-docs、/developer-sdk 和 /llms.txt、/llms-full.txt 静态资源。HTTPS 部署保留同源 API、Origin、CSRF 和 WebSocket upgrade；COOKIE_SECURE=true。
