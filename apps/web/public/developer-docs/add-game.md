# 添加游戏扩展

当前游戏代码是由维护者审核并部署的可信扩展。网站公开 SDK 和 API 文档，尚未开放上传任意服务端代码、自动安装或游戏商店接口。未来在线添加游戏接口应沿用本文契约；其 URL、权限和审核流程尚未确定。

## 推荐目录

```text
games/your-game/
  package.json
  tsconfig.json
  tsconfig.build.json
  src/
    shared/index.ts
    shared/rules.ts
    shared/assets.ts
    server/index.ts
    client/index.tsx
  assets/manifest.json
```

参考现有 Color Match（轮流行动）、Grid Garden（同时秘密选择与空间棋盘）及 Splendor（预留私密信息与多阶段动作）。这是目录指导，不是未经实现即可安装的模板。

## 当前接入流程

1. 定义 shared 的 manifest、Options/Action/View schema，建立独立游戏 ID 和版本，声明 SDK 范围。
2. 实现 server 的完整 GameExtension，包括私密投影、确定性规则、序列化与恢复；为初始资源提供匹配的默认清单。
3. 实现 client 桌面，只接收已解析 View，通过 onAction 交给平台提交动作；不导入 server 或秘密 State。
4. package.json 分离 ./shared、./server、./client、./rules 和需要的 ./assets 导出；开发入口用 src，production 用 dist。
5. 在相关 workspace package.json 添加依赖并更新锁文件；API 只在 apps/api/src/registry/index.ts 注册规则、公开说明、规则摘要来源及资源契约。
6. 在 apps/web/src/game-registry.tsx 注册客户端、默认配置和按需加载；游戏语义放在扩展内，不向平台新增 gameId 规则分支。
7. 若提供脚本 AI，注册可信 worker 策略与兼容版本，getDecisionContext 输出合法候选；多行动者实现 getDecisionRequests。
8. 运行 pnpm games:sync 安装精确版本，完成检查与正式房间整局验证。该命令不会替你创建 registry 或客户端注册。

SDK 接口完整定义可直接下载 [源码包](/developer-sdk/sdk-sources.json)。既有 /dev/lab 是双开关保护的计数实验台，不会自动接受未注册的新游戏；demo.counter-room 是身份验收扩展，应保留原用途。

## 客户端装配契约

GameBoard 在当前 Web registry 中接收 view:unknown、busy:boolean、events:unknown[]、onAction(action:unknown) 和可选 AssetResolverPort，返回 ReactNode。

扩展先使用自己的 View schema 解析，再渲染与调用 onAction。busy 时禁用提交，非法原因和可操作状态应清楚展示；桌面和手机都能完成整局，不将关键动作隐藏在 hover 中。

## 测试清单

- 非法动作、错误阶段和错误 actor 不改变 State/RNG。
- 相同 seed 与动作序列产生相同结果。
- serialize/deserialize 往返保留规则与私密信息；损坏和不兼容存档明确失败。
- getView/projectEvents 不泄露对手秘密、牌堆顺序或秘密选择。
- 完整正常结束、并列和游戏需要的阶段切换。
- 正式链路的重复请求、revision 冲突、回滚与刷新恢复。
- 客户端依赖图不含 server、数据库驱动或模型密钥。
- 桌面与手机可以操作，并有资源缺失回退。

版本升级保持旧局原规则、内容和资源版本。不要改变已安装同版本含义，不新增平行认证、房间、去重或动作事务。

## 后续添加游戏接口的边界

后续接口应以现有 manifest/版本、公开规则、View/Action schema 和资源契约为基础，并明确提交、审核、安装和启用的权限。服务端规则需要可信部署边界；不能通过普通 HTTP 请求执行任意上传代码。

现阶段开发者可按照以上流程贡献独立游戏包；在线提交接口仍为规划，本文不提供占位地址或宣称已可调用。
