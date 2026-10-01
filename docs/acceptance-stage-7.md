# 第七阶段验收记录

日期：2026-09-25。已交付资源管理、真实媒体处理、两套图片/声音包与正式对局接入；**不宣称 G01–G48 全部完成验收**。G47 人工听音待确认，以下部分故障/边界场景尚未单独注入。

## 环境与证据

Windows、PostgreSQL 独立 `boardgame_test`、`.data/test-assets` 持久目录；测试准备脚本检查与开发库隔离。Chromium 桌面与 Pixel 5 仿真，不代表 Android/iOS 实机。FFmpeg 7.1.5 在 `boardgame-media:1` 无网络、无宿主挂载、非 root、有内存/CPU/PID/时间上限的容器中解码；格式转换测试的可信样本使用宿主 FFmpeg 7.1 生成。

- `pnpm typecheck`、`pnpm lint`：通过。
- `pnpm test`：21 文件、106 项通过，无跳过。
- `pnpm test:integration`：11 文件、66 项通过；最后两处修正（校验开始更新时间、检查命令只读）之后全量 `pnpm test` 再次覆盖全部集成。
- `pnpm build`：通过，包含生产 bundle 开发代码排除与编译后 API runtime 检查。主 chunk 572.72 kB，仍有 Vite 体积提示。
- `pnpm test:e2e`：桌面与 Pixel 5 共 26 项全部通过（2.9 分钟），包含阶段七 4 项。已检查两种视口的 paper 桌面截图及管理员预览；图片/文字/牌背呈现正常，手机手牌局部滚动，无整页横向溢出。
- 开发库 `pnpm db:migrate` 应用 011/012，`pnpm assets:seed` 安装 classic/paper，`pnpm assets:check` 的 unreadable/mismatched/orphans 均为空，54 个 validated 文件；未清理开发数据。

证据缩写：U = `tests/unit/stage7-assets.test.ts`；A = `tests/unit/stage7-audio.test.ts`；I = `tests/integration/stage7-assets.test.ts`；E = `tests/e2e/stage7-assets.spec.ts`。标记“部分”的项目已有实现/部分证据，但缺少列明的专项验证，不能视为完全通过。

## G01–G48

