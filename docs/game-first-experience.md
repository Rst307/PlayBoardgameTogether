# 游戏优先的界面与结算返回

2026-10-02：MatchPage 只根据身份化 MatchView 的状态转换决定导航，不读取秘密状态、不增加游戏 ID 分支。当前页面从 active 观察到 finished 时停止旧页面写回、清理待确认记录，并用 replace 导航回 roomId 对应房间；本局 ID 通过 history.state 提供结果入口，不携带身份凭据。历史结果初次读取为 finished 时保留查看。房主关闭仍回大厅，已中止历史仍只读查看。

宽屏游戏桌占主要空间，平台导航收为顶栏。规则、声音、托管和座位控制状态在旁边，手机与平板在下方。返回房间明确说明不会退出对局。保存中、保存成功、连接恢复和错误有文字反馈；pending 或离线时暂停新动作和控制切换，继续使用既有回执确认和 revision 冲突恢复机制。

房间保留席位并取消真人准备的服务端事务逻辑未变。返回房间显示本局结束与重新准备提示，查看本局结果仍走原授权接口。样式入口为 apps/web/src/styles/usability.css，业务入口为 apps/web/src/pages/MatchPage.tsx、RoomPage.tsx。
