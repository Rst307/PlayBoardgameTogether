# 阶段 1 验收记录

环境：Windows，Node 22.17.0，pnpm 11.15.1，Docker Engine 29.5.3，PostgreSQL 17-alpine。日期：2026-09-19。

开发 PostgreSQL 宿主端口使用 5434（容器内 5432），原因是 5433 已被本机另一个项目占用。`playboardgametogether-postgres-1` 验收结束时为 healthy。

## 最终命令结果

- `pnpm install --frozen-lockfile`：通过，8 个 workspace 项目，锁文件无变化。
- `pnpm typecheck`：通过，7 个可编译工作区。
- `pnpm lint`：通过，含客户端/服务端依赖边界检查。
- `pnpm test`：10 个测试文件、16 项测试全部通过。
- `pnpm test:integration`：独立 `boardgame_test` 完成准备、迁移、同步；6 个文件、7 项测试全部通过。
- `pnpm test:e2e`：桌面和 Pixel 5 两个项目共 4 项全部通过。
- `pnpm build`：所有包、API 和 Vite 前端构建通过；产物扫描确认不含开发实验台 UI 标记。

## A01–A17

| ID | 结果 | 证据 |
| --- | --- | --- |
| A01 | 通过 | 按 README 完成冻结安装、起库、迁移、同步、启动和页面访问 |
| A02 | 通过 | 第二次迁移输出 `unchanged 001_initial.sql`，第二次同步输出 `unchanged demo.test-counter@0.1.0` |
| A03 | 通过 | registry 测试覆盖不兼容 SDK 范围与重复扩展拒绝 |
| A04 | 通过 | 固定种子下两个 Viewer 只得到自己的 `myHint`，不暴露 `privateHints` |
| A05 | 通过 | 非当前座位和非法 value 被拒绝，状态/revision 不变 |
| A06 | 通过 | 单元测试及浏览器测试覆盖轮流动作、结束和结束后拒绝 |
| A07 | 通过 | 状态和 RNG 往返一致，非法存档 schema 拒绝 |
| A08 | 通过 | 相同种子与动作序列得到相同状态、事件和 RNG 快照 |
| A09 | 通过 | runner 与真实 Fastify 请求验证旧 revision 返回 409 且无双写 |
| A10 | 通过 | 实际停止项目数据库时 live=200、ready=503、目录及详情=503；重启后首次 ready 轮询恢复 200 |
| A11 | 通过 | WS 测试覆盖 hello、对应 requestId 的 pong、坏消息、频率限制、非法 Origin；关闭钩子清理连接 |
| A12 | 通过 | 两个视口均完成创建→动作→切座位→结束→删除旧局→重开 revision 0 |
| A13 | 通过 | production-switch 测试确认开发 API 404；Vite 生产别名移除实验台，构建后自动扫描 |
| A14 | 通过 | lint 边界脚本禁止 web/client 导入 server/API 模块 |
| A15 | 通过 | 有效资源和音效映射通过，路径穿越、缺失声音引用及越界字段失败 |
| A16 | 通过 | 1440px 桌面及 393px Pixel 5 可操作、无遮挡、无整页横向溢出 |
| A17 | 通过 | runner 测试覆盖 TTL 回收/close；shutdown 测试验证 runner 和数据库池关闭，WS close 清理 idle timer |

## 数据库故障演练

只停止本项目 PostgreSQL 容器后，API 进程继续存活；`/health/live` 返回 200，`/health/ready` 返回 503 且原因为 `database-unavailable`，目录和详情接口均返回 `SERVICE_UNAVAILABLE`。重启同一容器后，ready 恢复为 200，没有修改应用配置或伪造空目录。

## 截图

- `docs/screenshots/stage-1/lab-desktop.png`：1440px 桌面结束态。
- `docs/screenshots/stage-1/lab-mobile.png`：393px 手机结束态。

两张图已人工检查：主要控件无遮挡、文字可读、没有整页横向溢出；手机布局将创建区、棋盘与事件区纵向排列。截图不包含凭据。

## 已知范围边界

阶段 1 不包含账户、房间、正式对局持久化、AI worker、上传后台或音频播放。开发实验台测试座位不是身份认证；内存对局在 API 重启后丢失。浏览器手机视口只验证布局和操作，不代表真实手机音频兼容性验收。
