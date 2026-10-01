# 阶段 6 验收记录

日期：2026-09-25

## 已验证

- `pnpm db:migrate`：开发数据库应用 007、008；`boardgame_test` 独立测试库应用同样迁移。
- `pnpm typecheck`：通过。
- `pnpm lint`：通过，边界检查通过。
- `pnpm test`：16 个文件、65 项通过。
- `pnpm test:integration`：9 个文件、45 项通过，阶段 2–5 回归保持通过。
- `pnpm test:e2e`：桌面与 Pixel 5 共 14 项通过，包含 profile 保存、mock 连接测试、模型绑定并由模型/脚本混合完成 Color Match。
- `pnpm build`：生产 Web bundle、API runtime 检查通过。

## 本轮交付

个人 profile/version、固定端点、AES-GCM 凭证写入/替换/撤销、mock 与 OpenAI-compatible 适配器、严格 choice 解析、测试连接 attempt 记录、预算账本表、模型控制器、现有持久任务和统一动作提交路径，以及桌面/手机设置和托管流程已实现。浏览器对局验证 mock 模型实际产生并提交动作，随后与脚本 AI 完成终局。接口只返回 `hasCredential` 等非秘密字段。

## 未完成或阻塞

真实供应商没有授权凭证，F47 真实一局未执行。当前还有规格项未完成：决策调用尚未与预算 reservation 原子联动，缺少长模型租约续租、有限修复/传输重试、attempt dispatching/unknown 崩溃恢复、profile 编辑时版本递增/配置快照，以及供应商 fake HTTP server 的协议故障矩阵。现有 E2E 的 mock 流程证明模型任务可进入统一动作事务，不代表这些项目或全部 F01–F50 已通过。`MODEL_CREDENTIALS_KEY` 未配置时真实凭证功能不可用，脚本 AI 与无凭证 mock 测试仍可运行。

## 人工测试

自动化全部通过后，本地站点 `http://127.0.0.1:5173/settings/models` 已在 Codex 浏览器面板打开供人工操作。开发服务保持运行；本轮未输入真实 API key，也未调用真实供应商。人工确认结果待用户操作后补记。

## 自定义 Base URL 补充验收（2026-09-25）

设置页现可选择“自定义 Base URL”，填写 OpenAI-compatible 服务地址、模型 ID 和 API key。API key 输入框只写入且真实服务必填。自定义 endpoint 仅能由创建账户的个人配置使用，端点目录不会暴露其 ID；Base URL 只允许标准端口公网 HTTPS，拒绝 URL 凭据、查询/片段、回环/私网/保留地址，HTTP 请求固定到 DNS 已校验地址并拒绝重定向。

本轮验证：`pnpm typecheck`、`pnpm lint`、`pnpm test`（17 文件、67 项）、`pnpm test:integration`（10 文件、46 项）、`pnpm test:e2e`（桌面与 Pixel 5 共 14 项）和 `pnpm build` 均通过。新增 URL 拒绝规则单测和跨账户 endpoint 绑定集成测试。真实供应商调用仍未进行；人工页面交互待用户确认。

补充 DNS 修复：`BlockList` 将 `::ffff:0:0/96` 同时匹配普通 IPv4 检查，导致 `oai.sb` 的公开 A 记录被误拒。现将 mapped IPv6 检查独立处理，普通公网 IPv4 可用且 mapped 地址仍拒绝。原始 URL 运行 `node --import=tsx/esm -e 'import("./apps/api/src/model-ai.ts").then(({resolvePublicHttpsTarget}) => resolvePublicHttpsTarget("https://oai.sb/v1").then(target => console.log(JSON.stringify({url:target.url.toString(),address:target.address,family:target.family}))))'` 得到公网 IPv6 目标；回归测试先失败后通过。修复后 `pnpm typecheck`、`pnpm lint`、`pnpm test`（17 文件、68 项）和 `pnpm build` 通过。真实供应商调用与人工页面测试仍未验证。

补充表单修复：异步保存成功后不再通过已失效的 `event.currentTarget` 访问表单，改为在提交开始时捕获 form 引用。阶段六桌面 E2E 增加保存成功且无错误提示的断言；修复前测试稳定失败，修复后 `pnpm test:e2e -- --grep "model settings save" --project=desktop` 通过，`pnpm typecheck` 与 `pnpm lint` 通过。此前错误发生在数据库写入成功之后，故一次用户操作仍可能留下已保存配置。
