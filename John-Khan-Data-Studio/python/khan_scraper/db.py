"""SQLite 访问层：与 Node 服务共用同一个数据库文件。

写库使用短连接 + WAL + busy_timeout，允许 Node 在爬虫写入时继续读取。
"""

from __future__ import annotations

import sqlite3
from datetime import datetime
from pathlib import Path

from .config import Settings

SCHEMA_SQL = """
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
"""


def now_string() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def connect(settings: Settings) -> sqlite3.Connection:
    settings.db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(str(settings.db_path), timeout=15.0)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA journal_mode = WAL")
    connection.execute("PRAGMA synchronous = NORMAL")
    connection.execute("PRAGMA busy_timeout = 10000")
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def ensure_schema(connection: sqlite3.Connection) -> None:
    connection.executescript(SCHEMA_SQL)
    connection.commit()


def table_exists(connection: sqlite3.Connection, name: str) -> bool:
    row = connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        (name,),
    ).fetchone()
    return row is not None


def counts(connection: sqlite3.Connection) -> dict:
    result = {}
    for table in ("videos", "signs", "avatars"):
        if table_exists(connection, table):
            result[table] = connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        else:
            result[table] = None
    return result


def latest_sign_entry(connection: sqlite3.Connection) -> sqlite3.Row | None:
    return connection.execute(
        "SELECT content FROM signs ORDER BY posted_at DESC, id DESC LIMIT 1"
    ).fetchone()


def latest_sign(connection: sqlite3.Connection) -> str | None:
    row = latest_sign_entry(connection)
    return None if row is None else row["content"]


def latest_avatar_entry(connection: sqlite3.Connection) -> sqlite3.Row | None:
    return connection.execute(
        "SELECT image_file FROM avatars ORDER BY posted_at DESC, id DESC LIMIT 1"
    ).fetchone()


def latest_avatar(connection: sqlite3.Connection) -> str | None:
    row = latest_avatar_entry(connection)
    return None if row is None else row["image_file"]


def find_video_by_url(connection: sqlite3.Connection, url: str) -> sqlite3.Row | None:
    return connection.execute("SELECT * FROM videos WHERE url = ? LIMIT 1", (url,)).fetchone()


def oldest_video_date(connection: sqlite3.Connection) -> str | None:
    row = connection.execute("SELECT MIN(published_at) AS oldest FROM videos").fetchone()
    return None if row is None else row["oldest"]


def insert_sign(connection: sqlite3.Connection, content: str | None, posted_at: str) -> int:
    cursor = connection.execute(
        "INSERT INTO signs (content, posted_at) VALUES (?, ?)",
        (content, posted_at),
    )
    connection.commit()
    return int(cursor.lastrowid)


def insert_avatar(connection: sqlite3.Connection, image_file: str, posted_at: str) -> int:
    cursor = connection.execute(
        "INSERT INTO avatars (image_file, posted_at) VALUES (?, ?)",
        (image_file, posted_at),
    )
    connection.commit()
    return int(cursor.lastrowid)


def insert_video(
    connection: sqlite3.Connection,
    title: str,
    url: str,
    cover_url: str | None,
    published_at: str,
    duration_seconds: int,
) -> int:
    cursor = connection.execute(
        """
        INSERT INTO videos (title, url, cover_url, published_at, duration_seconds)
        VALUES (?, ?, ?, ?, ?)
        """,
        (title, url, cover_url, published_at, duration_seconds),
    )
    connection.commit()
    return int(cursor.lastrowid)


def update_video(
    connection: sqlite3.Connection,
    video_id: int,
    title: str,
    cover_url: str | None,
    duration_seconds: int,
) -> None:
    connection.execute(
        "UPDATE videos SET title = ?, cover_url = ?, duration_seconds = ? WHERE id = ?",
        (title, cover_url, duration_seconds, video_id),
    )
    connection.commit()


def count_avatar_files(avatar_dir: Path) -> int:
    if not avatar_dir.exists():
        return 0
    return sum(1 for item in avatar_dir.iterdir() if item.is_file())
