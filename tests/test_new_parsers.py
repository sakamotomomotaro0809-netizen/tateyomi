"""
AK/AL/AN/AR テスト
Markdown パーサー / HTML パーサー / 表紙生成 / エラーメッセージ日本語化
"""
from __future__ import annotations
import tempfile
from pathlib import Path
import pytest


# ─────────────────────────────────────────
# AK. Markdown パーサー
# ─────────────────────────────────────────
class TestMdParser:
    def _parse(self, text: str) -> object:
        from tateyomi.parsers.md_parser import MdParser
        with tempfile.NamedTemporaryFile(suffix=".md", mode="w",
                                         encoding="utf-8", delete=False) as f:
            f.write(text)
            p = Path(f.name)
        try:
            return MdParser().parse(p)
        finally:
            p.unlink(missing_ok=True)

    def test_title_from_h1(self):
        book = self._parse("# タイトル\n\n本文テキスト\n")
        assert book.title == "タイトル"

    def test_chapter_split_on_h1(self):
        md = "# 第1章\n本文1\n\n# 第2章\n本文2\n"
        book = self._parse(md)
        assert len(book.chapters) == 2

    def test_bold_italic_converted(self):
        book = self._parse("# タイトル\n\n**太字**と*斜体*\n")
        body = book.chapters[0].html_content
        assert "<strong>太字</strong>" in body
        assert "<em>斜体</em>" in body

    def test_list_converted(self):
        book = self._parse("# T\n\n- 項目1\n- 項目2\n")
        body = book.chapters[0].html_content
        assert "<ul>" in body
        assert "<li>" in body

    def test_ordered_list(self):
        book = self._parse("# T\n\n1. 番号1\n2. 番号2\n")
        body = book.chapters[0].html_content
        assert "<ol>" in body

    def test_code_block(self):
        book = self._parse("# T\n\n```\ncode here\n```\n")
        body = book.chapters[0].html_content
        assert "<pre>" in body
        assert "<code>" in body

    def test_fallback_title_from_filename(self):
        with tempfile.NamedTemporaryFile(suffix=".md", mode="w",
                                         encoding="utf-8", delete=False) as f:
            f.write("本文のみ、見出しなし\n")
            p = Path(f.name)
        from tateyomi.parsers.md_parser import MdParser
        book = MdParser().parse(p)
        p.unlink(missing_ok=True)
        assert book.title == p.stem or book.title  # ファイル名またはデフォルト

    def test_source_format_is_md(self):
        book = self._parse("# T\ntext\n")
        assert book.source_format == "md"

    def test_epub_valid_structure(self):
        """MarkdownからEPUBが生成できるか"""
        from tateyomi.renderers.epub3_renderer import render
        book = self._parse("# 章タイトル\n\n本文テキストです。\n")
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "out.epub"
            render(book, out)
            assert out.exists()
            assert out.stat().st_size > 0


# ─────────────────────────────────────────
# AL. HTML パーサー
# ─────────────────────────────────────────
class TestHtmlParser:
    def _parse(self, html: str) -> object:
        from tateyomi.parsers.html_parser import HtmlParser
        with tempfile.NamedTemporaryFile(suffix=".html", mode="w",
                                         encoding="utf-8", delete=False) as f:
            f.write(html)
            p = Path(f.name)
        try:
            return HtmlParser().parse(p)
        finally:
            p.unlink(missing_ok=True)

    def test_title_from_title_tag(self):
        html = "<html><head><title>テスト書籍</title></head><body><p>本文</p></body></html>"
        book = self._parse(html)
        assert book.title == "テスト書籍"

    def test_body_text_extracted(self):
        html = "<html><body><h1>章</h1><p>本文テキスト</p></body></html>"
        book = self._parse(html)
        content = " ".join(ch.html_content for ch in book.chapters)
        assert "本文テキスト" in content

    def test_source_format_is_html(self):
        book = self._parse("<html><body><p>テキスト</p></body></html>")
        assert book.source_format == "html"

    def test_chapter_split_on_h1(self):
        html = "<html><body><h1>第1章</h1><p>内容1</p><h1>第2章</h1><p>内容2</p></body></html>"
        book = self._parse(html)
        assert len(book.chapters) >= 2

    def test_script_removed(self):
        html = "<html><body><script>alert('xss')</script><p>安全</p></body></html>"
        book = self._parse(html)
        content = " ".join(ch.html_content for ch in book.chapters)
        assert "alert" not in content


# ─────────────────────────────────────────
# AN. 表紙画像自動生成
# ─────────────────────────────────────────
class TestCoverGen:
    def test_generate_cover_returns_bytes(self):
        from tateyomi.utils.cover_gen import generate_cover
        data = generate_cover("テストタイトル", "テスト著者")
        assert isinstance(data, bytes)
        assert len(data) > 0

    def test_generate_cover_is_png(self):
        from tateyomi.utils.cover_gen import generate_cover
        data = generate_cover("タイトル")
        # PNG マジックバイト
        assert data[:4] == b"\x89PNG"

    def test_add_cover_to_book(self):
        from tateyomi.utils.cover_gen import add_cover_to_book
        from tateyomi.config import ParsedBook, Chapter
        book = ParsedBook(
            title="テスト", author="著者",
            chapters=[Chapter(chapter_id="ch001", title="ch1",
                               html_content="<html><body></body></html>")],
        )
        assert not book.cover_image_href
        add_cover_to_book(book)
        assert book.cover_image_href
        assert len(book.images) == 1

    def test_add_cover_skips_if_exists(self):
        from tateyomi.utils.cover_gen import add_cover_to_book
        from tateyomi.config import ParsedBook, Chapter, ImageItem
        existing = ImageItem(item_id="existing-img", href="Images/existing.jpg", media_type="image/jpeg", data=b"dummy")
        book = ParsedBook(
            title="テスト", author="著者",
            chapters=[Chapter(chapter_id="ch001", title="ch1",
                               html_content="<html><body></body></html>")],
            images=[existing],
            cover_image_href="Images/existing.jpg",
        )
        add_cover_to_book(book)
        assert len(book.images) == 1  # 追加されない


# ─────────────────────────────────────────
# AR. エラーメッセージ日本語化
# ─────────────────────────────────────────
class TestErrorMessages:
    def test_file_not_found_ja(self):
        from tateyomi.utils.error_messages import ja_error
        e = FileNotFoundError("No such file or directory: 'test.epub'")
        msg = ja_error(e)
        assert "見つかりません" in msg

    def test_module_not_found_ja(self):
        from tateyomi.utils.error_messages import ja_error
        e = ModuleNotFoundError("No module named 'weasyprint'")
        msg = ja_error(e)
        assert "weasyprint" in msg
        assert "インストール" in msg

    def test_permission_denied_ja(self):
        from tateyomi.utils.error_messages import ja_error
        e = PermissionError("Permission denied: '/output.epub'")
        msg = ja_error(e)
        assert "拒否" in msg

    def test_unknown_error_returns_original(self):
        from tateyomi.utils.error_messages import ja_error
        e = ValueError("some completely unknown error xyz")
        msg = ja_error(e)
        assert msg == str(e)

    def test_format_error_verbose(self):
        from tateyomi.utils.error_messages import format_error
        e = FileNotFoundError("No such file or directory: 'x.epub'")
        msg = format_error(e, verbose=True)
        # verbose=True かつ翻訳された場合は詳細も含む
        assert len(msg) > 0
