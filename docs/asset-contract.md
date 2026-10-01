# 游戏资源契约

`@boardgame/game-sdk/assets` 提供 `AssetContract`、`PackManifest`、严格 schema、canonicalAssetJson、parseAssetJson、AssetResolverPort 与 PresentationCue。这是独立入口，未改动旧规则摘要覆盖的 SDK index 或 Color Match shared/server 规则文件。

契约由可信游戏包声明，服务端仅在 `apps/api/src/registry` 注册 `assetContracts` 和 `presentation`。Color Match 示例位于 `games/color-match/src/shared/assets.ts`，包含 20 种颜色数字卡面、统一牌背、桌面、摸牌图标、4 个可选声音槽位。契约 hash 为 canonical JSON 的 SHA-256；manifest 精确绑定 id/version/hash/gameId，不存在 latest 或运行时继承。

最小的新游戏契约形状：

```ts
const contract: AssetContract = {
  id: 'example-assets', version: '1.0.0', gameId: 'example-game',
  slots: [
    { key: 'board.main', kind: 'image', required: true, label: '棋盘', aspectRatio: 1 },
    { key: 'sound.place', kind: 'audio', required: false, label: '落子' },
  ],
  cues: [{ id: 'piece.placed', audience: 'projected-public', group: 'piece', priority: 2 }],
};
```

这只是接口示例，不表示第八阶段游戏已经实现。文件映射使用 `{kind:'image',fileId:'平台返回的 UUID'}`；声音映射使用 `{assetKey:'sound.place',gain:0.7,cooldownMs:100}`。上传者不得新增 cue 权限或执行表达式。发布所有必需图片必须齐全，可选音效缺失即静音。

规则对象使用真实 instanceId；可见卡面用 contentId/逻辑 key 查图片，不能把 fileId 当卡牌实例。对手只提供数量并重复渲染统一牌背，DOM/alt/请求不依赖其真实牌面。客户端 `AssetResolver.resolveImage(key)` / `resolveSound(key)` 只解析当前校验过的精确 manifest。图像失败不重试循环，文字和点击区域保持可用。

cue 适配器只接收已 projectEvents 的完整事件批次与接收者 View，不能取得 State。当前公开出牌、通用摸牌、本人回合和结束四种 cue；没有经过隐私验证的其他 cue 不开放。后续游戏在 registry 装配自己的契约/投影适配器，平台不添加游戏 ID 判断分支。
