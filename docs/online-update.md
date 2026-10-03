# 生产服务在线更新

使用 `pnpm start:online` 替代分别启动 API 与静态站点。首次部署仍需 `pnpm install --frozen-lockfile`、`pnpm db:migrate`、`pnpm games:sync`、`pnpm assets:seed`、`pnpm build`。更新监督进程默认监听 `127.0.0.1:8080`，同时托管生产 Web 和转发 HTTP/WS 到私有 `127.0.0.1:3001` API。原 API 服务需先停掉；让现有 HTTPS 反向代理转发到 8080 并保留 Host、Origin、WebSocket Upgrade。WEB_ORIGIN 必须填写用户实际访问的同源地址，HTTPS 设置 COOKIE_SECURE=true。由已有 Windows 服务管理器或 systemd 托管此长驻命令，监督进程不能代替操作系统开机启动服务。

首次启动使用本地已构建版本，之后每五分钟检查 origin。默认跟踪启动目录当前分支，本项目当前为 `codex/splendor`；生产应明确配置经过审查的发布分支。这里“最新版”指该分支最新提交，不是 GitHub Release 或自动切到 main。只接受无内嵌凭据的 GitHub HTTPS/SSH origin，将拉取转换为 HTTPS；私人仓库需通过 Git credential helper 提供只读凭据，禁止把 token 写在 URL。SSH-only 私有凭据需另配 HTTPS helper。

```dotenv
# 加入现有 .env，勿覆盖其他配置
UPDATE_BRANCH=codex/splendor
UPDATE_PORT=8080
UPDATE_HOST=127.0.0.1
UPDATE_INTERVAL_MS=300000
UPDATE_QUIET_MS=60000
UPDATE_ALLOW_MIGRATIONS=false
UPDATE_ENABLED=true
```

UPDATE_ENABLED=false 可暂时停用 GitHub 检测，仍使用同一个生产启动入口。UPDATE_STATE_DIR 可指定独立、私有的更新缓存绝对目录，默认 `.data/updates`；保留该目录以便重启恢复，不放在公开静态路径。

## 与 Linux 一键部署配合

工作区的 `deploy.sh` 默认仍启动单独 API 并由 Caddy 镜像提供静态页面，不会自动启用此监督进程。使用该方式部署时，在已完成首次部署的服务器上为 `boardgame-production.service` 添加用户级 drop-in：清空原 ExecStart，改为绝对 Node 路径执行 `scripts/online-update.mjs`，保留原 WorkingDirectory、PATH 和指向 `.data/deploy/production.env` 的 EnvironmentFile（其中 API_PORT=3301 与真实 HTTPS WEB_ORIGIN 保持原值）。配置更新项可放入该 EnvironmentFile；直接由 systemd 加载环境无需项目根 `.env`。Windows 直接启动 Node 时需 UPDATE_PNPM_CLI 指向实际 pnpm JS 入口，普通 `pnpm start:online` 无需此项。

Caddy 的全部路径须转发至监督进程 `127.0.0.1:8080`，而不是仍由旧镜像 `/srv` 提供 HTML：保留域名和 encode，使用统一 reverse_proxy 127.0.0.1:8080，然后按部署流程重建网站镜像并重载服务。否则只有 API 更新而前端仍停在旧镜像。后续不兼容版本仍走停服备份维护流程；监督进程独立目录构建不会自动调用 deploy.sh 或重建 Caddy。未在本轮 Windows 环境中安装 systemd drop-in、改动现有 Caddy 配置或部署公网服务器。

后台在 `.data/updates` 私有 Git 缓存拉取并以完整 commit SHA 创建独立版本目录，执行冻结依赖安装及项目完整生产构建。不会 git pull/reset 主工作区或覆盖用户修改、.env。子进程继承启动时加载的环境，所有版本复用绝对 ASSET_STORAGE_DIR 和同一个数据库。先构建成功再申请排空：公共 API 静默一分钟、没有未完成对局、没有 WebSocket 连接且没有正在处理的请求时才切换。先封闭新请求，再检查事务相关状态，防止开局与空闲检测竞态；条件不满足马上恢复旧服务，等待下次检查。

成功排空后通过父子 IPC 优雅关闭 API（支持 Windows），运行既有迁移/游戏同步，启动候选并检查它本人的启动 IPC 和 `/health/ready`，通过后才原子保存 current.json 和切换静态目录。失败尝试恢复原 API 和静态目录。旧资源目录保留，已打开页面的哈希 JS/CSS 懒加载继续可用，HTML 不长期缓存；不自动刷新玩家页面、不加更新弹窗。切换期间请求可能得到带 Retry-After 的 503；单进程架构不能承诺零中断，频繁访问、长期开着房间或未结束对局可一直延后升级。没有 API 多副本或数据库自动降级。

默认遇到迁移文件变化只准备构建、记录待维护，不自动修改数据库。管理员确认兼容性并备份数据库及资源后，可设置 UPDATE_ALLOW_MIGRATIONS=true 并重启监督进程以允许自动执行。数据库迁移按现有脚本逐文件提交，失败前已提交的文件不会撤销；代码回退也不回退数据库。含不兼容迁移、旧规则删除/改摘要、协议破坏或新增资源种子需求的版本，应安排维护，按恢复文档保留精确游戏版本并执行资源准备，不宣称可以完全无感升级。

运行日志仅记录阶段和短提交号，构建/维护子进程不输出原始环境或错误详情。构建失败、网络失败和非快进更新不会覆盖运行版本；每轮串行执行，同一迁移待维护 SHA 不重复构建。GitHub 分支及其安装脚本属于可信部署代码，只跟踪可信分支。更新器代码自身在当前监督进程中不会热替换，修改更新器需重启该命令。

current.json 记录已成功激活的完整 SHA/路径，重启继续使用该版本；所有旧构建保留，因此需监控磁盘空间，并在维护时按用户页面缓存生命周期清理旧资源，不能运行中随意删目录。supervisor.lock 防止同一目录双启动。正常 Ctrl+C/SIGTERM/父 IPC 会停止自有子进程并释放锁；宿主崩溃/强制结束后锁保留，先确认记录 PID 及其 API 均已停止、端口空闲，再删除该锁，避免误杀别的实例。不要将 `.data/updates` 作为 Web 静态目录公开。恢复见 [故障恢复](recovery.md)。
