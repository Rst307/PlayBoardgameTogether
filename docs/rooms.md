# 房间与游戏大厅

## 2026-10-02 游戏选择入口

大厅先选择游戏卡片，进入后直接显示该游戏的公开房间，列表标题旁放「创建房间」，不需要再次点击加入按钮。创建带入所选游戏，仍可在建房表单调整；版本未启用时明确报错，不自动选择其他版本。公开房间固定按详情游戏 ID 筛选，保留房间类型、状态、分页、密码校验与已有成员进入入口。列表下方提供折叠的邀请码加入与规则，邀请码以邀请实际对应房间为准。首页「继续游戏」直接进入自己参与的房间，旧 `/rooms/new` 继续可访问。未登录访问公开房间区显示登录入口，接口仍要求 session。所有创建/加入仍使用原接口，不改变 receipts、revision、配额、身份或房间状态规则。

第七阶段：waiting 房主可 PUT assets 选择精确已发布兼容 versionId；变更清除真人 ready，专用 AI 保持原就绪规则。归档隐藏新选择但已有 waiting 引用可启动。开局在 room → asset catalog 锁序下固定 match 引用/hash/契约版本，新版本发布不改变已选版本。资源不可读只影响图片/声音，不阻断规则 View 与动作。

房间状态为 `waiting -> in_game -> waiting`，可重复开局；房主关闭或最后成员退出后为 `closed`。创建者自动成为成员、房主并坐 0 号席，初始未准备。成员、座位、连接和 match participant 是独立概念。

邀请码是 12 位 Crockford Base32 共享凭证，有效 24 小时。数据库只存摘要；原码只在创建或刷新该次响应显示。加入不自动入座。房间容量同时限制成员数。

waiting 状态可入座、换座、离座、设定目标 ready、修改配置、转主、退出和开局。座位/成员/游戏规则配置变化清除所有 ready；仅改名不清除准备。主动退出会释放自己的座位；房主退出按 joinedAt、accountId 稳定转移，无人则关闭。断线不会退出、释放座位或转主。

每次实质写入递增 `roomRevision`。客户端命令携带 `expectedRoomRevision`；旧决定返回 `ROOM_CONFIG_CHANGED`，客户端重新加载而不盲目重放。创建、加入、刷新码、房间变更和开局使用 account+operation+requestId receipts，窗口为 7 天。

开局在单个事务内锁房间，校验全部座位和 ready、检查精确游戏版本已安装启用及默认资源清单可解析、记录扩展/内容/资源版本、调用 setup、保存状态和 RNG、固定参与者、更新 activeMatchId。setup 失败全部回滚。阶段 2 对示例资源验证清单、文件存在与 PNG/WAV 头部，不提供资源文件分发或播放。正式 match 只按 session 映射参与者视图，不接受 seat query。

## 2026-09-25 房间改进

创建接口新增 visibility（public/private，旧客户端缺省 private）和可选 password；界面默认公开。历史房间全部保留私人，不自动公开。密码使用 Argon2id 保存，不回传原文或摘要。邀请码加入和大厅加入共用锁、容量、密码、receipt 与 ready 失效逻辑，两条入口共享账户/IP 速率限制。

每个创建者最多拥有一个 status != closed 的房间；配额按不可变 creator_account_id 计算，创建事务使用账户 advisory lock，重复 requestId 优先返回既有结果。转主不会绕过配额；关闭后释放。历史数据没有原创建者，009 迁移以当时房主回填，保留既有多个房间而不擅自关闭；这些账户须先关闭旧房才能创建新房。

GET /rooms/lobby 仅返回公开概要，不返回成员、私密视图、邀请码或密码摘要。可按 gameId、roomType=open/password、status=waiting/in_game/finished/closed 筛选，使用复合游标分页。finished 筛选保留协议兼容；正常结算后的房间回到 waiting，不再长期显示为已结束。

进行中的 match 禁止成员 leave；房主可以 close 强制关闭房间，按 room → match 锁序将 active 对局原子改为 aborted，已结束对局保留原结果。动作与关闭并发串行，关闭后的新动作被拒绝，关闭重试不再次推进 revision。保留 match、参与者和动作历史。关闭成功或收到 room.closed/closed 快照后，房间页和对局页回首页；直接访问已关闭房间也回首页。断线和页面导航不是退出。返回房间时只对本页观察到的 waiting → in_game 转换自动进局；读取已开局快照不再跳走。

正常结束与强制关闭不同：真人或 AI 的最后一步在同一事务内保存 finished 对局、将所属房间恢复 waiting、清空 activeMatchId 并递增 roomRevision，所有真人取消准备，bot 保留自动准备；成员、座位及房主不变。提交后同时广播对局结果与房间快照。结果页继续显示本局结算，返回房间即可重新准备开局；每轮生成独立 matchId，旧结果和动作回执保留。010 迁移修复历史卡在 in_game 的 finished 房间，不修改仍进行中或已关闭的房间。

## 2026-10-02 结算返回

游戏桌页面观察到 active → finished 后自动回到所属未关闭房间，提示本局结束与重新准备，并提供本局结果入口；席位/成员保留和真人取消准备仍由既有服务端结算事务完成。直接查看或刷新历史 finished 对局仍能读取结算，不触发自动回房。房主强制关闭与正常结算分开：关闭仍使在线成员回大厅，正常结算继续下一局。详见 [游戏优先体验](game-first-experience.md)。
