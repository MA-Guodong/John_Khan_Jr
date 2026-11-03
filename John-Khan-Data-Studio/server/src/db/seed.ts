import fs from 'node:fs';
import path from 'node:path';
import type { Database } from './client.js';
import { migrate } from './schema.js';

export interface SeedSummary {
  videos: number;
  signs: number;
  avatars: number;
}

interface SeedVideo {
  id: number;
  title: string;
  url: string;
  coverUrl: string | null;
  publishedAt: string;
  durationSeconds: number;
}

interface SeedSign {
  id: number;
  content: string | null;
  postedAt: string;
}

interface SeedAvatar {
  id: number;
  imageFile: string;
  postedAt: string;
}

function readJson<T>(file: string): T[] {
  if (!fs.existsSync(file)) {
    throw new Error(`缺少种子文件：${file}\n请先运行 \`npm run import\` 从旧版 MySQL dump 生成种子数据。`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T[];
}

/** 把 `data/seed/*.json` 写入 SQLite。可重复执行，会先清空旧数据。 */
export function seedDatabase(db: Database, seedDir: string): SeedSummary {
  const videos = readJson<SeedVideo>(path.join(seedDir, 'videos.json'));
  const signs = readJson<SeedSign>(path.join(seedDir, 'signs.json'));
  const avatars = readJson<SeedAvatar>(path.join(seedDir, 'avatars.json'));

  migrate(db);

  db.transaction(() => {
    db.exec('DELETE FROM videos; DELETE FROM signs; DELETE FROM avatars;');

    for (const video of videos) {
      db.run(
        'INSERT INTO videos (id, title, url, cover_url, published_at, duration_seconds) VALUES (?, ?, ?, ?, ?, ?)',
        [video.id, video.title, video.url, video.coverUrl, video.publishedAt, video.durationSeconds],
      );
    }

    for (const sign of signs) {
      db.run('INSERT INTO signs (id, content, posted_at) VALUES (?, ?, ?)', [sign.id, sign.content, sign.postedAt]);
    }

    for (const avatar of avatars) {
      db.run('INSERT INTO avatars (id, image_file, posted_at) VALUES (?, ?, ?)', [
        avatar.id,
        avatar.imageFile,
        avatar.postedAt,
      ]);
    }
  });

  return { videos: videos.length, signs: signs.length, avatars: avatars.length };
}

export function isEmptyDatabase(db: Database): boolean {
  const row = db.get<{ total: number }>('SELECT COUNT(*) AS total FROM videos');
  return Number(row?.total ?? 0) === 0;
}
