# 模型服务端点

服务端点由迁移中的 `provider_endpoints` 管理。设置页提供 `openai`（HTTPS OpenAI-compatible Chat Completions）、`mock`（仅测试/演示，不联网）和“自定义 Base URL”。自定义地址只支持兼容 OpenAI Chat Completions 的服务；每个自定义端点只属于创建它的账户，不能从公共端点目录发现或被其他账户绑定。

自定义 Base URL 仅接受标准端口的公网 HTTPS URL，不接受账号密码、查询参数、片段或尾点域名。保存和每次请求都会解析并检查全部 DNS 地址，拒绝回环、私网、链路本地及保留地址；实际 HTTPS 连接固定到已校验的解析地址、保留 TLS 主机名校验并拒绝重定向。此策略不支持本机或私有网络模型服务。模型标识填写服务商要求的 model ID；API key 仅提交给平台后端并加密保存，不会回显。

适配器关闭重定向并限制为 JSON 结构化选择；不支持的参数不会透传。

真实服务由服务器调用。浏览器不会接触 API key、完整提示词或模型响应。

2026-09-25 设置修复：HTTPS lookup 同时支持 Node 22 的单地址和 all:true 回调形式，实际请求仍固定到已校验的公网地址。Base URL 也接受完整 `/chat/completions` URL，不重复追加路径。请求不再强制 temperature 和 response_format 扩展参数，采用非流式 Chat Completions、512 token 输出上限和明确 JSON 提示，返回值仍经严格 decisionId/choiceId 校验。并非所有原生协议或推理模型都兼容此适配器。

连接测试最多等待 30 秒；HTTP 400、401、403、404、429 分别提示参数兼容性、密钥、权限、路径/模型标识、限流/额度问题。服务商原始错误正文不回传。网络、超时、响应格式错误有独立提示。此超时只针对设置页测试，没有改动对局调度器的租约和超时。
