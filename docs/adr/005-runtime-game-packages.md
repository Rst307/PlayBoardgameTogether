# ADR-005：在线安装独立游戏 ZIP

状态：Accepted，2026-10-03。

用户明确要求管理员上传 ZIP 后自动安装并立即可玩。现有 TypeScript/React 扩展通过静态 registry 与构建注册，资料申请和上下架不足以实现该需求。

采用 boardgame-package-v1：固定 game.json/server.js/client.html，限定大小，内存解压；规则使用独立 QuickJS WASM 同步调用适配现有 GameExtension，桌面通过不透明来源 sandbox iframe 消费本人 View 和投影事件。catalog 管理上传/事务/版本持久化，registry 负责规则引擎适配与装配，Web game-registry 负责桌面适配，matches/rooms 继续拥有已有正式事务。

不把 ZIP JavaScript import 到 Node.js 主运行环境，不执行 npm 或 shell 安装脚本，不接收普通仓库压缩包；Node vm 不能作为第三方代码安全边界。WASM 引擎有时间/内存/结果上限，但仍需要跟踪依赖漏洞，安装 smoke test 不保证业务规则或私密投影正确。管理员承担包来源与规则审核责任。

包和安装回执持久化至 PostgreSQL，同一版本不可覆盖。提交后再装配；请求响应丢失或装配临时失败可用原 requestId 重试，已提交包仍从数据库恢复。新进程在涉及游戏的请求前装配所有精确版本，包括下架版本。旧对局的原规则与资源摘要维持锁定。不存在运行单元、第二套认证/动作/规则事务或自动旧局迁移。

v1 限制为自包含同步规则、HTML 桌面与真人玩法。没有自动编译 npm 项目、依赖安装、AI 策略热加载、游戏图包/音效或交互教程装配。原内置扩展不迁移，维持已有能力。
