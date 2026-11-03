#!/usr/bin/env python3
"""把旧 MySQL 库一次性迁移到新的 SQLite 数据库。

建议流程：
    1. 在宝塔面板备份 MySQL；
    2. 停掉 Node 服务（可选，但迁移期间页面数据会短暂不完整）；
    3. 备份 server/data/khan.db；
    4. python migrate_from_mysql.py --dry-run
    5. python migrate_from_mysql.py --replace
    6. 启动 Node 服务，检查页面数据。

环境变量（可写在 python/.env 或直接 export）：
    KHAN_MYSQL_HOST / PORT / USER / PASSWORD / DATABASE / CHARSET
"""

from __future__ import annotations

import argparse
import os
import sqlite3
import sys
from contextlib import closing
from typing import Dict, List, Optional

from khan_scraper import db
from khan_scraper.config import Settings
from khan_scraper.logging_setup import configure as configure_logging
from khan_scraper.migrate import map_avatar_row, map_sign_row, map_video_row


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="旧 MySQL -> SQLite 数据迁移")
    parser.add_argument("--dry-run", action="store_true", help="只统计，不写 SQLite")
    parser.add_argument("--replace", action="store_true", help="主键已存在时覆盖更新（默认跳过）")
    parser.add_argument("--reset", action="store_true", help="迁移前清空 SQLite 三张表（危险）")
    parser.add_argument("--yes", action="store_true", help="与 --reset 搭配，跳过确认")
    parser.add_argument(
        "--repair",
        choices=["auto", "none", "latin1", "gbk"],
        default="auto",
        help="历史乱码修复方式，默认自动判断",
    )
    parser.add_argument("--samples", type=int, default=3, help="迁移后打印几条最新记录用于核对（默认 3）")
    parser.add_argument("--mysql-charset", default=_env("KHAN_MYSQL_CHARSET", "utf8mb4"))
    parser.add_argument("--video-table", default=_env("KHAN_MYSQL_VIDEO_TABLE", "video"))
    parser.add_argument("--sign-table", default=_env("KHAN_MYSQL_SIGN_TABLE", "Sign"))
    parser.add_argument("--avatar-table", default=_env("KHAN_MYSQL_AVATAR_TABLE", "Avatar"))
    return parser.parse_args()


def connect_mysql(charset: str):
    try:
        import pymysql
        from pymysql.cursors import DictCursor
    except ImportError:
        print("缺少 PyMySQL：请先执行 pip install -r requirements-mysql.txt", file=sys.stderr)
        raise SystemExit(2)

    kwargs = dict(
        user=_env("KHAN_MYSQL_USER", "root"),
        password=_env("KHAN_MYSQL_PASSWORD", ""),
        database=_env("KHAN_MYSQL_DATABASE", "John_Khan_Jr"),
        charset=charset,
        cursorclass=DictCursor,
        autocommit=False,
    )
    socket_path = _env("KHAN_MYSQL_UNIX_SOCKET")
    if socket_path:
        kwargs["unix_socket"] = socket_path
    else:
        kwargs["host"] = _env("KHAN_MYSQL_HOST", "127.0.0.1")
        kwargs["port"] = int(_env("KHAN_MYSQL_PORT", "3306") or 3306)

    return pymysql.connect(**kwargs)


def resolve_table(cursor, candidates: List[str]) -> Optional[str]:
    """先按候选名精确匹配，再按大小写不敏感查 information_schema（Linux MySQL 表名区分大小写）。"""
    for name in candidates:
        try:
            cursor.execute(f"SELECT 1 FROM `{name}` LIMIT 1")
            return name
        except Exception:  # noqa: BLE001 - 表不存在时继续尝试
            continue

    for name in candidates:
        cursor.execute(
            """
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = DATABASE() AND LOWER(table_name) = LOWER(%s)
            LIMIT 1
            """,
            (name,),
        )
        row = cursor.fetchone()
        if row:
            return row["table_name"] if isinstance(row, dict) else row[0]
    return None


def fetch_rows(cursor, table: str) -> List[Dict]:
    cursor.execute(f"SELECT * FROM `{table}` ORDER BY id")
    return list(cursor.fetchall())


def upsert_video(connection, row: Dict, replace: bool) -> int:
    if replace:
        # CentOS 7 自带 SQLite 3.7 不支持 ON CONFLICT DO UPDATE；
        # INSERT OR REPLACE 在 3.7 上同样可用。
        sql = """
        INSERT OR REPLACE INTO videos (id, title, url, cover_url, published_at, duration_seconds)
        VALUES (?, ?, ?, ?, ?, ?)
        """
    else:
        sql = """
        INSERT OR IGNORE INTO videos (id, title, url, cover_url, published_at, duration_seconds)
        VALUES (?, ?, ?, ?, ?, ?)
        """
    cursor = connection.execute(
        sql,
        (
            row["id"],
            row["title"],
            row["url"],
            row["cover_url"],
            row["published_at"],
            row["duration_seconds"],
        ),
    )
    return cursor.rowcount


