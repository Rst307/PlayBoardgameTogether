# 添加游戏扩展

游戏有两条接入路径：现有 workspace 扩展继续由维护者审核、构建和部署；管理员也可上传 [在线游戏 ZIP](/developers/game-packages)，自动安装独立规则和桌面，立即真人可玩。在线格式不接受普通源码仓库 ZIP，不自动安装 npm 依赖。下方游戏接入申请仍只保存资料，资料审核不会安装游戏。

## 在线接入申请（2026-10-03）

先使用现有账户登录，再携带 session cookie、同源 Origin 和 X-CSRF-Token，发送 `POST /api/v1/game-submissions`。只接受 application/json，正文上限 8 KiB。

```json
{
  "requestId": "a1a4c267-2b15-4fa9-84f9-435c1a7a8914",
  "gameId": "your-game",
  "version": "1.0.0",
  "name": "你的游戏",
  "description": "介绍玩法、人数和开发完成情况。",
  "repositoryUrl": "https://github.com/example/your-game"
}
```

gameId 为小写字母开头、最多 64 位的小写字母/数字/连字符；version 为三段非负整数（每段最多六位，无前导零）。name 最多 80 字符，description 最多 2000 字符，只接受纯文本，不接受 HTML 和控制字符。仓库地址只允许固定格式的 `https://github.com/owner/repo`，不含凭据、查询参数、片段或额外路径。平台只保存该地址，不请求它、不解析 DNS、不下载仓库。

身份来自 session；不接收 accountId、status、代码、Base64 文件、压缩包、serverEntry/clientEntry 等额外字段。资料不能作为 HTML、脚本或命令执行；未来管理页面必须使用文本转义，不能用 innerHTML 渲染。

| 方法 | 路径 | 权限与用途 |
| --- | --- | --- |
| POST | /api/v1/game-submissions | 登录用户提交申请 |
| GET | /api/v1/game-submissions | 本人的申请；`?before=上一页nextCursor` 翻页 |
| GET | /api/v1/game-submissions/:id | 本人申请，其他人的 ID 与不存在均返回 404 |
| GET | /api/v1/admin/game-submissions | 仅管理员，全部申请分页 |
| GET | /api/v1/admin/game-submissions/:id | 仅管理员，申请详情 |
| POST | /api/v1/admin/game-submissions/:id/review | 仅管理员，记录资料审阅或拒绝 |

审核输入为 `{ requestId, expectedRevision: 1, status: "reviewed" | "rejected", reviewNote }`，requestId 为 UUID，reviewNote 为最多 1000 字符的必填纯文本。只能从 pending 转到 reviewed/rejected，revision 从 1 变为 2。reviewed 仅表示资料已审阅，不代表源码安全、允许执行或已上架；没有 approved/published 状态或安装操作。

所有成功响应沿用 `{ ok: true, data, traceId }`，单项 data 为 `{ id, gameId, version, name, description, repositoryUrl, status, revision, reviewNote, createdAt, reviewedAt }`；列表为 `{ items, nextCursor }`，每页最多 20 项。不公开申请人账户 ID、session、token、内部请求回执或审核者 ID，响应包括错误均 no-store。

提交去重按账户 + requestId；相同内容重试返回同一申请的当前快照，不重新占用配额。不同内容复用 requestId 返回 REQUEST_ID_CONFLICT。审核去重按申请 + 审核者 + requestId，重复成功审核先返回原结果，再检查 revision；竞争审核只能一个成功，其余 STATE_CONFLICT。审核不会通知游戏 registry 或修改 game_installations。

每个账户最多 3 个 pending、滚动 24 小时最多 5 次新申请、累计最多 100 次；全平台累计最多 10000 次。配额在数据库事务锁下检查，API 重启不会清零，成功重试不额外计数。累计上限达到后需维护者处理容量策略。另有单 API 进程每 IP 每分钟最多 120 次申请相关请求，最多保留 1024 个未过期 IP 桶，满时拒绝新来源；不信任客户端 X-Forwarded-For。反向代理需另外配置全站限流、连接/请求超时和真实来源策略；这不构成多副本全局网络限流。

使用 client-sdk 的 `submitGame`、`gameSubmissions`、`gameSubmission`、`adminGameSubmissions`、`adminGameSubmission`、`reviewGameSubmission`，请求和响应均通过共享 schema 校验。SDK 仍以 workspace/公开源码交付，不声明已发布 npm 包。

申请接口使用 018 迁移。后续在线包安装使用 023/024 迁移、QuickJS WASM 规则和 sandbox HTML 桌面，详见 [打包说明](/developers/game-packages)。资料 reviewed 状态不代替代码审核；安装检查和文件摘要也不证明规则或私密投影正确，规则不会导入 Node.js 宿主环境。

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

## 可选教程接入

在 client 内编写 GameTutorial（从 @boardgame/game-sdk/tutorial 导入类型），由 ./client 导出。参照 Color Match 的 client/tutorial.ts，为每课定义公开初始 View、说明和 onAction 判定；复用原桌面，不导入 server。随后在 apps/web/src/game-registry.tsx 的 clientTutorials 注册精确版本：

```typescript
// 放入 clientTutorials 对象；省略此项即可不提供教程。
'your-game@1.0.0': async () => {
  const { tutorial } = await import('@boardgame/your-game/client');
  return tutorial;
},
```

无需更改 manifest、API 或数据库。详情自动出现入口，/games/:id/:version/tutorial 确认该游戏已启用后运行。测试应覆盖教学目标未完成不能继续、多次操作、重试/完成/刷新、没有教程和版本缺失；固定练习结果与服务端规则对照，桌面及手机实际操作验证。完整契约见 [游戏 SDK](/developers/game-sdk)。

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

## 游戏目录展示图片

游戏安装并启用后，管理员在 /admin/games 为精确版本设置图标、封面、详情背景地址。图片放在 Web 的 public/game-art 时可使用 /game-art/ 路径，也可引用公开 HTTPS 图片；留空采用客户端 catalog-art 的内置配置，无内置图片时显示中性回退。目录图片与已锁定的对局资源图包分开，不要为替换大厅封面而修改同版本规则 manifest 或存档。此页面不上传文件或安装规则代码。

## 后续添加游戏接口的边界

后续接口应以现有 manifest/版本、公开规则、View/Action schema 和资源契约为基础，并明确提交、审核、安装和启用的权限。服务端规则需要可信部署边界；不能通过普通 HTTP 请求执行任意上传代码。

现阶段开发者可通过本文申请接口提交资料，再按照可信源码流程贡献独立游戏包。代码包上传、隔离审核、安装启用与动态加载仍为后续工作，不由资料审核接口触发。
