"""头像下载：原子写入，避免 Node 读到半张图。"""

from __future__ import annotations

import hashlib
import os
import re
import urllib.parse
from pathlib import Path

import requests

SAFE_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$")
MAX_BYTES = 20 * 1024 * 1024


def filename_from_url(url: str) -> str:
    path = urllib.parse.urlparse(url).path
    name = path.rsplit("/", 1)[-1]
    if name and SAFE_NAME.match(name):
        return name
    return f"{hashlib.md5(url.encode('utf-8')).hexdigest()}.jpg"


def download_image(
    session: requests.Session,
    url: str,
    dest_dir: Path,
    timeout: float = 15.0,
) -> str:
    dest_dir.mkdir(parents=True, exist_ok=True)
    filename = filename_from_url(url)
    destination = dest_dir / filename

    if destination.exists() and destination.stat().st_size > 0:
        return filename

    partial = destination.with_suffix(destination.suffix + ".part")
    size = 0

    try:
        with session.get(
            url,
            stream=True,
            timeout=timeout,
            headers={"Referer": "https://www.bilibili.com/"},
        ) as response:
            response.raise_for_status()
            content_type = response.headers.get("Content-Type", "")
            if content_type and not content_type.lower().startswith("image/"):
                raise ValueError(f"头像地址返回的不是图片：{content_type}")

            with partial.open("wb") as file:
                for chunk in response.iter_content(chunk_size=64 * 1024):
                    if not chunk:
                        continue
                    size += len(chunk)
                    if size > MAX_BYTES:
                        raise ValueError("头像文件超过 20MB，已中止下载")
                    file.write(chunk)

        if size == 0:
            raise ValueError("头像下载为空文件")

        os.replace(partial, destination)
        return filename
    finally:
        if partial.exists():
            try:
                partial.unlink()
            except OSError:
                pass
