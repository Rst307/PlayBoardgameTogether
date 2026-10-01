# 阶段 6 实施映射

日期：2026-09-25

## 基线与边界

阶段 5 已提供 `ai_tasks`、controller epoch、leaseGeneration、冻结提案和统一动作提交。本阶段新增模型配置域，模型调用仍在任务事务之外，最终动作继续复用 `MatchService.actAutomation`。没有配置 `MODEL_CREDENTIALS_KEY` 时，模型凭证功能返回明确不可用，脚本 AI 不受影响。

## 接口映射

- `model_profiles`/`model_profile_versions`：账户拥有的非秘密配置和 immutable 版本。
- `model_credentials`：AES-256-GCM 密文、nonce、认证标签和授权版本；浏览器只能写入 key，读取只返回 `hasCredential`。
- `provider_endpoints`：迁移内置的固定 HTTPS OpenAI-compatible 端点和测试 mock 端点，个人配置不能提交任意 URL。
- `model_attempts`/`model_budget_*`：外部调用审计与预算预留的持久边界，后续调度接入时使用 attemptId，不与游戏 requestId 混用。
- `ModelProfileService`：API 所有权检查、密钥封装、端点目录。
- `OpenAiChatAdapter`/`MockModelAdapter`：只负责协议请求和响应归一化；`parseModelChoice` 严格校验 decisionId、choiceId 和额外字段。

## 供应商核对

首个真实适配器采用 OpenAI-compatible Chat Completions JSON object 请求。代码固定关闭重定向、设置 Authorization 只在适配器内生成、限制响应为非流式，并记录 provider request id 和可用 usage。未声明支持的参数不透传。真实凭证和真实整局联调需部署者在设置页显式授权，本轮没有可用凭证时不宣称 F47 通过。

## 后续交接

调度器仍需把 `controllerType=model`、profile/binding 快照、候选 ID 构造和 60 秒模型租约接入现有 `ai_tasks`。本轮先完成可独立验证的安全配置和适配器边界，未实现图片、音效或聊天。
