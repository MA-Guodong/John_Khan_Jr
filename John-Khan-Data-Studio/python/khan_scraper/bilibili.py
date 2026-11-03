"""B 站接口封装：WBI 签名、签名/头像卡片、投稿视频列表。

只依赖 requests；所有网络错误都会转成带提示的 BilibiliError，
方便定时任务在日志里直接看到「该配 Cookie 了」之类的信息。
"""

from __future__ import annotations

import hashlib
import time
import urllib.parse
from dataclasses import dataclass
from datetime import datetime, timedelta
from functools import reduce
from typing import Any, Dict, List, Optional, Sequence, Tuple

import requests

from .config import Settings

CARD_URL = "https://api.bilibili.com/x/web-interface/card"
NAV_URL = "https://api.bilibili.com/x/web-interface/nav"
SPI_URL = "https://api.bilibili.com/x/frontend/finger/spi"
SPACE_ARC_URL = "https://api.bilibili.com/x/space/wbi/arc/search"
HOME_URL = "https://www.bilibili.com/"

MIXIN_KEY_ENC_TAB = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
    33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
    61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
    36, 20, 34, 44, 52,
]

COOKIE_HINT = (
    "B 站接口触发了风控。请在浏览器登录 B 站后，从开发者工具复制完整 Cookie，"
    "写入 python/.env 的 KHAN_COOKIE（一行即可），再重试。"
)


class BilibiliError(RuntimeError):
    def __init__(self, message: str, code: Optional[int] = None, hint: Optional[str] = None):
        super().__init__(message)
        self.code = code
        self.hint = hint

    def __str__(self) -> str:
        base = super().__str__()
        return f"{base}（code={self.code}）" if self.code is not None else base


@dataclass
class Profile:
    sign: str
    face_url: str


@dataclass
class VideoItem:
    bvid: str
    title: str
    url: str
    cover_url: str
    created_at: str
    duration_seconds: int


def parse_duration(value: Any) -> int:
    """把 B 站的 "19:09" / "01:02:03" 转成秒。"""
    if value is None:
        return 0
    if isinstance(value, timedelta):
        return max(0, int(value.total_seconds()))
    if isinstance(value, (int, float)):
        return max(0, int(value))

    text = str(value).strip()
    if not text:
        return 0
    if text.isdigit():
        return int(text)

    parts = text.split(":")
    try:
        numbers = [int(part) for part in parts]
    except ValueError:
        return 0

    if len(numbers) == 3:
        return max(0, numbers[0] * 3600 + numbers[1] * 60 + numbers[2])
    if len(numbers) == 2:
        return max(0, numbers[0] * 60 + numbers[1])
    return max(0, numbers[0])


def format_timestamp(timestamp: Any) -> str:
    """B 站返回的是 Unix 秒，按服务器本地时区格式化（与 Node 的存储格式一致）。"""
    try:
        return datetime.fromtimestamp(int(timestamp)).strftime("%Y-%m-%d %H:%M:%S")
    except (TypeError, ValueError, OSError):
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def normalize_url(url: str) -> str:
    if not url:
        return ""
    if url.startswith("//"):
        return f"https:{url}"
    if url.startswith("http://"):
        return f"https://{url[len('http://'):]}"
    return url


def get_mixin_key(orig: str) -> str:
    if len(orig) < 64:
        raise BilibiliError("WBI 密钥长度异常，请稍后重试", hint=COOKIE_HINT)
    return reduce(lambda acc, index: acc + orig[index], MIXIN_KEY_ENC_TAB, "")[:32]


def sign_wbi(params: Dict[str, Any], img_key: str, sub_key: str, timestamp: Optional[int] = None) -> Dict[str, str]:
    mixin_key = get_mixin_key(img_key + sub_key)
    signed = {key: value for key, value in params.items()}
    signed["wts"] = int(timestamp if timestamp is not None else time.time())
    signed = dict(sorted(signed.items()))
    cleaned = {
        key: "".join(ch for ch in str(value) if ch not in "!'()*")
        for key, value in signed.items()
    }
    query = urllib.parse.urlencode(cleaned)
    cleaned["w_rid"] = hashlib.md5((query + mixin_key).encode()).hexdigest()
    return cleaned


