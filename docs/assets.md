# 图片与短音效资源

第七阶段实现入口是 `/admin/assets`，仅 `administrator` 可使用；登录玩家可读取发布及归档资源，草稿仅管理员可读。素材本身不是秘密手牌，真实归属仍由 View 和事件投影保护。

## 安装与存储

```powershell
docker build -t boardgame-media:1 scripts/media
pnpm db:migrate
pnpm assets:seed
pnpm assets:check
```

媒体校验使用本机 Docker 中的短生命周期 FFmpeg 进程，不是常驻服务。容器使用 uid/gid 65534、只读根目录、无网络、无宿主挂载、cap-drop ALL、no-new-privileges、192 MiB 内存（禁额外 swap）、单 CPU、32 PID、8 MiB tmpfs；内部 timeout 8 秒，API 外部 15 秒超时。只有 stdin/stdout 媒体字节，解码器协议白名单只允许 pipe，无 shell 拼接、不接受用户路径。Docker/镜像不可用时上传明确失败，不回退到无隔离处理；既有文件读取与游戏动作不依赖媒体容器。

默认开发资源根为项目 `.data/assets`，测试根为 `.data/test-assets`，不放在 Playwright 会清空的 test-results 内。可设置绝对路径 `ASSET_STORAGE_DIR` / `TEST_ASSET_STORAGE_DIR`。测试和开发目录必须不同。生产将独立资源目录挂载持久卷，目录只授权 API 系统账户读写，不让上传者或其他服务创建符号链接。物理 key 为最终内容 SHA-256 与规范扩展名，原文件名仅管理展示。

备份必须同时包含数据库、资源根目录、对应可信游戏源码/安装版本和 `boardgame-media:1` 镜像摘要。恢复后先执行只读 `pnpm assets:check`，检查 unreadable/mismatched/orphans，再启用新上传。磁盘空间由运维监控；单包 100 MiB，200 文件；图片 8 MiB/4096 单边/1600 万像素，音频 5 MiB/10 秒/双声道。manifest 256 KiB。PNG/JPEG/WebP 规范化为 PNG；MP3/PCM WAV 规范化为 24 kHz PCM WAV。动画、SVG、HTML、外链、压缩包一律拒绝。

`pnpm assets:check` 输出 JSON 元数据清单、缺失/错误 hash/孤儿，不删除。显式 `pnpm assets:check --gc` 标记无引用文件 tombstone，至少 24 小时后复查引用并删除；孤儿也至少保留 24 小时。删除失败可重试。共享内容只在其他有效文件记录也不使用它时删除。草稿和已发布清单的文件引用都受保护；本阶段没有 CDN、S3 实现或完整异地灾备演练。

## 管理流程

创建草稿（可复制已发布/归档包的完整文件映射）→逐文件上传/处理→按契约选择文件→保存映射→校验→固定预览→发布。预览显著标记演示，不读取真实对局。音频只有点击试听才播放，预览音量与正式对局独立。

上传前校验角色/Origin/CSRF、限流、声明长度/hash 并预留配额；正文仍由 Fastify 有界接收。每个文件有 staged/processing/validated/failed 状态；单个失败不清空其他成功文件。相同 requestId 必须绑定相同原名/MIME/字节长度/hash；重复返回同一文件，失败后修复内容用新 requestId。取消只表示客户端停止等待，服务端可能已经完成，重新读取文件列表确定状态。超两分钟未结束的上传由启动及每分钟恢复扫描标失败，不能当成有效素材。

表单和 JSON 使用相同 schema。JSON 导入拒绝重复键（包括转义后相同键）、危险键、过深嵌套、未知字段、路径/URL 文件引用。编辑增加 revision，旧 hash/校验/预览失效。发布使用 requestId、expectedDraftRevision、contentHash，再检查媒体和契约；已发布版本清单有数据库不可变触发器，不能覆盖。文件系统与数据库不是跨存储原子事务，DB 失败留下的孤儿由完整性检查/延迟 GC 处理。

归档隐藏新选择，但 waiting 房间的既有选择仍可开局。任何保留对局（active/finished/aborted）或未关闭房间引用都阻止删除版本；内置包不可删除/归档。删除草稿只移除草稿引用，不删除已发布版本。界面显示引用总数和原因，不暴露私密对局。

## 默认包和旧局

2026-10-02 璀璨宝石增加 splendor-assets@1.0.0 契约，默认原创 SVG 与用户提供的 TTS 经典卡面两个版本。pnpm assets:seed 安装原创版本；存在本地准备目录 .data/extracted-assets/splendor-tts-platform/files.json 时再按现有上传、隔离媒体校验、发布链路安装完整 109 槽 TTS 版本。缺素材的新环境只安装原创，不自动下载。原图与准备文件不提交仓库，安装与恢复见 [璀璨宝石](games/splendor.md)。首次发布前须将图片缩至网页适用尺寸，以满足原有 100 MiB 总配额；不增加配额或放宽媒体校验。旧璀璨宝石空绑定仍保留原始摘要和 SVG。

新房默认安装的 `color-match.classic@1.0.0`，可选明显不同的 `color-match.paper@1.0.0`；两者由 `scripts/seed-assets.ts` 原创生成 PNG/WAV，许可见游戏 assets/NOTICE.md。内置文件丢失时 seed 仅在重新生成后最终 hash 与保存值相同才补回；不同解码器版本生成不同字节时拒绝，要求恢复备份。

旧 `color-match.default@1.0.0` 的实际 manifest 是空数组，CSS 是历史真实表现。011 迁移保留旧对局 resource_digest 和空 asset_version_id，不伪造新图片摘要、不改变 State/RNG/revision/控制/预算/回执。新图片包使用新 ID，不覆盖旧版本。

房主 waiting 更换精确 versionId 会取消真人准备并广播 roomRevision；新发布版本不会改变任何既有选择。开局同事务锁定 versionId/manifestHash/contractVersion。资源读取失败时保留真实绑定，展示语义文字、合法按钮；不静默换包。文件服务始终先鉴权再处理 ETag，使用 private 缓存、nosniff 和正确 MIME。
