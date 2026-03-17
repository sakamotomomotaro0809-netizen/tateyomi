"""パーサーのテスト"""
import pytest
import zipfile
from pathlib import Path
import tempfile
import textwrap

from tateyomi.parsers.txt_parser import TxtParser
from tateyomi.parsers.epub_parser import EpubParser


# ──────────────────────────────────────────────────
# TxtParser
# ──────────────────────────────────────────────────
class TestTxtParser:
    def _write_tmp(self, content: str) -> Path:
        tmp = tempfile.NamedTemporaryFile(
            suffix=".txt", mode="w", encoding="utf-8", delete=False
        )
        tmp.write(content)
        tmp.close()
        return Path(tmp.name)

    def test_title_from_first_line(self):
        path = self._write_tmp("テストタイトル\n\n本文です。")
        book = TxtParser().parse(path)
        assert book.title == "テストタイトル"

    def test_chapter_detection(self):
        content = textwrap.dedent("""\
            テスト小説

            第一章　はじまり

            本文その一。

            第二章　おわり

            本文その二。
        """)
        path = self._write_tmp(content)
        book = TxtParser().parse(path)
        chapter_titles = [ch.title for ch in book.chapters]
        assert any("第一章" in t for t in chapter_titles)
        assert any("第二章" in t for t in chapter_titles)

    def test_aozora_detection(self):
        content = "夏目漱石\nこころ\n\n私《わたくし》は先生と呼んだ。\n"
        path = self._write_tmp(content)
        book = TxtParser().parse(path)
        # ルビが<ruby>タグに変換されているか確認
        all_html = " ".join(ch.html_content for ch in book.chapters)
        assert "<ruby>" in all_html

    def test_output_is_valid_xhtml(self):
        path = self._write_tmp("タイトル\n\n第一章\n\n本文です。\n")
        book = TxtParser().parse(path)
        for ch in book.chapters:
            assert ch.html_content.startswith("<?xml")
            assert 'xml:lang="ja"' in ch.html_content

    def test_empty_file(self):
        path = self._write_tmp("")
        book = TxtParser().parse(path)
        assert book.chapters  # 空でも最低1章

    def teardown_method(self, method):
        import glob, os
        for f in glob.glob(tempfile.gettempdir() + "/*.txt"):
            try:
                os.unlink(f)
            except Exception:
                pass


# ──────────────────────────────────────────────────
# EpubParser
# ──────────────────────────────────────────────────
class TestEpubParser:
    def _make_minimal_epub(self, title="テスト", author="著者", chapter_text="本文") -> Path:
        """最小構成のEPUB3を動的生成"""
        import ebooklib
        from ebooklib import epub as ebk

        book = ebk.EpubBook()
        book.set_title(title)
        book.add_author(author)
        book.set_language("ja")

        ch = ebk.EpubHtml(title="第一章", file_name="chapter001.xhtml", lang="ja")
        ch.content = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ja" lang="ja">
<head><meta charset="UTF-8"/><title>第一章</title></head>
<body><h1>第一章</h1><p>{chapter_text}</p></body>
</html>""".encode("utf-8")
        book.add_item(ch)
        book.spine = [ch]
        book.add_item(ebk.EpubNcx())

        tmp = tempfile.NamedTemporaryFile(suffix=".epub", delete=False)
        tmp.close()
        ebk.write_epub(tmp.name, book, {"ignore_ncx": False})
        return Path(tmp.name)

    def test_title_author(self):
        path = self._make_minimal_epub(title="吾輩は猫", author="漱石")
        book = EpubParser().parse(path)
        assert book.title == "吾輩は猫"
        assert book.author == "漱石"

    def test_chapters_parsed(self):
        path = self._make_minimal_epub()
        book = EpubParser().parse(path)
        assert len(book.chapters) >= 1

    def test_author_not_none_string(self):
        """author が文字列 'None' にならないことを確認"""
        path = self._make_minimal_epub(author="テスト著者")
        book = EpubParser().parse(path)
        assert book.author != "None"
        assert book.author == "テスト著者"

    def test_language_default_ja(self):
        path = self._make_minimal_epub()
        book = EpubParser().parse(path)
        assert book.language in ("ja", "")
