# 资源与音效契约

2026-09-25 第七阶段实际实现采用新的独立契约入口，上传短音效上限收紧为 10 秒，并实际解码。本文下方阶段 1 约束仅为历史；当前指南见 [资源](assets.md)、[资源契约](asset-contract.md)、[音频](audio.md) 与 [验收](acceptance-stage-7.md)。

资源 manifest 使用稳定逻辑 ID，文件仅允许相对路径，不允许绝对路径和 `..`。支持 PNG/JPEG/WebP 与 MP3/WAV；图片尺寸、音频时长和字段均有界。阶段 1 的 schema 声明短音效最多 15 秒，尚未读取字节验证编码。

声音映射为 `eventType -> {soundId, channel, gain, cooldownMs, priority, maxConcurrent}`，并验证 soundId 存在。规则只产生事件，不直接播放声音。`AudioPort` 与 `StorageAdapter` 只定义职责，没有伪成功实现。`games/test-counter/assets` 含由 `scripts/generate-demo-assets.mjs` 生成的 1×1 PNG 与 100ms 静音 WAV；注册扩展时验证文件存在及格式头部，不作完整媒体解码。

瞬时声音只来自按身份过滤后的 live 事件；snapshot/catch-up 不播放。上传、实际解码、AudioManager、静音/多标签页/后台策略在阶段 7 实现。
