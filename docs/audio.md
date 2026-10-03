# 音频、去重与恢复

应用唯一正式 AudioManager 位于 `apps/web/src/assets/audio-manager.ts`，游戏不自行 new Audio；管理员预览单独生命周期实例，音量和事件源隔离。旧独立开局提示不再在准备/导航时自动播放。

2026-10-03 新增可选客户端 `PresentationAudioPort(eventId, cueId, key)`：可信游戏在 clientGames 注册 `boardAudio: true`，由桌面动画决定播放时点，仍委托唯一 AudioManager。MatchPage 仅在 PresentationConsumer 接受 WS live 批次，且声音已解锁、未静音、页面可见并持有 owner 时授权事件。BoardAudio 有界保留 100 个事件、每事件最多 256 个节拍键，逐 eventId/cueId/key 去重，绑定 AudioManager playbackEpoch；任何 invalidate 都使未播放节拍失效。资源仍按本局清单和契约解析，不修改网络 cue schema。花砖物语复用原三个 cue，覆盖选砖/移砖、逐项得分/奖励及动画结束后的胜利；其他游戏继续立即消费 live cues。

游戏声音只来自已提交、按身份 projectEvents 后的 WS live 完整 revision 批次。HTTP 动作确认（含重复 receipt）永不播放。可信扩展生成 `cues:[{eventId,cueIndex,cueId}]`，资源包仅声明映射。Color Match 摸牌只用通用声，不按私密牌面选择音色；turn.started 仅给当前本人。

客户端 PresentationConsumer 建立权威快照 revision 水位后消费；同批每个 eventId/cueIndex 均可播放，关闭 revision 水位后任何重复、迟到老批次都拒绝，不保存无限事件集合。断线/重连/后台/主控切换停止声音和旧异步操作，恢复先拉快照建立新基线。允许少播，不以音效补偿为由重放动作。详见 ADR-003。

Web Locks 以同账户+matchId 为键选举一个可见标签页 owner。拿到锁先重新同步；隐藏/离开释放。无 Web Locks 浏览器自动游戏声保守停用，页面明确告知，保留点击测试声。没有声称不支持协调机制的浏览器也能全局唯一播放。

只有用户点击“启用声音 / 测试声音”才创建并 resume AudioContext。默认 game=0.5、ui=0.3；总静音立即停止当前音源，滑块影响当前和后续音源。偏好以 accountId 命名空间保存 localStorage，仅保存 muted/game/ui，不存凭据、手牌或完整 View。退出/会话失效/卸载对局释放音源与缓存。预览设置不覆盖对局偏好。

未解锁、静音、后台、没有 owner、重复、冷却/并发抑制的事件均算已消费，不排队。音频加载至实际播放最多等待 1 秒，超时或 generation 改变丢弃；播放拒绝与解码失败不影响动作。缓存上限 16 MiB 解码数据，LRU 回收；全局 8 音源，每组 2，冷却至少 80 ms，高优先级提示可淘汰低优先级声音，不循环音乐。

测试层次：受控 AudioContext 单测验证时间、取消、音量和并发；真实 Chromium 桌面/Pixel 5 仿真 E2E 保留真实解码与 source.start，记录调用次数并检查重复/刷新/静音。自动化不能证明物理扬声器可听。G47 必须另做人工听音；iOS/Android 实机未测不能用设备仿真冒充。

人工步骤：两账户进入同局，各自点击测试声音确认可听；行动一次确认通用出牌/摸牌与本人回合声；静音动作、取消静音，确认没有积压；刷新再启用确认无历史；切后台/多标签只一页发声；返回房间应停止声音。记录浏览器版本、音频设备及通过/失败。
