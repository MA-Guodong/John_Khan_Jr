# Node 20 运行在 Alpine（musl）里，宿主机 CentOS 7 的 glibc 版本无关。
# better-sqlite3 提供 linuxmusl 预编译包，构建时直接下载，不需要宿主机编译。
# 构建：docker build -t khan-site:latest .
# 启动：docker compose up -d --no-build

FROM node:20-alpine

ARG NPM_REGISTRY=https://registry.npmmirror.com
ARG BS3_MIRROR=https://npmmirror.com/mirrors/better-sqlite3

ENV npm_config_registry=${NPM_REGISTRY} \
    npm_config_better_sqlite3_binary_host_mirror=${BS3_MIRROR}

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY web/package.json ./web/package.json
RUN rm -f package-lock.json && npm install --no-audit --no-fund

COPY . .
RUN npm run build

ENV NODE_ENV=production

EXPOSE 4000

CMD ["node", "server/dist/index.js"]
