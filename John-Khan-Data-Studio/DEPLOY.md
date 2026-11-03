# 宝塔面板完整部署指南

面向已经在用宝塔面板（Linux）的部署场景：Node 服务 + Nginx 反代 + Python 定时爬虫 + SQLite 数据文件。

文中的示例约定：

| 项目 | 示例值 | 说明 |
| --- | --- | --- |
| 项目目录 | `/www/wwwroot/khan` | 代码、数据库、图片都在这里 |
| 域名 | `khan.example.com` | 换成你的域名 |
| Node 端口 | `4000` | 只监听 127.0.0.1，由 Nginx 转发 |
| 运行用户 | `www` | Node 与 Python 都用这个用户，避免数据库权限问题 |
| Python | `python3.10` | 3.9+ 即可 |

---

## CentOS 7 特别说明（glibc 2.17）

CentOS 7 的系统 glibc 是 **2.17**，而官方 Node.js 18/20/22 的 Linux 二进制要求 **glibc ≥ 2.28**（[Node 官方说明](https://github.com/nodejs/node/pull/42659)）。所以：

- 直接下载官方 Node 20 会报 `GLIBC_2.28 not found`；
- 宝塔 Node 版本管理器里能装的最高版本通常止步于 Node 16；
- **不要用 Node 16 硬跑**：本项目的 Vite 5、better-sqlite3 11 等依赖都需要 Node 20，Node 16 也已停止维护。

另外，`better-sqlite3` 11.x 的官方 Linux 预编译包本身也依赖 glibc 2.28/2.29（我检查过 `node-v115-linux-x64` 的二进制符号），所以“只换一个 Node 二进制”还不够。

推荐按下面顺序选：

| 方案 | 适用情况 | 评价 |
| --- | --- | --- |
| **A. Docker** | 继续用 CentOS 7 | **推荐**，Node 和原生模块都跑在 Alpine 容器里，宿主 glibc 无关 |
| **B. 升级系统** | 可以重装/迁移服务器 | 长期最优；CentOS 7 已停止维护 |
| **C. 非官方 Node + 源码编译** | 不能 Docker、不能换系统 | 能跑但步骤多、依赖 devtoolset，不推荐 |

---

### 方案 A：Docker（CentOS 7 推荐）

项目根目录已经提供 `Dockerfile`、`docker-compose.yml`、`.dockerignore`。容器内是 `node:20-alpine`（musl），`better-sqlite3` 使用对应的 linuxmusl 预编译包，不需要在宿主机编译。Dockerfile 在镜像内重新执行 `npm install`，避免 Windows 生成的 lockfile 缺少 musl 可选依赖（Rollup 的 `@rollup/rollup-linux-x64-musl`）。

**1. 安装 Docker**

优先在宝塔「软件商店 → Docker」安装；也可以手动安装 Docker 24（CentOS 7 兼容版本），并确认：

```bash
docker --version
docker compose version    # 旧版是 docker-compose version
```

**2. 准备目录与配置**

```bash
cd /www/wwwroot/khan
cp .env.example .env
# 编辑 .env：CORS_ORIGIN、TRUST_PROXY=true 等

mkdir -p server/data
chown -R www:www server/data web/public/images
```

**3. 确认 www 的 UID**

容器会以宿主 `www` 的 UID 运行，否则写数据库会权限不足：

```bash
id -u www   # 常见是 1000
id -g www
```

如果输出不是 `1000`，在 `.env` 里追加：

```ini
KHAN_UID=1001
KHAN_GID=1001
```

（把数字换成实际值。）

**4. 构建并启动**

```bash
cd /www/wwwroot/khan
docker build -t khan-site:latest .
docker compose up -d --no-build
# 旧版 Compose：docker-compose up -d --no-build
```

> 有些服务器的 Compose 版本缺少 buildx 0.17+，直接 `docker compose up --build` 会报
> `compose build requires buildx 0.17.0 or later`。这时先用上面的 `docker build` 构建镜像，再用
> `docker compose up -d --no-build` 启动即可。

国内网络如果 Docker Hub 拉取慢，先在宝塔 Docker 设置里配置镜像加速；npm 镜像已经写进 Dockerfile，默认使用 npmmirror。需要换回官方源时：

```bash
docker build -t khan-site:latest \
  --build-arg NPM_REGISTRY=https://registry.npmjs.org \
  --build-arg BS3_MIRROR= \
  --no-cache .
```

**5. 验证**

```bash
docker compose ps
docker compose logs -f web
curl http://127.0.0.1:4000/api/health
```

看到 `{"status":"ok","database":"ok"}` 即可。

**6. Nginx 与 Python**

- Nginx 仍然按本文第 7 节反代到 `http://127.0.0.1:4000`（容器只发布到宿主机本地回环）；
- Python 仍在**宿主机**运行（第 8、9 节），它直接写 `server/data` 和 `web/public/images`，容器通过挂载立即可见；
- Python 与容器进程必须使用同一个 UID（都设为 `www`）。

**7. 更新代码**

```bash
cd /www/wwwroot/khan
# git pull 或上传新代码
docker build -t khan-site:latest .
docker compose up -d --no-build
```

**8. CentOS 7 + Docker 的注意事项**

- 如果 SELinux 是 enforcing，`docker-compose.yml` 里的 `:z` 已经处理了挂载标签；仍然报权限错误时，可临时 `setenforce 0` 验证，再配置 SELinux 策略；
- 容器日志：`docker compose logs -f web`；
- 镜像内已经包含 `data/seed`；宿主机数据库为空时容器启动会自动灌入当前 268 条数据；
- 要导入新 dump：在你本地机器执行 `npm run import && npm run seed`，然后把 `server/data/khan.db` 和 `data/seed` 上传覆盖；或者在宿主机用第 5.2 节的 MySQL 迁移脚本。

> Dockerfile 是单阶段 Alpine 构建，已在 CentOS 7.9 + Docker 26 上实际构建并运行验证。

---

### 方案 B：升级系统（长期最优）

把系统换成 **AlmaLinux 9 / Rocky Linux 9 / Ubuntu 22.04**，官方 Node 20 可以直接运行，之后完全按本文第 1 节开始的流程部署即可，不需要 Docker。

CentOS 7 已于 2024 年 6 月停止维护，继续使用会有安全更新问题；如果可以重装，建议优先考虑这个方案。

---

### 方案 C：非官方 Node 20 + 源码编译（不推荐，仅作兜底）

Node 官方为非 glibc 2.28 的系统提供了 `glibc-217` 构建，例如：

```bash
cd /usr/local
curl -fLO https://unofficial-builds.nodejs.org/download/release/v20.20.2/node-v20.20.2-linux-x64-glibc-217.tar.xz
tar -xf node-v20.20.2-linux-x64-glibc-217.tar.xz
ln -sfn /usr/local/node-v20.20.2-linux-x64-glibc-217 /usr/local/node20
export PATH=/usr/local/node20/bin:$PATH
node -v
```

但 `better-sqlite3` 的预编译包仍然要求 glibc 2.28，必须在本机编译。需要 devtoolset（GCC 9）和 Python 3.8+：

```bash
yum install -y centos-release-scl
yum install -y devtoolset-9-gcc devtoolset-9-gcc-c++ devtoolset-9-libstdc++-devel make python3

scl enable devtoolset-9 bash
export CC=/opt/rh/devtoolset-9/root/usr/bin/gcc
export CXX=/opt/rh/devtoolset-9/root/usr/bin/g++
export npm_config_python=/usr/bin/python3
export npm_config_build_from_source=true
export npm_config_disturl=https://npmmirror.com/mirrors/node

cd /www/wwwroot/khan
npm ci
```

如果编译出来的 `better-sqlite3.node` 提示 `CXXABI_1.3.9` 找不到，需要在启动 Node 时带上 devtoolset 的 libstdc++：

```bash
export LD_LIBRARY_PATH=/opt/rh/devtoolset-9/root/usr/lib64:$LD_LIBRARY_PATH
```

或者在编译时静态链接 libstdc++（`CXXFLAGS="-static-libstdc++ -static-libgcc"`）。这一步在不同 CentOS 7 环境上差异较大，所以只建议作为最后手段。

> 如果你选择这个方案，建议先把 Node 20.20.2 的 `glibc-217` 版本装好，确认 `node -v` 正常，再尝试 `npm ci`；不要直接覆盖系统自带的 Node。

---

## 0. 部署结构

```
浏览器 ──HTTPS──► Nginx（宝塔站点，80/443）
                     │ 反向代理
                     ▼
              Node/Express（127.0.0.1:4000）
                     │ 读取
                     ▼
        SQLite：server/data/khan.db  ◄── Python 定时任务（cron）
                     │
       头像：web/public/images  ◄──── Python 下载，Nginx/Express 托管
```

- Node 负责页面与 API；
- Python 只负责写数据库和下载头像；
- 两者共用 SQLite 文件（WAL 模式），Python 写入后页面最长 60 秒内可见；
- 头像目录独立于前端构建产物，新增头像不需要重新 `build`。

---

## 1. 宝塔准备

1. 安装 **Nginx**（必须）与 **MySQL**（只有迁移旧数据时需要）。
2. 在「软件商店」安装：
   - **Node.js 版本管理器**：安装 Node 20 LTS，并设为命令行默认版本；
   - **Python 项目管理器**：安装 Python 3.10（或使用系统 Python 3.9+）。
3. 「安全」放行 `80`、`443`；**不要**放行 `4000`。
4. 域名解析到服务器 IP。

检查：

```bash
node -v      # 期望 v20.x
python3 -V   # 期望 3.9+
nginx -v
```

---

## 2. 上传代码

推荐在服务器上直接拉取：

```bash
mkdir -p /www/wwwroot
cd /www/wwwroot
git clone <你的仓库地址> khan
cd khan
```

也可以把本地项目打包上传后解压到 `/www/wwwroot/khan`。

确认这些目录存在：

```bash
ls server/data data/seed web/public/images python
```

> 仓库已包含 692 张头像与截至 2026-10 的种子数据；首次启动会自动建库并灌入种子，也可以按第 5 节迁移旧 MySQL。

---

## 3. 安装 Node 依赖并构建

### 3.1 配置 npm 镜像

国内服务器建议使用 npmmirror：

```bash
npm config set registry https://registry.npmmirror.com
```

`better-sqlite3` 是原生模块，安装时会下载预编译包；GitHub 慢时设置镜像：

```bash
export npm_config_better_sqlite3_binary_host_mirror=https://npmmirror.com/mirrors/better-sqlite3
```

也可以把这些写进项目根目录的 `.npmrc`（不要提交密码类内容）：

```ini
registry=https://registry.npmmirror.com
better_sqlite3_binary_host_mirror=https://npmmirror.com/mirrors/better-sqlite3
```

### 3.2 安装与构建

```bash
cd /www/wwwroot/khan
npm ci
npm run build
```

如果 `better-sqlite3` 没有预编译包、或升级了 Node 大版本，需要本地编译：

```bash
yum install -y gcc-c++ make python3      # CentOS
# apt install -y build-essential python3 # Debian/Ubuntu
npm rebuild better-sqlite3 --build-from-source
npm run build
```

验证原生模块可加载：

```bash
node -e "const D=require('better-sqlite3'); const d=new D(':memory:'); d.exec('create table t(a)'); console.log('sqlite ok')"
```

---

## 4. 配置环境变量

```bash
cd /www/wwwroot/khan
cp .env.example .env
```

编辑 `.env`（生产环境建议全部使用绝对路径）：

```ini
NODE_ENV=production
HOST=127.0.0.1
PORT=4000

DATABASE_FILE=/www/wwwroot/khan/server/data/khan.db
SEED_DIR=/www/wwwroot/khan/data/seed
WEB_DIST=/www/wwwroot/khan/web/dist
AVATAR_DIR=/www/wwwroot/khan/web/public/images

LOG_LEVEL=info
CORS_ORIGIN=https://khan.example.com
TRUST_PROXY=true
```

说明：

- `HOST=127.0.0.1`：只允许 Nginx 访问，避免 4000 端口对外；
- `AVATAR_DIR`：必须与 Python 的 `KHAN_AVATAR_DIR` 完全一致；
- `CORS_ORIGIN`：填正式域名；同源请求始终放行；
- `TRUST_PROXY=true`：在 Nginx 后面读取真实 IP / 协议。

设置权限（后文的 Node、Python 都以 `www` 运行）：

```bash
chown -R www:www /www/wwwroot/khan
find /www/wwwroot/khan -type d -exec chmod 755 {} \;
chmod -R u+rwX,g+rwX /www/wwwroot/khan/server/data /www/wwwroot/khan/web/public/images
```

---

## 5. 初始化数据

三种情况选一种。

### 5.1 全新部署（使用仓库自带种子）

```bash
cd /www/wwwroot/khan
npm run seed
```

会创建 `server/data/khan.db` 并写入：268 支视频、1,503 条签名、757 个头像（截至 2026-10）。

> `npm run seed` 会**清空并重建**三张表，已有数据时不要执行。

### 5.2 从旧 MySQL 迁移（推荐，保留到当前的所有数据）

1. 宝塔「数据库」里备份旧库 `John_Khan_Jr`；
2. 先停掉 Node（见第 7 节），并备份现有 SQLite（如果有）：
   ```bash
   cp server/data/khan.db server/data/khan.db.bak
   ```
3. 安装迁移依赖：
   ```bash
   cd /www/wwwroot/khan/python
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements-mysql.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
   ```
4. 配置 MySQL 连接（也可写进 `python/.env`）：
   ```bash
   export KHAN_MYSQL_HOST=127.0.0.1
   export KHAN_MYSQL_PORT=3306
   export KHAN_MYSQL_USER=root
   export KHAN_MYSQL_PASSWORD='你的密码'
   export KHAN_MYSQL_DATABASE=John_Khan_Jr
   ```
5. 先试运行，确认读取数量和乱码修复效果：
   ```bash
   python migrate_from_mysql.py --dry-run
   ```
6. 正式迁移：
   ```bash
   python migrate_from_mysql.py --replace
   ```
7. 检查输出里的 `SQLite 现有：{'videos': ..., 'signs': ..., 'avatars': ...}`，与旧库数量对比。

> 旧站点的头像保存在它自己的 `public/images` 里，新项目不会自动找到它们。迁移前先复制过去（不覆盖已有文件）：
>
> ```bash
> cp -n /www/wwwroot/旧项目/public/images/* /www/wwwroot/khan/web/public/images/
> chown www:www /www/wwwroot/khan/web/public/images/*
> ```
>
> 迁移脚本会报告缺失的头像文件；历史头像无法从数据库反推 URL，只能从旧目录补齐。
>
> 迁移默认会修复旧库的乱码（`涓夊浗` → `三国`）。若结果异常，可加 `--repair none` 重新迁移到空库。
>
> 只有旧的 `.sql` dump 时，也可以用 `npm run import` + `npm run seed`，但那会覆盖现有数据。

### 5.3 直接用已有 SQLite 文件

把备份的 `khan.db`（以及可能存在的 `khan.db-wal`、`khan.db-shm`）放回 `server/data/`，确保属主是 `www`。

### 5.4 统一数据目录权限（重要）

无论用哪种方式初始化，数据库和图片目录都必须让 **Node 与 Python 使用同一个用户（www）**：

```bash
cd /www/wwwroot/khan
mkdir -p python/logs
chown -R www:www server/data web/public/images python/logs
chmod -R u+rwX,g+rwX server/data web/public/images
chmod 600 python/.env 2>/dev/null || true
```

如果数据库是 root 创建的（例如用 root 执行了 `npm run seed` 或迁移脚本），Node 以 www 运行时可能连 WAL 文件都打不开，表现为 500 或 `database is locked`。执行上面的 `chown` 后重启 Node。

---

## 6. 启动 Node 服务

### 方式 A：宝塔「Node 项目」（推荐）

1. 宝塔 → 网站 → **Node 项目** → 添加；
2. 项目目录：`/www/wwwroot/khan`
3. 启动命令：`npm start`
4. 项目端口：`4000`
5. 运行用户：`www`
6. 环境变量：可留空（已写在 `.env`），或在这里覆盖；
7. 保存并启动，开启「开机自启」。

### 方式 B：PM2

```bash
npm install -g pm2
cd /www/wwwroot/khan
pm2 start npm --name khan-site --uid www -- start
pm2 save
pm2 startup    # 按提示执行输出的命令
```

`--uid www` 很关键：PM2 本身以 root 运行，但业务进程会切换成 `www`，这样数据库和头像文件的属主才和 Python 定时任务一致。

常用命令：

```bash
pm2 status
pm2 logs khan-site --lines 100
pm2 restart khan-site
```

无论哪种方式，验证：

```bash
curl http://127.0.0.1:4000/api/health
# {"status":"ok","database":"ok",...}
```

> 如果 Node 以 root 运行，后续 Python 以 www 运行就会写不了数据库。
> 统一为 `www` 是最省事的方式；已经用 root 跑过的话，执行一次
> `chown -R www:www server/data web/public/images` 并重启 Node。

---

## 7. 宝塔站点与 Nginx 反向代理

1. 宝塔 → 网站 → 添加站点，域名 `khan.example.com`，PHP 版本选「纯静态」；
2. 删除站点目录下默认的 `index.html`（如果生成了），不要占用 `/www/wwwroot/khan`；
3. 网站设置 → **反向代理** → 添加：
   - 代理名称：`khan`
   - 目标 URL：`http://127.0.0.1:4000`
   - 发送域名：`$host`
4. 保存后，在「配置文件」中确认/补充：

```nginx
location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
}

# 可选：头像由 Nginx 直接读取，性能更好（Python 新下载的图片也立即生效）
location /images/ {
    alias /www/wwwroot/khan/web/public/images/;
    expires 30d;
    add_header Cache-Control "public, immutable";
    access_log off;
}
```

> 若使用 `location /images/` 的 alias，请确保目录和文件对 `www`、Nginx 工作用户可读（默认 755/644 即可）。

5. 网站设置 → **SSL** → Let's Encrypt，申请证书并开启「强制 HTTPS」；
6. 开启 HTTP/2（宝塔 SSL 页面通常有开关）。

验证：

```bash
curl -I https://khan.example.com/
curl https://khan.example.com/api/health
```

---

## 8. 配置 Python 爬虫

### 8.1 虚拟环境

```bash
cd /www/wwwroot/khan/python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### 8.2 配置

```bash
cd /www/wwwroot/khan/python
cp .env.example .env
```

编辑 `python/.env`（绝对路径）：

```ini
KHAN_DB_PATH=/www/wwwroot/khan/server/data/khan.db
KHAN_AVATAR_DIR=/www/wwwroot/khan/web/public/images
KHAN_MID=23947287
KHAN_COOKIE=
KHAN_REQUEST_DELAY=1.0
KHAN_VIDEO_PAGE_SIZE=20
```

如果视频接口出现 `-352` / `412`，按 [python/README.md](python/README.md) 的方法填入登录 Cookie。

### 8.3 首次运行

```bash
cd /www/wwwroot/khan/python
source venv/bin/activate

python main.py check
python main.py signs --dry-run
python main.py avatars
python main.py videos --backfill     # 首次上线补齐历史视频，最多翻 10 页
python main.py all                   # 日常增量
```

> `--backfill` 可以重复执行：每次会从最新一页往后翻，遇到连续两页都没有变化时停止。日志里如果没有新增，就说明补到当前了。

确认：

- 数据库行数增长；
- `web/public/images` 出现新头像；
- 刷新页面能看到新签名/头像/视频（接口缓存最长 60 秒）。

### 8.4 权限

```bash
chown -R www:www /www/wwwroot/khan/python /www/wwwroot/khan/server/data /www/wwwroot/khan/web/public/images
chown www:www /www/wwwroot/khan/python/.env 2>/dev/null || true
chmod 600 /www/wwwroot/khan/python/.env 2>/dev/null || true
chmod +x /www/wwwroot/khan/python/run_cron.sh
```

---

## 9. 宝塔计划任务（定时爬取）

宝塔 → 计划任务 → 添加任务：

- 任务类型：**Shell 脚本**
- 任务名称：`khan-scraper`
- 执行周期：**每 30 分钟**（`*/30 * * * *`）
- 执行用户：`www`（如果面板没有该选项，用下面的 `su` 写法）
- 脚本内容：

```bash
su -s /bin/bash www -c '/www/wwwroot/khan/python/run_cron.sh >> /www/wwwroot/khan/python/logs/scraper.log 2>&1'
```

`run_cron.sh` 会：

1. 切到 `python/` 目录；
2. 创建 `logs/`；
3. 用 `flock -n` 加锁，避免上一轮没跑完又启动一轮；
4. 用虚拟环境里的 Python 执行 `main.py all`。

### 日志切割

宝塔 → 计划任务 → 日志切割，或「网站 → 日志」里对
`/www/wwwroot/khan/python/logs/scraper.log` 配置按天切割，保留 30 天。

### 验证定时任务

```bash
tail -f /www/wwwroot/khan/python/logs/scraper.log
```

正常日志类似：

```
2026-11-01 15:00:01 INFO khan: [OK] sign：签名没有变化
2026-11-01 15:00:02 INFO khan: [OK] avatar：头像没有变化
2026-11-01 15:00:04 INFO khan_scraper.services: 第 1 页：20 条，变化 1 条
2026-11-01 15:00:04 INFO khan: [OK] videos：抓取 20 支：新增 1 支，更新 0 支，跳过 19 支
```

---

## 10. 备份与恢复

### 10.1 备份

SQLite 在 WAL 模式下不要直接 `cp` 正在写入的库，使用 `.backup`：

```bash
mkdir -p /www/backup/khan
sqlite3 /www/wwwroot/khan/server/data/khan.db \
  ".backup '/www/backup/khan/khan-$(date +%F-%H%M).db'"

tar czf /www/backup/khan/images-$(date +%F).tar.gz \
  -C /www/wwwroot/khan/web/public images
```

没有 `sqlite3` 命令时安装（`yum install -y sqlite`），或用 Python：

```bash
cd /www/wwwroot/khan
python3 - <<'PY'
import sqlite3, datetime, pathlib
src = sqlite3.connect('server/data/khan.db')
dst_path = pathlib.Path('/www/backup/khan') / f"khan-{datetime.datetime.now():%Y%m%d-%H%M}.db"
dst_path.parent.mkdir(parents=True, exist_ok=True)
dst = sqlite3.connect(str(dst_path))
src.backup(dst)
dst.close(); src.close()
print('backup ->', dst_path)
PY
```

放到宝塔计划任务，每天凌晨 3 点执行，保留 30 天。

### 10.2 恢复

```bash
# 1. 停 Node
pm2 stop khan-site
# 2. 备份当前数据
mv server/data/khan.db server/data/khan.db.bad
# 3. 放回备份（同时删除遗留的 -wal / -shm）
cp /www/backup/khan/khan-2026-11-01-0300.db server/data/khan.db
rm -f server/data/khan.db-wal server/data/khan.db-shm
chown www:www server/data/khan.db
# 4. 启动
pm2 start khan-site
```

---

## 11. 日常升级

```bash
cd /www/wwwroot/khan
# 先备份数据库与图片
git pull
npm ci
npm run build
pm2 restart khan-site
```

Python 侧如果有依赖变化：

```bash
cd python
source venv/bin/activate
pip install -r requirements.txt
```

数据库表结构是幂等的 `CREATE TABLE IF NOT EXISTS`，启动时自动补齐；升级不会清空数据。

---

## 12. 安全与运维清单

- [ ] 防火墙只放行 `80/443`，`4000` 不对外；
- [ ] Node 监听 `127.0.0.1`，运行用户 `www`；
- [ ] 已在宝塔申请 SSL 并强制 HTTPS；
- [ ] `.env` 不在 Web 可访问目录（本项目 `.env` 在仓库根目录，Express 不托管仓库根目录）；
- [ ] `CORS_ORIGIN` 填正式域名；
- [ ] Python 定时任务与 Node 使用同一用户，数据库/图片目录可写；
- [ ] 每日数据库 + 图片备份，至少保留 7 天；
- [ ] 日志切割已配置；
- [ ] B 站 Cookie 失效时有告警（日志出现 `-352`）。

---

## 13. 验收清单

```bash
# 1. 服务健康
curl -s http://127.0.0.1:4000/api/health

# 2. 页面
curl -I https://khan.example.com/
curl -I https://khan.example.com/videos
curl -I https://khan.example.com/signatures
curl -I https://khan.example.com/avatars

# 3. 新头像（替换为实际文件名）
curl -I https://khan.example.com/images/<new-avatar>.jpg

# 4. 爬虫
cd /www/wwwroot/khan/python && ./venv/bin/python main.py check
```

页面侧检查：

- [ ] 总览的统计数字正常；
- [ ] 视频可以搜索、筛选、翻页；
- [ ] 头像灯箱可以打开、方向键切换；
- [ ] 深色模式正常；
- [ ] 手机访问布局正常；
- [ ] 定时任务写入后，刷新页面能看到新内容。

---

## 14. 常见问题

| 现象 | 排查 |
| --- | --- |
| `better-sqlite3` 安装失败 | 先设镜像；仍失败则安装编译工具后 `npm rebuild better-sqlite3 --build-from-source` |
| 升级 Node 后启动报 ABI 错误 | `npm rebuild better-sqlite3`，再重启 |
| Nginx 502 | Node 没起来或端口不对：`curl 127.0.0.1:4000/api/health`、`pm2 logs` |
| 页面 500 | 看 Node 日志；多半是数据库文件权限或路径不对 |
| 页面没有新数据 | 接口缓存最长 60 秒；确认 Python 写入的是同一个 `khan.db` |
| 新头像 404 | `AVATAR_DIR` 与 `KHAN_AVATAR_DIR` 不一致，或文件属主不是 www |
| `database is locked` | 两个写入者同时跑；确认 `run_cron.sh` 使用了 flock，`busy_timeout` 生效 |
| `-352` / `412` | B 站风控：配置 `KHAN_COOKIE`，降低频率，或更换出口 IP |
| 时间差 8 小时 | `timedatectl set-timezone Asia/Shanghai`，重启 Node 与爬虫 |
| 样式/JS 404 | 没有执行 `npm run build`，或 `WEB_DIST` 指向错误 |

---

## 15. 最短路径（TL;DR）

```bash
# 1. 代码与依赖
cd /www/wwwroot && git clone <repo> khan && cd khan
npm config set registry https://registry.npmmirror.com
npm ci && npm run build
cp .env.example .env      # 改 HOST/PORT/路径/域名

# 2. 数据（三选一）
npm run seed              # 全新
# 或 python/migrate_from_mysql.py --replace
# 或放回已有 khan.db

# 3. 启动
pm2 start npm --name khan-site --uid www -- start
pm2 save

# 4. Nginx 反代 + SSL
# 宝塔站点 → 反向代理 → http://127.0.0.1:4000

# 5. Python
cd python && python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
./venv/bin/python main.py check
./venv/bin/python main.py videos --backfill

# 6. 定时任务（每 30 分钟，用户 www）
su -s /bin/bash www -c '/www/wwwroot/khan/python/run_cron.sh >> /www/wwwroot/khan/python/logs/scraper.log 2>&1'
```
