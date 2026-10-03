# ADR-004：模型 bot 的独立凭证授权

## Status

Accepted（2026-10-03）

## Context

房间需要添加可配置的模型 AI。现有模型托管从真人 account_id 读取凭证，而 bot 没有登录身份。将房主账户写入 bot 的 account_id 会破坏身份映射及私密视图隔离。

## Decision

- bot 保持 account_id=NULL，独立 model_owner_account_id 在开局固定授权房主；复合外键保证 profile 归属。
- 仅 waiting 房主能添加/配置 bot，并只能选择本人的可用 profile。改设置清除真人准备；开局共享锁定 profile，在原开局事务内固定模型参与者。
- 进行中禁止修改 bot 设置，活跃 profile 不能编辑/删除；结束后房间保留配置。转让房主后下一局必须重新选择新房主自己的 profile 或改脚本，已开始的对局保留原授权。
- 模型只接收 bot 的身份 View，授权不授予房主读取该 View 的权限；自动动作继续走原命令事务、revision/epoch/lease/去重边界。
- 单行动者模型决策组按 sourceRevision + decisionKey 标识；同时行动扩展保留原跨 revision 键。每组仍最多两次外部尝试，不改游戏规则和已锁定源码摘要。

## Consequences

复用现有模型配置、凭证和调度器，不创建第二套身份或动作通道。一个 profile 可供多个 AI 共用，费用由授权账户承担；授权账户停用将阻止模型 bot 自动动作提交。密钥可撤销，供应商失败保留合法兜底。完整 profile 版本快照、预算和长请求租约仍沿用现有阶段 6 边界。
