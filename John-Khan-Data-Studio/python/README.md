# Python 采集脚本

定时抓取 B 站 UP 主「小约翰可汗」的**签名、头像、视频列表**，增量写入站点使用的 SQLite 数据库。

重写后的脚本解决了旧版的几个问题：硬编码 Cookie 与 Mac 路径、直接拼 SQL、只抓最新 1 条视频、依赖 `Charts` 预聚合表、出错静默。

## 工作方式

```
B 站接口 ──► python/main.py ──► server/data/khan.db（SQLite, WAL）
                                      │
                                      ▼
                               Node 服务实时读取
```

- 签名 / 头像：调用 `x/web-interface/card`，与数据库最新一条比较，**有变化才写入**。
- 头像：先下载到 `web/public/images`（原子写入），再写数据库；Node 直接从该目录托管图片，**不需要重新构建前端**。
- 视频：WBI 签名调用空间投稿接口，按 BV 号去重；支持 `--backfill` 翻页补齐历史。
- 数据库：与 Node 共用同一个文件，使用 WAL + `busy_timeout`，运行中写入不会阻塞页面读取。

## 安装

要求 Python 3.9+（3.10 验证过）。

```bash
cd python
python3 -m venv venv

# Linux / macOS
source venv/bin/activate
# Windows
# venv\Scripts\activate

pip install -r requirements.txt
cp .env.example .env
```

编辑 `python/.env`，至少确认这两项（默认值已指向正确位置）：

```ini
KHAN_DB_PATH=../server/data/khan.db
KHAN_AVATAR_DIR=../web/public/images
```

> 相对路径按 `python/` 目录解析；生产环境建议写绝对路径。

## 关于 Cookie

签名 / 头像接口通常不需要登录。视频接口在部分 IP 或高频请求下会返回 `-352`（风控）或 `412`，这时需要配置登录 Cookie：

1. 浏览器登录 B 站；
2. 打开开发者工具 → Network；
3. 刷新任意 `api.bilibili.com` 请求，复制 Request Headers 里的整行 `Cookie`；
4. 粘贴到 `python/.env`：

```ini
KHAN_COOKIE=SESSDATA=xxx; bili_jct=xxx; buvid3=xxx; ...
```

Cookie 通常几个月后过期，表现为日志里持续出现 `-352`。重新复制即可。

## 常用命令

```bash
cd python
python main.py check              # 查看数据库、图片目录、Cookie 配置
python main.py signs --dry-run    # 只看签名有没有变化，不写库
python main.py avatars            # 只同步头像
python main.py videos             # 只同步最新一页视频（20 条）
python main.py all                # 签名 + 头像 + 视频（定时任务用这个）
python main.py videos --backfill  # 首次部署/长时间停更后，翻最多 10 页补齐历史
python main.py --pages 5 all      # 自定义翻页数
```

退出码：`0` 全部成功，`1` 有任务失败（便于宝塔计划任务告警），`2` 配置错误。

## 定时任务（宝塔面板）

在宝塔「计划任务」里添加 Shell 脚本，建议每 30 分钟运行一次：

```bash
/www/wwwroot/khan/python/run_cron.sh >> /www/wwwroot/khan/python/logs/scraper.log 2>&1
```

`run_cron.sh` 做了三件事：切到脚本目录、创建 `logs/`、用 `flock` 防止上一次没跑完又启动一次。

建议在宝塔「日志切割」里给 `python/logs/scraper.log` 配置按天切割并保留 30 天。

## 从旧 MySQL 迁移（一次性）

如果当前 MySQL 里已经有比种子数据更新的内容，用迁移脚本接管，避免丢失：

```bash
cd python
source venv/bin/activate
pip install -r requirements-mysql.txt

export KHAN_MYSQL_HOST=127.0.0.1
export KHAN_MYSQL_USER=root
export KHAN_MYSQL_PASSWORD='你的密码'
export KHAN_MYSQL_DATABASE=John_Khan_Jr

python migrate_from_mysql.py --dry-run     # 先看读取数量、乱码修复效果
python migrate_from_mysql.py --replace     # 写入/更新 SQLite
```

- 迁移会读取旧表 `video`、`Sign`、`Avatar`，自动把 `19:09` 转成秒，并修复历史乱码。
- 默认按主键跳过已存在记录；`--replace` 会覆盖同 id 的记录。
- 想从零重建（先备份数据库）可加 `--reset --yes`。
- 迁移前建议先停 Node 服务，迁移后再启动，避免页面短暂读到一半数据。
- 旧头像如果不在 `web/public/images`，请从旧项目的 `public/images` 复制过来；数据库里只有文件名，没有 URL，无法自动补下历史头像。

> 如果只有旧的 `.sql` dump，也可以直接用项目根目录的 `npm run import` + `npm run seed`。

## 测试

不依赖网络与真实数据库：

```bash
cd python
python -m unittest discover -s tests -v
```

覆盖：乱码修复、时长解析、WBI 签名、URL/文件名处理、SQLite 增改查。

## 与旧脚本的对应关系

| 旧脚本 | 新位置 | 变化 |
| --- | --- | --- |
| `main.py` 签名部分 | `khan_scraper/services.py` `sync_profile` | 只追加变化；不再写 `Charts` |
| `main.py` 头像下载 | `khan_scraper/images.py` | 原子写入、校验 Content-Type、防目录穿越 |
| `video.py` | `khan_scraper/bilibili.py` + `sync_videos` | 保留 WBI 签名；支持多页、按 BV 去重、更新时长 |
| `pymysql_comm.py` | `khan_scraper/db.py` | 改为标准库 `sqlite3`，参数化查询 |
| 硬编码路径 / Cookie | `khan_scraper/config.py` + `.env` | 全部可配置 |

## 故障排查

| 现象 | 处理 |
| --- | --- |
| `-352` / HTTP 412 | 配置或更新 `KHAN_COOKIE`；降低频率；换出口 IP |
| `database is locked` | 确认 Node 与 Python 使用同一文件、`busy_timeout` 生效；确保没有两个爬虫同时跑（用 `flock`） |
| 页面 404 新头像 | 检查 Python 的 `KHAN_AVATAR_DIR` 与 Node 的 `AVATAR_DIR` 是否一致 |
| 页面数据没变化 | 接口缓存最长 60 秒；刷新页面或等待一分钟 |
| 时间差 8 小时 | 服务器时区应为 `Asia/Shanghai`；`timedatectl set-timezone Asia/Shanghai` |
