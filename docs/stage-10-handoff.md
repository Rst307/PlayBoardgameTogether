# 第十阶段交接

第九阶段完善了现有平台外壳与两游戏客户端；正式规则、协议、迁移、状态、RNG、资源及版本摘要没有改写。客户端资源/声音/AI 控制仍使用原服务。

先读取 README、progress、acceptance-stage-9、architecture 与各阶段未验证项。阶段 10 负责部署、持久卷、备份恢复、健康与基础负载及发布验收；本轮没有公网部署或发布授权。

本地启动继续按 README：现有 PostgreSQL、db:migrate、games:sync、已安装媒体镜像、assets:seed、pnpm dev。生产先 pnpm build，再运行编译 API。资源目录、数据库与可信源码必须同时保留；构建源码摘要依赖和单 API presence/广播限制仍有效。

开发 `/dev/ui` 由双开发开关限制且从生产产物排除，不作为部署首页或真实数据 API。公共视觉和交互维护入口见 ui-development.md。关闭/结束语义、未知回执恢复、本人 View、AI epoch 和音效 live 去重不能随部署调整而退化。

前序仍缺少真实供应商连续整局、部分模型预算/长租约/重启矩阵、Grid Garden 部分调度并发专项、多副本容量、真实 iOS/Android 与物理听音证据；第九阶段模拟 UI/脚本/mock 不覆盖这些缺口。不能把本阶段界面验收宣称为生产高可用、全部前序验收通过或灾备完成。

当前工作目录无 .git；未初始化、创建远程或猜测 GitHub 地址。若要同步本轮工作，请先恢复正确仓库元数据与远程，检查用户已有改动并仅提交本轮文件，不包含 .env、凭据、测试会话、dist、node_modules 或运行日志。
