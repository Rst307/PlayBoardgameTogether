# 客户端 SDK

## 游戏接入申请

登录后调用 `api.submitGame({ requestId, gameId, version, name, description, repositoryUrl })` 提交纯资料申请；`api.gameSubmissions(before?)`、`api.gameSubmission(id)` 读取本人申请。管理员使用 `adminGameSubmissions(before?)`、`adminGameSubmission(id)`、`reviewGameSubmission(id, { requestId, expectedRevision, status, reviewNote })`。所有这些方法在边界校验请求与响应，不接受任意泛型断言。reviewed 只表示资料审阅，不能安装或执行游戏；字段、配额和示例见 [添加游戏](/developer-docs/add-game.md)。

包：@boardgame/client-sdk，当前版本 0.1.0。ApiClient 默认基址 /api/v1，使用同源 cookie；登录或 me 响应中的 CSRF token 会用于后续写请求。ApiError 提供 code、message、retryable、traceId。

## 登录与创建房间

```typescript
import { ApiClient, ApiError } from '@boardgame/client-sdk';

const api = new ApiClient();
// username/password 来自用户输入，不硬编码或写入日志。
await api.login<unknown>(username, password);
// 页面刷新后先恢复 session 和 CSRF：
await api.me<unknown>();
const created = await api.createConfiguredRoom({
  requestId: crypto.randomUUID(),
  name: '开发者测试房间',
  gameId: 'color-match',
  version: '1.0.0',
  options: {},
  seatCount: 2,
  visibility: 'private',
});
// created.roomId 可用于继续读取房间。
// created.inviteCode 只按一次性显示语义提供给用户，不能写入日志。
```

示例要求已有账户、数据库已安装对应游戏，账户未超过建房配额。正式流程不提供公开注册接口，账户通过管理员命令创建。

## 优先使用解析响应的方法

| 方法 | 用途 |
| --- | --- |
| createConfiguredRoom(input) | 共享 schema 校验的建房请求和结果 |
| lobby(query) | 公开房间分页，仍需要登录 |
| gamePresentations() | 无需登录读取 schema 解析后的游戏展示配置 |
| saveGamePresentation(id, version, input) | 管理员保存图标/封面/背景地址，使用 expectedRevision 防止覆盖他人修改 |
| joinPublicRoom(id, input) | 加入公开房 |
| gameRules(id, version) | 精确游戏版本规则说明 |
| matchSnapshot(id) | 解析本人权威快照 |
| submitMatchAction(id, body) | 提交动作并解析结果 |
| matchCommandReceipt(id, requestId) | 查询本人的动作回执 |
| setMyController(id, body) | 主动模型托管或收回 |
| profile() / saveProfile(input) / matchHistory(before) | 本人资料与参与历史 |
| modelProfiles() 与模型配置方法 | 管理本人模型设置与凭证 |
| assets | AssetClient 资源管理与读取 |

现有 login、me、rooms、room、roomCommand、games 等仍有泛型接口；调用泛型不会自动验证返回数据。外部数据先视为 unknown，使用共享或游戏 schema 解析，不用任意类型断言伪造安全。

## 提交正式动作

```typescript
const snapshot = await api.matchSnapshot(matchId);
const command = {
  requestId: crypto.randomUUID(),
  expectedRevision: snapshot.revision,
  expectedControllerEpoch: snapshot.controller.controllerEpoch,
  action: { type: 'draw_card' },
};
try {
  const result = await api.submitMatchAction(matchId, command);
  // 仅按版本合并 result，不能让旧重试响应覆盖更新快照。
} catch (error) {
  if (error instanceof ApiError) {
    // 根据 error.code 展示反馈，traceId 用于定位，不记录秘密输入。
  }
  throw error;
}
```

draw_card 是 Color Match 示例，不是通用游戏动作；必须在本人当前 View 允许摸牌时调用，服务端仍会验证。业务动作体不传 seatId 或 automation 标记。

## 超时与重试

动作超时可能已经提交。保存原 command，暂停新动作，先查 matchCommandReceipt；accepted 表示已提交，应拉取最新快照。not_found 仍可能有执行中的事务，需要以原 requestId 和完全相同内容重试，不能生成新 ID 再次执行同一决定。

STATE_CONFLICT、ROOM_CONFIG_CHANGED 和 CONTROLLER_CONFLICT 需要刷新权威数据并重新决定。retryable=true 不代表可以盲目重放过期决定。会话失效应重新登录。源码提供请求能力，应用仍需管理连接、订阅、待确认动作和生命周期。

SDK 的 credentials=same-origin 面向同源浏览器应用；自定义 base 不代表任意跨域应用已获准访问。服务端的 Origin、cookie 和 CSRF 约束继续生效。