class BilibiliClient:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": settings.user_agent,
                "Referer": "https://www.bilibili.com/",
                "Origin": "https://www.bilibili.com",
                "Accept": "application/json, text/plain, */*",
                "Accept-Language": "zh-CN,zh;q=0.9",
            }
        )
        self._bootstrapped = False
        self._wbi_keys: Optional[Tuple[str, str]] = None

        if settings.cookie:
            self._apply_cookie(settings.cookie)

    def _apply_cookie(self, raw_cookie: str) -> None:
        for part in raw_cookie.split(";"):
            if "=" not in part:
                continue
            key, value = part.split("=", 1)
            key = key.strip()
            value = value.strip()
            if key:
                self.session.cookies.set(key, value, domain=".bilibili.com")

    def _bootstrap(self) -> None:
        """拿 buvid3 / buvid4，降低「未登录直接访问接口」的风控概率。"""
        if self._bootstrapped:
            return
        self._bootstrapped = True

        # 用户提供了完整 Cookie 时，保留其中的 buvid3 / buvid4 / buvid_fp 指纹；
        # 再去请求首页/SPI 会用新的 buvid 覆盖它们，反而更容易触发风控。
        if self.settings.cookie:
            return

        try:
            self.session.get(HOME_URL, timeout=self.settings.timeout)
        except requests.RequestException:
            pass

        try:
            spi = self.session.get(SPI_URL, timeout=self.settings.timeout).json()
            data = spi.get("data") or {}
            if data.get("b_3"):
                self.session.cookies.set("buvid3", data["b_3"], domain=".bilibili.com")
            if data.get("b_4"):
                self.session.cookies.set("buvid4", data["b_4"], domain=".bilibili.com")
            self.session.cookies.set("b_nut", str(int(time.time())), domain=".bilibili.com")
        except (requests.RequestException, ValueError):
            pass

        time.sleep(min(self.settings.request_delay, 1.0))

    def _request_json(
        self,
        url: str,
        params: Optional[Dict[str, Any]] = None,
        referer: Optional[str] = None,
        allow_codes: Sequence[int] = (),
    ) -> Dict[str, Any]:
        headers = {"Referer": referer} if referer else None
        last_error: Optional[Exception] = None

        for attempt in range(1, self.settings.retries + 1):
            try:
                response = self.session.get(
                    url,
                    params=params,
                    headers=headers,
                    timeout=self.settings.timeout,
                )
                if response.status_code == 412:
                    if attempt < self.settings.retries:
                        time.sleep(self.settings.request_delay * attempt * 2)
                        continue
                    raise BilibiliError(
                        "请求被 B 站限制（HTTP 412）",
                        code=-412,
                        hint="稍后再试；如果经常出现，请更换出口 IP 或配置 KHAN_COOKIE。",
                    )
                response.raise_for_status()
                payload = response.json()
            except BilibiliError:
                raise
            except (requests.RequestException, ValueError) as error:
                last_error = error
                if attempt < self.settings.retries:
                    time.sleep(self.settings.request_delay * attempt)
                    continue
                raise BilibiliError(f"请求 B 站失败：{error}") from error

            code = payload.get("code", 0)
            if code == 0 or code in allow_codes:
                return payload

            # -352 / -412 属于风控，可能是瞬时的，先重试再报错。
            if code in (-352, -412) and attempt < self.settings.retries:
                time.sleep(self.settings.request_delay * attempt * 2)
                continue

            hint = None
            if code in (-352, -401, -403):
                hint = COOKIE_HINT
            elif code == -412:
                hint = "稍后再试；如果经常出现，请更换出口 IP 或配置 KHAN_COOKIE。"
            elif code == -101:
                hint = "该接口需要登录，请配置 KHAN_COOKIE。"

            raise BilibiliError(payload.get("message") or "B 站接口返回错误", code=code, hint=hint)

        raise BilibiliError(f"请求 B 站失败：{last_error}")

    def get_profile(self) -> Profile:
        self._bootstrap()
        payload = self._request_json(
            CARD_URL,
            params={"mid": self.settings.mid},
            referer=f"https://space.bilibili.com/{self.settings.mid}",
        )
        card = (payload.get("data") or {}).get("card") or {}
        sign = (card.get("sign") or "").strip()
        face = normalize_url(card.get("face") or "")
        if not face:
            raise BilibiliError("B 站卡片接口没有返回头像地址")
        return Profile(sign=sign, face_url=face)

    def _get_wbi_keys(self) -> Tuple[str, str]:
        if self._wbi_keys:
            return self._wbi_keys

        payload = self._request_json(NAV_URL, allow_codes=(-101,))
        wbi = (payload.get("data") or {}).get("wbi_img") or {}
        img_url = wbi.get("img_url") or ""
        sub_url = wbi.get("sub_url") or ""
        if not img_url or not sub_url:
            raise BilibiliError("无法获取 WBI 签名密钥", hint=COOKIE_HINT)

        img_key = img_url.rsplit("/", 1)[-1].split(".")[0]
        sub_key = sub_url.rsplit("/", 1)[-1].split(".")[0]
        self._wbi_keys = (img_key, sub_key)
        return self._wbi_keys

    def get_videos(self, page: int = 1, page_size: Optional[int] = None) -> List[VideoItem]:
        self._bootstrap()
        img_key, sub_key = self._get_wbi_keys()
        params = sign_wbi(
            {
                "mid": self.settings.mid,
                "ps": page_size or self.settings.video_page_size,
                "pn": max(1, page),
            },
            img_key,
            sub_key,
        )

        payload = self._request_json(
            SPACE_ARC_URL,
            params=params,
            referer=f"https://space.bilibili.com/{self.settings.mid}/video",
        )
        vlist = ((payload.get("data") or {}).get("list") or {}).get("vlist") or []

        items: List[VideoItem] = []
        for entry in vlist:
            bvid = str(entry.get("bvid") or "").strip()
            if not bvid:
                continue
            items.append(
                VideoItem(
                    bvid=bvid,
                    title=str(entry.get("title") or "").strip(),
                    url=f"https://www.bilibili.com/video/{bvid}",
                    cover_url=normalize_url(str(entry.get("pic") or "")),
                    created_at=format_timestamp(entry.get("created")),
                    duration_seconds=parse_duration(entry.get("length")),
                )
            )
        return items
