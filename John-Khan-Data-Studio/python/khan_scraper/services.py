"""业务同步逻辑：把 B 站当前状态增量写入 SQLite。

原则：
- 只追加变化，不重复插入；
- 头像先落盘再写库，避免页面出现 404；
- 视频以 URL（BV 号）去重，已存在则更新标题/封面/时长。
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import List

from . import db
from .bilibili import BilibiliClient
from .config import Settings
from .images import download_image, filename_from_url

logger = logging.getLogger(__name__)


@dataclass
class JobResult:
    job: str
    ok: bool
    changed: int
    message: str


def _normalize_sign(value: str) -> str | None:
    text = (value or "").strip()
    return text or None


def sync_profile(
    client: BilibiliClient,
    connection,
    settings: Settings,
    dry_run: bool = False,
    do_sign: bool = True,
    do_avatar: bool = True,
) -> List[JobResult]:
    """一次请求同时处理签名与头像，避免重复调用卡片接口。"""
    profile = client.get_profile()
    results: List[JobResult] = []

    if do_sign:
        new_content = _normalize_sign(profile.sign)
        entry = db.latest_sign_entry(connection)
        unchanged = entry is not None and entry["content"] == new_content

        if unchanged:
            results.append(JobResult("sign", True, 0, "签名没有变化"))
        elif dry_run:
            logger.info("[dry-run] 将写入新签名：%s", new_content)
            results.append(JobResult("sign", True, 1, "dry-run：将写入新签名"))
        else:
            posted_at = db.now_string()
            db.insert_sign(connection, new_content, posted_at)
            logger.info("签名已更新（%s）：%s", posted_at, new_content)
            results.append(JobResult("sign", True, 1, f"签名已更新：{new_content or '（空）'}"))

    if do_avatar:
        filename = filename_from_url(profile.face_url)
        entry = db.latest_avatar_entry(connection)
        unchanged = entry is not None and entry["image_file"] == filename

        if unchanged:
            results.append(JobResult("avatar", True, 0, "头像没有变化"))
        elif dry_run:
            logger.info("[dry-run] 将下载并写入头像：%s", filename)
            results.append(JobResult("avatar", True, 1, f"dry-run：将写入头像 {filename}"))
        else:
            download_image(client.session, profile.face_url, settings.avatar_dir, settings.timeout)
            posted_at = db.now_string()
            db.insert_avatar(connection, filename, posted_at)
            logger.info("头像已更新（%s）：%s", posted_at, filename)
            results.append(JobResult("avatar", True, 1, f"头像已更新：{filename}"))

    return results


def sync_videos(
    client: BilibiliClient,
    connection,
    settings: Settings,
    dry_run: bool = False,
    pages: int = 1,
) -> JobResult:
    """同步视频。

    pages=1 适合定时增量；首次迁移或长时间未运行后，用 --backfill 翻多页补齐历史。
    遇到「整页都没有新增/更新」时提前停止，避免无意义的请求。
    """
    inserted = 0
    updated = 0
    skipped = 0
    fetched = 0
    oldest_known = db.oldest_video_date(connection)
    consecutive_unchanged = 0

    for page in range(1, max(1, pages) + 1):
        try:
            items = client.get_videos(page=page)
        except Exception as error:  # noqa: BLE001 - 保留已抓取的页，避免整批回滚
            if page == 1:
                raise
            message = (
                f"抓取到第 {page} 页时失败：{error}。"
                f"已保留前 {page - 1} 页结果（新增 {inserted} 支，更新 {updated} 支），稍后重试即可继续。"
            )
            logger.warning(message)
            return JobResult("videos", False, inserted + updated, message)

        if not items:
            break

        fetched += len(items)
        page_changed = 0
        items.sort(key=lambda item: item.created_at)

        for item in items:
            existing = db.find_video_by_url(connection, item.url)
            if existing is None:
                if dry_run:
                    logger.info("[dry-run] 将写入视频：%s", item.title)
                else:
                    db.insert_video(
                        connection,
                        title=item.title,
                        url=item.url,
                        cover_url=item.cover_url,
                        published_at=item.created_at,
                        duration_seconds=item.duration_seconds,
                    )
                    logger.info("新增视频（%s）：%s", item.created_at, item.title)
                inserted += 1
                page_changed += 1
                continue

            fields_changed = (
                existing["title"] != item.title
                or existing["cover_url"] != item.cover_url
                or existing["duration_seconds"] != item.duration_seconds
            )
            if not fields_changed:
                skipped += 1
                continue

            if dry_run:
                logger.info("[dry-run] 将更新视频：%s", item.title)
            else:
                db.update_video(
                    connection,
                    video_id=int(existing["id"]),
                    title=item.title,
                    cover_url=item.cover_url,
                    duration_seconds=item.duration_seconds,
                )
                logger.info("更新视频信息：%s", item.title)
            updated += 1
            page_changed += 1

        logger.info("第 %s 页：%s 条，变化 %s 条", page, len(items), page_changed)

        if page_changed == 0:
            consecutive_unchanged += 1
        else:
            consecutive_unchanged = 0

        # 已经翻到比库里最早视频更早的位置，说明历史已补齐。
        if oldest_known and items[0].created_at <= oldest_known:
            break
        # 连续两页都没有变化，说明没有更多新数据。
        if page > 1 and consecutive_unchanged >= 2:
            break
        if len(items) < settings.video_page_size:
            break
        if page < pages:
            time.sleep(settings.request_delay)

    message = f"抓取 {fetched} 支：新增 {inserted} 支，更新 {updated} 支，跳过 {skipped} 支"
    return JobResult("videos", True, inserted + updated, message)


def sync_all(
    client: BilibiliClient,
    connection,
    settings: Settings,
    dry_run: bool = False,
    pages: int = 1,
) -> List[JobResult]:
    results: List[JobResult] = []
    try:
        results.extend(sync_profile(client, connection, settings, dry_run=dry_run))
    except Exception as error:  # noqa: BLE001 - 一个任务失败不阻塞其他任务
        logger.error("签名/头像同步失败：%s", error)
        results.append(JobResult("profile", False, 0, str(error)))

    try:
        results.append(sync_videos(client, connection, settings, dry_run=dry_run, pages=pages))
    except Exception as error:  # noqa: BLE001
        logger.error("视频同步失败：%s", error)
        results.append(JobResult("videos", False, 0, str(error)))
    return results