def upsert_sign(connection, row: Dict, replace: bool) -> int:
    if replace:
        sql = "INSERT OR REPLACE INTO signs (id, content, posted_at) VALUES (?, ?, ?)"
    else:
        sql = "INSERT OR IGNORE INTO signs (id, content, posted_at) VALUES (?, ?, ?)"
    cursor = connection.execute(sql, (row["id"], row["content"], row["posted_at"]))
    return cursor.rowcount


def upsert_avatar(connection, row: Dict, replace: bool) -> int:
    if replace:
        sql = "INSERT OR REPLACE INTO avatars (id, image_file, posted_at) VALUES (?, ?, ?)"
    else:
        sql = "INSERT OR IGNORE INTO avatars (id, image_file, posted_at) VALUES (?, ?, ?)"
    cursor = connection.execute(sql, (row["id"], row["image_file"], row["posted_at"]))
    return cursor.rowcount


def main() -> int:
    args = parse_args()
    configure_logging("INFO")
    settings = Settings.load()

    if args.reset and not args.yes:
        print("--reset 会清空 SQLite 数据，确认请再加 --yes", file=sys.stderr)
        return 2

    mysql = connect_mysql(args.mysql_charset)
    try:
        with mysql.cursor() as cursor:
            video_table = resolve_table(cursor, [args.video_table, "video", "Video"])
            sign_table = resolve_table(cursor, [args.sign_table, "Sign", "sign"])
            avatar_table = resolve_table(cursor, [args.avatar_table, "Avatar", "avatar"])

            missing = [
                name
                for name, table in (
                    ("video", video_table),
                    ("Sign", sign_table),
                    ("Avatar", avatar_table),
                )
                if table is None
            ]
            if missing:
                print(f"MySQL 中找不到这些表：{', '.join(missing)}", file=sys.stderr)
                return 1

            video_rows = [map_video_row(row, args.repair) for row in fetch_rows(cursor, video_table)]  # type: ignore[arg-type]
            sign_rows = [map_sign_row(row, args.repair) for row in fetch_rows(cursor, sign_table)]  # type: ignore[arg-type]
            avatar_rows = [map_avatar_row(row, args.repair) for row in fetch_rows(cursor, avatar_table)]  # type: ignore[arg-type]
    finally:
        mysql.close()

    print(f"MySQL 读取：视频 {len(video_rows)}、签名 {len(sign_rows)}、头像 {len(avatar_rows)}")

    valid_videos = [row for row in video_rows if row["id"] > 0 and row["url"] and row["published_at"]]
    valid_signs = [row for row in sign_rows if row["id"] > 0 and row["posted_at"]]
    valid_avatars = [
        row for row in avatar_rows if row["id"] > 0 and row["posted_at"] and row["image_file"]
    ]

    invalid = {
        "videos": len(video_rows) - len(valid_videos),
        "signs": len(sign_rows) - len(valid_signs),
        "avatars": len(avatar_rows) - len(valid_avatars),
    }
    if any(invalid.values()):
        print(f"跳过无效记录：{invalid}")

    missing_images = [
        row["image_file"]
        for row in valid_avatars
        if not (settings.avatar_dir / row["image_file"]).exists()
    ]
    print(f"头像文件：缺失 {len(missing_images)} 个")
    if missing_images:
        print(f"  例如：{', '.join(missing_images[:5])}")

    if args.dry_run:
        print("dry-run：未写入 SQLite。")
        return 0

    with closing(db.connect(settings)) as connection:
        db.ensure_schema(connection)

        if args.reset:
            connection.execute("DELETE FROM videos")
            connection.execute("DELETE FROM signs")
            connection.execute("DELETE FROM avatars")
            connection.commit()
            print("已清空 SQLite 三张表。")

        stats = {"videos": [0, invalid["videos"]], "signs": [0, invalid["signs"]], "avatars": [0, invalid["avatars"]]}

        for row in valid_videos:
            changed = upsert_video(connection, row, args.replace)
            stats["videos"][0 if changed else 1] += 1

        for row in valid_signs:
            changed = upsert_sign(connection, row, args.replace)
            stats["signs"][0 if changed else 1] += 1

        for row in valid_avatars:
            changed = upsert_avatar(connection, row, args.replace)
            stats["avatars"][0 if changed else 1] += 1

        connection.commit()
        counts = db.counts(connection)

    for name, (written, skipped) in stats.items():
        print(f"{name}: 写入/更新 {written}，跳过 {skipped}")
    print(f"SQLite 现有：{counts}")
    print("迁移完成。若 Node 正在运行，刷新页面即可看到新数据（接口缓存最长 60 秒）。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
