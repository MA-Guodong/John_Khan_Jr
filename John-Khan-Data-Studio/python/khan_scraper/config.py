"""配置加载：环境变量优先，其次读取项目根目录与 python/ 下的 .env。"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

PYTHON_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = PYTHON_DIR.parent

DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)


def _load_env_file(path: Path) -> None:
    """极简 .env 解析：KEY=VALUE，忽略注释与空行，不覆盖已有环境变量。"""
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            os.environ.setdefault(key, value)


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def _env_float(name: str, default: float) -> float:
    try:
        return float(_env(name, str(default)))
    except ValueError:
        return default


def _env_int(name: str, default: int) -> int:
    try:
        return int(_env(name, str(default)))
    except ValueError:
        return default


def _resolve_path(value: str, fallback: Path) -> Path:
    if not value:
        return fallback
    path = Path(value).expanduser()
    if not path.is_absolute():
        path = (PYTHON_DIR / path).resolve()
    return path


@dataclass(frozen=True)
class Settings:
    db_path: Path
    avatar_dir: Path
    mid: str
    cookie: str
    timeout: float
    retries: int
    request_delay: float
    video_page_size: int
    log_level: str
    user_agent: str

    @classmethod
    def load(cls) -> "Settings":
        _load_env_file(PROJECT_ROOT / ".env")
        _load_env_file(PYTHON_DIR / ".env")

        return cls(
            db_path=_resolve_path(
                _env("KHAN_DB_PATH"),
                PROJECT_ROOT / "server" / "data" / "khan.db",
            ),
            avatar_dir=_resolve_path(
                _env("KHAN_AVATAR_DIR"),
                PROJECT_ROOT / "web" / "public" / "images",
            ),
            mid=_env("KHAN_MID", "23947287") or "23947287",
            cookie=_env("KHAN_COOKIE"),
            timeout=_env_float("KHAN_HTTP_TIMEOUT", 15.0),
            retries=max(1, _env_int("KHAN_RETRIES", 3)),
            request_delay=max(0.0, _env_float("KHAN_REQUEST_DELAY", 1.0)),
            video_page_size=max(1, min(50, _env_int("KHAN_VIDEO_PAGE_SIZE", 20))),
            log_level=_env("KHAN_LOG_LEVEL", "INFO").upper(),
            user_agent=_env("KHAN_USER_AGENT", DEFAULT_USER_AGENT) or DEFAULT_USER_AGENT,
        )