| ID | 状态 | 证据与边界 |
| --- | --- | --- |
| G01 | 部分 | I 实测非管理员上传和读管理页拒绝、CSRF 拒绝；发布/删除共用管理员 guard，未逐端点越权注入 |
| G02 | 通过 | I 同草稿真实上传成功/失败并存；E 上传映射发布 |
| G03 | 通过 | U 真实 PNG/JPEG/WebP/MP3/WAV、损坏数据、伪 MIME、SVG 与动画拒绝 |
| G04 | 部分 | U 超字节/像素/时长拒绝；200 文件/100 MiB 包配额已实现，未单独压到边界；未做峰值内存压测 |
| G05 | 部分 | U 严格 schema 拒绝外链/执行字段；存储 key 白名单与 realpath/lstat 检查、解码容器无网络；未独立 symlink 夹具验证 |
| G06 | 通过 | I 原 requestId 返回同文件、不同内容冲突 |
| G07 | 部分 | I 必需槽缺失定位错误，契约校验实现类型检查；未逐类错误映射注入 |
| G08 | 通过 | I 清空可选 sounds 后校验 ready |
| G09 | 通过 | U 普通/转义重复键、危险键、过深/尾随 JSON 拒绝 |
| G10 | 通过 | I 编辑清空 hash/报告并要求重新校验 |
| G11 | 通过 | I 独立连接资源锁屏障下编辑/发布仅一方成功 |
| G12 | 部分 | I 重复发布 receipt 恢复、同 requestId 不同 hash 冲突、DB 不可变触发器；同 pack/version 不同草稿的专项冲突未独立注入 |
| G13 | 部分 | I 发布写引用故障回滚无半版本；上传字节写完后 DB 失败的准确窗口未注入 |
| G14 | 部分 | I 原请求恢复同 versionId；未强杀发布 API 制造提交后丢响应 |
| G15 | 通过 | E 固定预览，源码只使用 demo 数据；点击试听独立播放器 |
| G16 | 通过 | I 非管理员读取草稿管理入口拒绝、已知草稿 fileId 返回 404 |
| G17 | 通过 | I 改包取消真人 ready；E 房主选择 paper 并由另一账户进入同局 |
| G18 | 部分 | I 非成员更改拒绝；服务校验房主/契约，未独立成员非房主及不兼容包用例 |
| G19 | 部分 | I 开局返回精确 binding；E 刷新保持 paper；未针对新绑定做 API 子进程强杀恢复 |
| G20 | 通过 | I 发布其他版本不改变已有 State/RNG/revision；版本引用无 latest 解析 |
| G21 | 通过 | I 归档不出现在可选列表，已选择的 waiting 房间仍成功开局并读取素材 |
| G22 | 通过 | I waiting/finished/aborted 引用均阻止删除 |
| G23 | 部分 | I 删除/复制并发有屏障；开局与删除共享资源锁，尚无此二者专项并发屏障用例 |
| G24 | 部分 | I 实际删除失败后 tombstone 重试成功，共享受引用文件可读；未做 GC 进程 OS 强杀 |
| G25 | 通过 | 原创 classic/paper 不同 PNG/WAV；Color Match 完整 E2E 使用默认包，E 使用 paper；规则源码保持原摘要 |
| G26 | 部分 | 私密 View 原有集成隔离测试、桌面按 handCounts 只渲染统一背面；尚未穷举所有网络/预加载缓存观察面 |
| G27 | 部分 | E 文件请求失败保留语义手牌和按钮；资源故障不参与规则恢复校验；整包损坏后完整终局未专项演练 |
| G28 | 通过 | E 桌面/Pixel 5 截图及 scrollWidth 检查，图片固定比例、手牌局部滚动 |
| G29 | 部分 | 原规则/AI 上下文不依赖资源，全量真人/脚本/mock 回归；未额外录制换包前后逐字 AI 输入对比 |
| G30 | 通过 | U 已投影公共动作只生成通用声，本人 turn cue 按身份限制，不读取秘密牌色 |
| G31 | 部分 | E 真 AudioContext 解码及 source.start 次数；实际扬声器听音见 G47 |
| G32 | 通过 | 正式游戏声仅 WS live；HTTP/点击链路不调用成功声，U 消费器与 E 提交流程覆盖 |
| G33 | 通过 | U 重复/迟到 revision 拒绝；E 重发同 WS 不增加 source.start |
| G34 | 通过 | U 同完整 revision 批次多个合法 cue 均被消费一次 |
| G35 | 通过 | E 刷新、离线恢复无历史播放；initial/resync 仅建立水位 |
| G36 | 通过 | A 未启用/静音丢弃与 generation；E 静音动作后解除不补播 |
| G37 | 通过 | A 延迟超过一秒或 generation 改变后不播放 |
| G38 | 通过 | A 当前音源音量/静音与账户偏好恢复；E 页面控制 |
| G39 | 部分 | E 同账户两个页面共享锁总播放次数唯一；后台丢弃有 A/生命周期实现，真实窗口前后台听音未测 |
| G40 | 通过 | A 全局/组并发、冷却与抑制不积压 |
| G41 | 通过 | A 解码失败/不可播放安全返回，E 网络断开不阻断视图 |
| G42 | 部分 | A invalidate 清理音源与旧异步回调；组件 cleanup 释放订阅/锁/缓存，未做浏览器堆快照泄漏检测 |
| G43 | 通过 | I private/nosniff，已知 ETag 未认证仍返回 401 |
| G44 | 部分 | I 新建 service/storage 实例可读同磁盘字节，多次 E2E API 启动复用资源目录；未做整机断电/持久卷迁移演练 |
| G45 | 部分 | 011/012 保留旧空默认包/旧 digest 与空 binding，既有阶段 2–6 回归通过；未构造每一种第六阶段历史行迁移夹具 |
| G46 | 通过 | `games/color-match/assets/NOTICE.md` 原创程序图形/合成声音，seed 可重现并检查 hash |
| G47 | 阻塞 | 尚无人工实际听音结论；iOS/Android 实机、WebKit 未测，Chromium 设备仿真不能替代 |
| G48 | 通过 | 全量 106 项、独立集成 66 项、生产构建；完整浏览器结果补充如下 |

## 故障记录与剩余工作

首次 E2E 曾因素材位于会被 Playwright 清空的 test-results 失败；现分离为 `.data/test-assets`，内置包修复只能写回与已存 hash 相同的字节。一次全量测试暴露旧 stage5 测试在 AI 扫描尚运行时 TRUNCATE 的死锁；用例先关闭 app、独立连接清理、再启动，随后全量 106 项通过，未修改生产 AI 逻辑或扩大超时。完整 E2E 首轮 24/26 通过，两个旧阶段二用例要求初始进入对局自动播放两声；按阶段七契约改为断言零次自动声，最终完整 26/26 通过，未跳过用例。

截图位于 `test-results/stage7-assets-locked-image-4c640--live-delivery-and-recovery-desktop/` 与对应 `-mobile/` 的 `paper-table.png`、`semantic-fallback.png`，管理员截图在 `test-results/stage7-assets-administrato-0ab37-s-and-publishes-a-real-pack-desktop/` 与对应 `-mobile/` 的 `admin-preview.png`。test-results 是测试产物，后续 E2E 会覆盖，不作为资源持久目录或 Git 提交内容。

G47 人工步骤见 [音频文档](audio.md)。需记录浏览器版本和实际设备，确认测试声、行动声、静音立即停止、取消静音/刷新/重连不补播、多标签仅一页发声。其余部分验证项按本表补充证据，不能用代码审查替代故障注入。

当前目录无 `.git`，`git status --short` 与 `git remote -v` 均报 not a git repository；无本地提交、无推送，未初始化或猜测远程。需提供带 Git 元数据的仓库或连接信息后同步。阶段六真实供应商/预算/lease 既有缺口未在本阶段解决；本轮未调用付费模型、未开发 Grid Garden、未公网部署。
