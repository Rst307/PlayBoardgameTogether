# 璀璨宝石 TTS 图包提取

2026-10-02 从用户提供的 Workshop 存档 `2023213924.json`（Splendor - Scripted）和已有 TTS 图片缓存提取本地素材。仅解析 JSON，不执行模组 Lua、访问远程 URL 或修改 TTS 文件。

## 本轮输出

本地目录 `.data/extracted-assets/splendor-tts-2023213924/`，压缩包为同级 `splendor-tts-2023213924.zip`，约 95.04 MiB。

- `cards/tier-1`、`tier-2`、`tier-3`：分别 40、30、20 张单独 PNG 卡面。
- `nobles/`：10 张贵族原图。
- `backs/`：3 种发展卡牌背和 1 种贵族背面。
- `tokens/`：6 种筹码的原始 3D 模型 UV 纹理，不能直接当作平面筹码图标。
- `originals/`：29 张存档引用的缓存原图，包含图集、牌背、贵族和筹码纹理；保留原始字节。
- `manifest.json`：来源 URL、原图 SHA-256、尺寸，以及每张卡的 TTS CardID、等级、网格位置和裁切坐标。
- `cards-preview.jpg`、`nobles-preview.jpg`：按 TTS 编号标注的图包预览。

TTS 发展卡图集为 10 × 7 网格；通过 `CardID // 100` 选择图集，`CardID % 100` 定位从左到右、从上到下的格子，仅提取牌堆实际引用的 90 格，不包含黑色空格或最后一格保留牌背。非整数格高使用四舍五入的相邻边界，裁切不额外缩放。卡面文件名保留 CardID，贵族文件名保留 GUID，不能直接作为本项目 `card.*` 和 `noble.*` 的映射。

## 复现

需要 Python 3 和 Pillow。输出目录必须不存在，脚本拒绝覆盖已有提取。缓存默认位于存档上两级目录的 `Images`，也可使用 `--cache` 指定。

```powershell
python scripts/extract-tts-splendor.py `
  'D:/Program Files (x86)/Steam/steamapps/common/Tabletop Simulator/Tabletop Simulator_Data/Mods/Workshop/2023213924.json' `
  '.data/extracted-assets/splendor-tts-2023213924'
```

缺失或无法解码的缓存图片明确报错；不自动下载。识别 Steam 缓存重写旧 cloud 主机的命名，按完整 UGC 路径匹配。

本轮实际执行上述提取，核对 40/30/20 张与 CardID 唯一性、10 张贵族、6 种纹理、4 种牌背，验证所有输出图片可解码、29 张原图哈希、ZIP 全部 CRC（151 项），并实际查看卡牌和贵族预览。初次生成预览遇到本机旧版 Pillow 缺少 `ImageOps.contain`，改为兼容的 `thumbnail` 后重新生成并验证成功。未变更平台运行时代码，因此未重复运行平台业务测试或构建。

图片和 ZIP 位于已忽略的 `.data/`，只留本地，不提交至 GitHub。版本控制仅保存提取脚本与说明。素材来源是用户提供的 TTS 模组，不将其称为发行商提供或授权的官方图包。本轮未接入或发布平台图包；后续需核对各卡牌数值与游戏 ID，并接入璀璨宝石资源契约。
