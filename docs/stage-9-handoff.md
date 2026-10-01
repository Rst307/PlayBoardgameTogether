# 第九阶段交接：界面完善边界

第八阶段固定了两个可运行游戏的规则和公开契约。第九阶段可改善平台外壳、响应式布局、状态提示、可访问性与视觉一致性，但不得把 UI 改造成规则权威来源。

必须保留的验收场景：Color Match 与 Grid Garden 开局；自己行动；多个等待者；秘密已提交但未公开；横/竖落子预览与非法位置；revision 冲突；离线/恢复；AI 思考与 fallback；并列结束。

Grid Garden 的客户端只依赖 `GardenView`、平台 `onAction` 和 `AssetResolverPort`。可以调整布局、折叠其他棋盘和动画，但不能导入 `server`、完整 State、内部 choice 或数据库类型。选择与落子的最终合法性仍在服务端；冲突后必须重新确认，不能静默自动重提。

成功音效仍只能来自投影后的 live 事件，经 presentation cue 与 AudioManager 播放。initial/resync/HTTP receipt 不补播；静音、后台、多标签 owner 和资源缺失都不能阻断操作。不得因视觉重做新增 Grid Garden 专用上传、播放器或权限分支。

