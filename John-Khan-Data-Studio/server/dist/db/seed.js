import fs from 'node:fs';
import path from 'node:path';
import { migrate } from './schema.js';
function readJson(file) {
    if (!fs.existsSync(file)) {
        throw new Error(`缺少种子文件：${file}\n请先运行 \`npm run import\` 从旧版 MySQL dump 生成种子数据。`);
    }
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}
/** 把 `data/seed/*.json` 写入 SQLite。可重复执行，会先清空旧数据。 */
export function seedDatabase(db, seedDir) {
    const videos = readJson(path.join(seedDir, 'videos.json'));
    const signs = readJson(path.join(seedDir, 'signs.json'));
    const avatars = readJson(path.join(seedDir, 'avatars.json'));
    migrate(db);
    db.transaction(() => {
        db.exec('DELETE FROM videos; DELETE FROM signs; DELETE FROM avatars;');
        for (const video of videos) {
            db.run('INSERT INTO videos (id, title, url, cover_url, published_at, duration_seconds) VALUES (?, ?, ?, ?, ?, ?)', [video.id, video.title, video.url, video.coverUrl, video.publishedAt, video.durationSeconds]);
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
export function isEmptyDatabase(db) {
    const row = db.get('SELECT COUNT(*) AS total FROM videos');
    return Number(row?.total ?? 0) === 0;
}
//# sourceMappingURL=seed.js.map