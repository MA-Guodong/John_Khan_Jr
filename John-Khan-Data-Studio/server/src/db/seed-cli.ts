import { env } from '../config/env.js';
import { createDatabase } from './client.js';
import { seedDatabase } from './seed.js';

const db = createDatabase(env.databaseFile);

try {
  const summary = seedDatabase(db, env.seedDir);
  console.log(`视频 ${summary.videos} 条 / 签名 ${summary.signs} 条 / 头像 ${summary.avatars} 条`);
  console.log(`数据库文件：${env.databaseFile}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  db.close();
}
