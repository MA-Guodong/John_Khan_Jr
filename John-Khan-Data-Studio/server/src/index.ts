import { createServer } from 'node:http';
import { env } from './config/env.js';
import { logger } from './logger.js';
import { createDatabase } from './db/client.js';
import { migrate } from './db/schema.js';
import { isEmptyDatabase, seedDatabase } from './db/seed.js';
import { createApp } from './app.js';

const db = createDatabase(env.databaseFile);

migrate(db);

if (isEmptyDatabase(db)) {
  logger.info('数据库为空，正在写入种子数据…');
  const summary = seedDatabase(db, env.seedDir);
  logger.info(summary, '种子数据写入完成');
}

const app = createApp({ db });
const server = createServer(app);

server.listen(env.PORT, env.HOST, () => {
  logger.info(`API 已启动：http://localhost:${env.PORT}/api/health`);
  logger.info(`数据库文件：${env.databaseFile}`);
});

let shuttingDown = false;

function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`收到 ${signal}，正在关闭服务…`);

  server.close(() => {
    db.close();
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, '未处理的 Promise rejection');
});
