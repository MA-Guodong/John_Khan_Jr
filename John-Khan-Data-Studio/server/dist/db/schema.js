/**
 * 幂等建表：任意机器 clone 后无需手写 SQL 即可启动。
 * 时间统一存为 `YYYY-MM-DD HH:mm:ss` 文本，可直接排序、切片与比较。
 */
export function migrate(db) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      cover_url TEXT,
      published_at TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS signs (
      id INTEGER PRIMARY KEY,
      content TEXT,
      posted_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS avatars (
      id INTEGER PRIMARY KEY,
      image_file TEXT NOT NULL,
      posted_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_videos_published_at ON videos (published_at);
    CREATE INDEX IF NOT EXISTS idx_signs_posted_at ON signs (posted_at);
    CREATE INDEX IF NOT EXISTS idx_avatars_posted_at ON avatars (posted_at);
  `);
}
//# sourceMappingURL=schema.js.map