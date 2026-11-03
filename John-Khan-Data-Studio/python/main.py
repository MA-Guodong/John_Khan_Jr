#!/usr/bin/env python3
"""小约翰可汗数据站：定时采集入口。

用法：
    python main.py all          # 签名、头像、视频（cron 用这个）
    python main.py signs        # 只更新签名
    python main.py avatars      # 只更新头像
    python main.py videos       # 只更新视频
    python main.py check        # 检查配置、数据库与图片目录
"""

from __future__ import annotations

import argparse
import logging
import sqlite3
import sys
from contextlib import closing
from typing import List

from khan_scraper import __version__, db
from khan_scraper.bilibili import BilibiliClient, BilibiliError
from khan_scraper.config import Settings
from khan_scraper.logging_setup import configure as configure_logging
from khan_scraper.services import JobResult, sync_all, sync_profile, sync_videos

logger = logging.getLogger("khan")


def build_parser() -> argparse.ArgumentParser:
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--dry-run", action="store_true", help="只读取与打印，不写数据库、不下载图片")
    common.add_argument("--verbose", action="store_true", help="输出调试日志")
    common.add_argument("--pages", type=int, default=1, help="视频抓取页数，每页 20 条（默认 1）")
    common.add_argument("--backfill", action="store_true", help="补齐历史：最多翻 10 页视频")

    parser = argparse.ArgumentParser(
        description="小约翰可汗数据站采集脚本",
        parents=[common],
    )
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")

    subparsers = parser.add_subparsers(dest="command")
    subparsers.add_parser("all", parents=[common], help="签名 + 头像 + 视频")
    subparsers.add_parser("signs", parents=[common], help="只同步签名")
    subparsers.add_parser("avatars", parents=[common], help="只同步头像")
    subparsers.add_parser("videos", parents=[common], help="只同步视频")
    subparsers.add_parser("check", parents=[common], help="检查配置与数据库状态")
    return parser


def print_check(settings: Settings) -> int:
    print(f"版本        : {__version__}")
    print(f"数据库      : {settings.db_path}")
    print(f"数据库存在  : {'是' if settings.db_path.exists() else '否（首次写入时会自动创建）'}")
    print(f"头像目录    : {settings.avatar_dir}")
    print(f"头像文件数  : {db.count_avatar_files(settings.avatar_dir)}")
    print(f"UP 主 mid   : {settings.mid}")
    print(f"Cookie      : {'已配置' if settings.cookie else '未配置（视频接口可能被风控）'}")
    print(f"请求间隔    : {settings.request_delay}s，超时 {settings.timeout}s，重试 {settings.retries} 次")

    if not settings.db_path.exists():
        print("数据表      : 尚未创建")
        return 0

    try:
        with closing(db.connect(settings)) as connection:
            counts = db.counts(connection)
            print(f"数据表      : {', '.join(f'{name}={value}' for name, value in counts.items())}")
    except sqlite3.Error as error:
        print(f"读取数据库失败：{error}")
        return 1
    return 0


def run_jobs(settings: Settings, command: str, dry_run: bool, pages: int) -> List[JobResult]:
    client = BilibiliClient(settings)
    with closing(db.connect(settings)) as connection:
        db.ensure_schema(connection)

        if command == "all":
            return sync_all(client, connection, settings, dry_run=dry_run, pages=pages)
        if command == "signs":
            return sync_profile(client, connection, settings, dry_run=dry_run, do_sign=True, do_avatar=False)
        if command == "avatars":
            return sync_profile(client, connection, settings, dry_run=dry_run, do_sign=False, do_avatar=True)
        if command == "videos":
            return [sync_videos(client, connection, settings, dry_run=dry_run, pages=pages)]
        raise ValueError(f"未知命令：{command}")


def main(argv: List[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    settings = Settings.load()
    configure_logging("DEBUG" if args.verbose else settings.log_level)
    command = args.command or "all"

    if args.dry_run:
        logger.info("dry-run 模式：不会写入数据库或下载图片")

    if command == "check":
        return print_check(settings)

    pages = 10 if args.backfill else max(1, args.pages)
    if pages > 1:
        logger.info("视频抓取页数：%s（每页约 20 条）", pages)

    try:
        results = run_jobs(settings, command, dry_run=args.dry_run, pages=pages)
    except BilibiliError as error:
        logger.error("%s", error)
        if error.hint:
            logger.error("提示：%s", error.hint)
        return 1
    except sqlite3.Error as error:
        logger.error("数据库操作失败：%s", error)
        logger.error("请确认数据库文件可写，且 Node 服务与当前用户属于同一用户组。")
        return 1
    except KeyboardInterrupt:
        logger.warning("已取消")
        return 130

    failed = False
    for result in results:
        prefix = "OK" if result.ok else "FAIL"
        logger.info("[%s] %s：%s", prefix, result.job, result.message)
        failed = failed or not result.ok

    if failed:
        logger.warning("存在未完成的任务；定时任务会记录为失败，下一次运行会继续补抓。")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
