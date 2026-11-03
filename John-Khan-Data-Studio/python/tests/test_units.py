"""不依赖网络的单元测试：编码修复、时长解析、数据库读写与 WBI 签名。"""

from __future__ import annotations

import tempfile
import unittest
from dataclasses import replace
from pathlib import Path

from khan_scraper import db
from khan_scraper.bilibili import normalize_url, parse_duration, sign_wbi
from khan_scraper.config import Settings
from khan_scraper.images import filename_from_url
from khan_scraper.migrate import map_sign_row, map_video_row, repair_text
from migrate_from_mysql import upsert_avatar, upsert_sign, upsert_video


class TextHelpersTest(unittest.TestCase):
    def test_repair_gbk_mojibake(self) -> None:
        self.assertEqual(repair_text("涓夊浗"), "三国")

    def test_repair_latin1_mojibake(self) -> None:
        broken = "三国".encode("utf-8").decode("latin1")
        self.assertEqual(repair_text(broken), "三国")

    def test_keep_normal_chinese(self) -> None:
        self.assertEqual(repair_text("苏联电影"), "苏联电影")

    def test_repair_none_mode(self) -> None:
        self.assertEqual(repair_text("涓夊浗", mode="none"), "涓夊浗")

    def test_parse_duration(self) -> None:
        self.assertEqual(parse_duration("19:09"), 19 * 60 + 9)
        self.assertEqual(parse_duration("01:02:03"), 3723)
        self.assertEqual(parse_duration("95"), 95)
        self.assertEqual(parse_duration(None), 0)

    def test_normalize_url(self) -> None:
        self.assertEqual(normalize_url("http://i0.hdslb.com/a.jpg"), "https://i0.hdslb.com/a.jpg")
        self.assertEqual(normalize_url("//i0.hdslb.com/a.jpg"), "https://i0.hdslb.com/a.jpg")

    def test_filename_from_url(self) -> None:
        self.assertEqual(filename_from_url("https://i0.hdslb.com/bfs/face/abc123.jpg"), "abc123.jpg")
        self.assertEqual(filename_from_url("https://i0.hdslb.com/a.jpg?x=1"), "a.jpg")
        self.assertTrue(filename_from_url("https://i0.hdslb.com/中文 名.jpg").endswith(".jpg"))

    def test_wbi_sign(self) -> None:
        img_key = "a" * 32
        sub_key = "b" * 32
        params = sign_wbi({"mid": "23947287", "ps": 20, "pn": 1}, img_key, sub_key, timestamp=1700000000)
        self.assertEqual(params["wts"], "1700000000")
        self.assertEqual(len(params["w_rid"]), 32)
        self.assertEqual(
            params,
            sign_wbi({"mid": "23947287", "ps": 20, "pn": 1}, img_key, sub_key, timestamp=1700000000),
        )


class MigrationMappingTest(unittest.TestCase):
    def test_map_video_row(self) -> None:
        row = map_video_row(
            {
                "id": 7,
                "video_title": "涓夊浗",
                "video_url": "https://www.bilibili.com/video/BV1xx",
                "video_cover": "http://i0.hdslb.com/a.jpg",
                "release_time": "2024-01-01 10:00:00",
                "video_duration": "19:09",
            }
        )
        self.assertEqual(row["title"], "三国")
        self.assertEqual(row["cover_url"], "https://i0.hdslb.com/a.jpg")
        self.assertEqual(row["duration_seconds"], 1149)

    def test_map_sign_row_empty(self) -> None:
        row = map_sign_row({"id": 1, "sign": "   ", "sign_time": "2024-01-01 10:00:00"})
        self.assertIsNone(row["content"])


class DatabaseTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        base = Path(self.temp_dir.name)
        self.settings = replace(
            Settings.load(),
            db_path=base / "test.db",
            avatar_dir=base / "images",
        )
        self.connection = db.connect(self.settings)
        db.ensure_schema(self.connection)

    def tearDown(self) -> None:
        self.connection.close()
        self.temp_dir.cleanup()

    def test_schema_and_counts(self) -> None:
        self.assertEqual(db.counts(self.connection), {"videos": 0, "signs": 0, "avatars": 0})

    def test_sign_insert_and_latest(self) -> None:
        db.insert_sign(self.connection, "第一条", "2024-01-01 10:00:00")
        db.insert_sign(self.connection, "第二条", "2024-01-02 10:00:00")
        self.assertEqual(db.latest_sign_entry(self.connection)["content"], "第二条")
        self.assertEqual(db.counts(self.connection)["signs"], 2)

    def test_avatar_latest(self) -> None:
        db.insert_avatar(self.connection, "a.jpg", "2024-01-01 10:00:00")
        db.insert_avatar(self.connection, "b.jpg", "2024-01-02 10:00:00")
        self.assertEqual(db.latest_avatar_entry(self.connection)["image_file"], "b.jpg")

    def test_video_lookup_and_update(self) -> None:
        video_id = db.insert_video(
            self.connection,
            title="旧标题",
            url="https://www.bilibili.com/video/BV1xx",
            cover_url="https://example.com/a.jpg",
            published_at="2024-01-01 10:00:00",
            duration_seconds=100,
        )
        found = db.find_video_by_url(self.connection, "https://www.bilibili.com/video/BV1xx")
        self.assertIsNotNone(found)
        self.assertEqual(found["id"], video_id)

        db.update_video(self.connection, video_id, "新标题", "https://example.com/b.jpg", 200)
        refreshed = db.find_video_by_url(self.connection, "https://www.bilibili.com/video/BV1xx")
        self.assertEqual(refreshed["title"], "新标题")
        self.assertEqual(refreshed["duration_seconds"], 200)

    def test_autoincrement_id(self) -> None:
        first = db.insert_sign(self.connection, "a", "2024-01-01 10:00:00")
        second = db.insert_sign(self.connection, "b", "2024-01-02 10:00:00")
        self.assertEqual(second, first + 1)

    def test_migration_upsert_idempotent(self) -> None:
        video = {
            "id": 10,
            "title": "旧标题",
            "url": "https://www.bilibili.com/video/BV10",
            "cover_url": "https://example.com/10.jpg",
            "published_at": "2024-01-01 10:00:00",
            "duration_seconds": 100,
        }
        self.assertEqual(upsert_video(self.connection, video, replace=False), 1)
        self.assertEqual(upsert_video(self.connection, video, replace=False), 0)

        video["title"] = "新标题"
        self.assertEqual(upsert_video(self.connection, video, replace=True), 1)
        row = db.find_video_by_url(self.connection, video["url"])
        self.assertEqual(row["title"], "新标题")

        sign = {"id": 10, "content": "签名", "posted_at": "2024-01-01 10:00:00"}
        self.assertEqual(upsert_sign(self.connection, sign, replace=False), 1)
        self.assertEqual(upsert_sign(self.connection, sign, replace=False), 0)

        avatar = {"id": 10, "image_file": "a.jpg", "posted_at": "2024-01-01 10:00:00"}
        self.assertEqual(upsert_avatar(self.connection, avatar, replace=False), 1)
        self.assertEqual(upsert_avatar(self.connection, avatar, replace=False), 0)


if __name__ == "__main__":
    unittest.main()
