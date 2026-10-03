# 在线游戏 ZIP

管理员在「更多 → 管理员后台 → 游戏管理 → 上传游戏 ZIP」选择包并点击「安装并上架」。成功后立即出现在大厅，支持创建房间、真人完整对局、刷新与 API 重启恢复。下载 [可玩示例 ZIP](/api/v1/game-packages/example.zip)，解压即可查看全部规则和桌面代码。

## 包格式 v1

ZIP 根目录必须恰好包含以下三个文件，无父目录、附加文件、加密、符号链接或 ZIP64。压缩包最大 5 MiB，解压后总共最多 2 MiB；采用 ZIP stored 或 deflate。

| 文件 | 内容 |
| --- | --- |
| game.json | 严格 JSON：`{"format":"boardgame-package-v1","rules":"公开规则说明"}`。rules 必填，最多 16000 字符 |
| server.js | 无 imports/require 的独立 JavaScript，声明 `const game = {...}`，实现现有 GameExtension 方法 |
| client.html | 自包含桌面 HTML，内联 JavaScript/CSS，图片可用 data URL |

这是一种运行时包格式，普通 GitHub 源码仓库 ZIP 或现有 workspace 源码 ZIP 不能直接上传。可先把共享规则及 schema 依赖打包为独立 JavaScript，再导出全局 game；不得依赖 Node.js、React 服务端、文件、网络、异步函数或宿主对象。当前没有在服务器安装 npm 依赖、执行包内脚本或编译源码的步骤。

## 服务端规则

方法沿用 [游戏 SDK](/developers/game-sdk)：manifest、validateOptions、parseAction、setup、getView、getActionSpec、validateAction、applyAction、projectEvents、getOutcome、serialize、deserialize、getFallbackAction。输入/输出只允许 JSON；validateAction 可返回 undefined。默认选项必须接受 `{}`，其他选项可在建房时填写。manifest 必须是正式游戏，兼容 `^0.1.`，游戏 ID 和版本满足 SDK；版本最多 32 字符。

setup 接收 `{seats,options,rng}`，applyAction 接收 `(state,actor,action,rng)`，返回 `{state,events}`。rng 仅提供同步 `nextInt(min,max)`，使用与平台相同的 mulberry32-v1，最多调用 10000 次。getOutcome 返回 `{status:'ongoing'}` 或 `{status:'finished',winners:[seatId]}`。规则错误和失败转换不会提交状态、RNG、revision 或动作回执。

每次调用独立创建 QuickJS WASM 环境：16 MiB 内存、512 KiB 栈、100 ms 执行上限、256 KiB JSON 结果上限。环境不提供 Node.js、文件、网络、时钟、宿主回调；Math.random 禁用，随机必须使用注入 RNG。跨方法的可变全局变量不会保留，所有权威进度必须在 State 内。计时中断不是硬实时保证，WASM 初始化与 JSON 处理也有额外开销。

安装会验证所需方法及最小/最大人数下的 setup、序列化恢复、本人 View、动作说明、初始事件投影和结局格式。该检查不证明所有规则或私密投影正确；管理员仍应选择可信来源并审查玩法与投影。完整 State 只传给服务端规则；桌面仅收到当前身份的 View 和已投影事件。

v1 使用游戏自身内联桌面与空默认图包，不接入图包切换、平台音效、教程或脚本/模型 AI。真人对局、私密 View、同时行动可以通过 SDK 方法实现。原静态游戏保留已有全部能力。

## 桌面桥接

HTML 在 `sandbox="allow-scripts"` 的独立不透明来源 iframe 中运行，不能读父页面、平台 cookie 或存储。响应 CSP 禁用外部脚本、网络连接、表单、子框架和外部图片；仅允许内联脚本/样式和 data 图片。桌面代码只应通过下面的消息桥操作平台，不读取或导航到外部地址。

```javascript
window.addEventListener('message', event => {
  if (event.source !== parent || event.data?.type !== 'boardgame:view') return;
  const { view, busy, events } = event.data;
  // 使用 textContent 等方式绘制 View，busy 时禁用提交。
});
parent.postMessage({type:'boardgame:ready'}, '*');
// 用户选择合法操作后：
parent.postMessage({type:'boardgame:action', action:{type:'your-action'}}, '*');
```

父页面只接受当前 iframe 的消息，动作最大 8 KiB，并继续交给原 match 命令链路做身份、控制权、revision、去重和规则校验。'*' 仅用于向不透明来源 iframe/父页面传递本人 View，不广播到其他窗口。桌面无跨局权限；卸载清理监听器。历史版本桌面始终可读取以恢复下架版本旧局，其 HTML 是公开程序，不能包含秘密或凭据。

## 安装 API 与版本

`POST /api/v1/admin/game-packages?requestId=UUID`，正文为 ZIP 字节，Content-Type 为 application/zip；需要管理员 session、同源 Origin 和 X-CSRF-Token。共享返回为 `{ok:true,data:{gameId,version,name,hash},traceId}`。client-sdk 提供 `installGamePackage(file,requestId,signal)`。

上传前检查身份及 CSRF，事务内再次检查活跃管理员和未撤销 session。安装元数据、源码、桌面及回执一起原子提交；只有提交后注册并返回成功。同一账户/requestId/ZIP 重试返回原结果，不重复安装；不同字节复用 ID 为 REQUEST_ID_CONFLICT。同版本不同包为 STATE_CONFLICT，必须提升版本，不能覆盖内置或旧版本。相同包重传不会重新上架已下架版本。

最多保存 100 个在线版本、10000 个安装回执；管理员每进程每分钟最多 20 次上传。ZIP 字节不解压到磁盘，不执行安装脚本，不记录源代码或原始错误到日志。规则和桌面持久在 PostgreSQL，数据库备份包括全部包，上传者账户生命周期不删除已安装包。新增 023/024 迁移需运行 `pnpm db:migrate`。

规则摘要锁定包 SHA-256、实际规则源码/公开规则、格式/引擎版本与 manifest；源码损坏后的旧局拒绝恢复，保留原状态。旧局锁定精确版本，不自动替换最新版。当前仍为单 API 进程实时部署；其他 API 进程在涉及游戏的请求前同步已安装版本。更换引擎语义需要版本兼容方案，不应直接改变已有规则摘要。没有任意 npm 项目的自动构建和发布能力。
