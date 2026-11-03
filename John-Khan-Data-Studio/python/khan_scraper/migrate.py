"""旧 MySQL 数据到 SQLite 的映射与乱码修复。

旧库使用 latin1 存 UTF-8 字节，直接读出来会出现「涓夊浗」这类乱码。
这里用「编码回环」尝试还原，并在多个候选中挑一个中文更像正常文本的结果。
"""

from __future__ import annotations

import re
from typing import Any, Dict, Optional

from .bilibili import normalize_url, parse_duration

BAD_MARKERS = ("涓", "锛", "鍙", "鎴", "鐨", "銆", "鈥", "\ufffd")
CJK_PATTERN = re.compile(r"[\u4e00-\u9fff]")


def _score(text: str) -> int:
    cjk = len(CJK_PATTERN.findall(text))
    bad = sum(text.count(marker) for marker in BAD_MARKERS)
    return cjk * 2 - bad * 3


def _try_reencode(text: str, encoding: str) -> Optional[str]:
    try:
        return text.encode(encoding).decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return None


def repair_text(value: Any, mode: str = "auto") -> Any:
    """修复历史乱码；非字符串原样返回。"""
    if not isinstance(value, str) or not value:
        return value
    if mode == "none":
        return value

    if mode in ("latin1", "gbk"):
        repaired = _try_reencode(value, mode)
        return repaired if repaired is not None else value

    best = value
    best_score = _score(value)

    for encoding in ("latin1", "gbk", "cp1252"):
        candidate = _try_reencode(value, encoding)
        if not candidate:
            continue
        score = _score(candidate)
        if score > best_score:
            best = candidate
            best_score = score

    return best


def avatar_filename(value: Any) -> str:
    if not value:
        return ""
    text = str(value).strip().replace("\\", "/").split("?")[0]
    return text.rsplit("/", 1)[-1]


def _pick(row: Dict[str, Any], *keys: str, default: Any = None) -> Any:
    for key in keys:
        if key in row and row[key] is not None:
            return row[key]
    return default


def map_video_row(row: Dict[str, Any], repair: str = "auto") -> Dict[str, Any]:
    return {
        "id": int(_pick(row, "id", default=0)),
        "title": repair_text(str(_pick(row, "video_title", "title", default="")), repair),
        "url": str(_pick(row, "video_url", "url", default="")),
        "cover_url": normalize_url(str(_pick(row, "video_cover", "cover_url", default="") or "")) or None,
        "published_at": str(_pick(row, "release_time", "published_at", default="")),
        "duration_seconds": parse_duration(_pick(row, "video_duration", "duration", default=0)),
    }


def map_sign_row(row: Dict[str, Any], repair: str = "auto") -> Dict[str, Any]:
    content = _pick(row, "sign", "content", default=None)
    repaired = repair_text(content, repair) if content is not None else None
    if isinstance(repaired, str):
        repaired = repaired.strip() or None
    return {
        "id": int(_pick(row, "id", default=0)),
        "content": repaired,
        "posted_at": str(_pick(row, "sign_time", "posted_at", default="")),
    }


def map_avatar_row(row: Dict[str, Any], repair: str = "auto") -> Dict[str, Any]:
    filename = avatar_filename(repair_text(_pick(row, "img_file_path", "image_file", default=""), repair))
    return {
        "id": int(_pick(row, "id", default=0)),
        "image_file": filename,
        "posted_at": str(_pick(row, "avatar_time", "posted_at", default="")),
    }
