# 第八阶段交接：使用现有资源与表现接口

本轮只实施第七阶段，未开发 Grid Garden。

新增游戏继续 shared/server/client 分离，规则/合法动作/View 不依赖图包或 AudioContext。复制 `games/color-match/src/shared/assets.ts` 的接口形状声明棋盘/棋子图片槽位和允许的 cue；用新的契约 ID/版本/hash，在 API registry 装配，在客户端 game-registry 装配桌面与固定预览。参见 [资源契约](asset-contract.md) 的最小接口例子。

管理员创建空白包，按契约上传文件和映射，完整展开后发布；也可以复制同契约已发布包。无需另建上传、文件路径解析或播放器。新游戏默认包需安装并标 builtin，房间创建会选择精确版本；图片加载失败也必须能用当前 View 的语义信息继续动作。

图片通过 `AssetResolverPort.resolveImage(key)` 传给游戏桌面。事件由已有服务端 projectEvents 完成权限过滤，再由可信 presentation 适配器产生 cue。秘密同时选择尚未公开时，不发送可推断秘密选择的 cue/时机/文件 key。没有覆盖隐私测试的 cue 不开放。禁止从图包表达式读取 State，禁止游戏直接触发成功声。

平台只消费已同步世代的完整 live revision 批次，eventId+cueIndex 去重并关闭水位；initial、resync 和 HTTP receipt 静默。若第八阶段更改为拆分事件批次，必须同步调整协议与 ADR，不能让多个同 revision 消息被当成完整批次。

运行环境依赖 PostgreSQL、持久资源目录与本地 boardgame-media:1 Docker 校验镜像。备份包含 DB、素材与可信扩展；资源目录不能与测试报告目录共用。真实听音和未测移动设备状态看 [阶段七验收](acceptance-stage-7.md)，不要把自动化 source.start 当成真人已听到。
