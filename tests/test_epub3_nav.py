"""
AW. EPUB3 landmarks / nav テスト
"""
from __future__ import annotations
import zipfile
import tempfile
from pathlib import Path
import pytest

from tateyomi.config import ParsedBook, Chapter


def _make_book(chapters: list[tuple[str, str]]) -> ParsedBook:
    """(chapter_id, title) のリストから ParsedBook を作る"""
    chs = [
        Chapter(
            chapter_id=cid,
            title=title,
            html_content=f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:epub="http://www.idpf.org/2007/ops"
      xml:lang="ja" lang="ja">
<head><meta charset="UTF-8"/><title>{title}</title></head>
<body><section class="chapter-break"><h1>{title}</h1><p>本文</p></section></body>
</html>""",
        )
        for cid, title in chapters
    ]
    return ParsedBook(title="テスト書籍", author="著者", chapters=chs)


def _render_epub(book: ParsedBook) -> zipfile.ZipFile:
    from tateyomi.renderers.epub3_renderer import render
    with tempfile.TemporaryDirectory() as d:
        out = Path(d) / "out.epub"
        render(book, out)
        # メモリ上で読む
        data = out.read_bytes()
    import io
    return zipfile.ZipFile(io.BytesIO(data))


# ─────────────────────────────────────────
# landmarks テスト
# ─────────────────────────────────────────
class TestLandmarks:
    def test_landmarks_nav_present(self):
        book = _make_book([("ch001", "第1章"), ("ch002", "第2章")])
        zf = _render_epub(book)
        nav = zf.read("OEBPS/nav.xhtml").decode("utf-8")
        assert 'epub:type="landmarks"' in nav

    def test_bodymatter_landmark(self):
        book = _make_book([("ch001", "第1章"), ("ch002", "第2章")])
        zf = _render_epub(book)
        nav = zf.read("OEBPS/nav.xhtml").decode("utf-8")
        assert 'epub:type="bodymatter"' in nav

    def test_toc_landmark(self):
        book = _make_book([("ch001", "第1章")])
        zf = _render_epub(book)
        nav = zf.read("OEBPS/nav.xhtml").decode("utf-8")
        assert 'epub:type="toc"' in nav

    def test_frontmatter_detected_maegaki(self):
        book = _make_book([("pre", "まえがき"), ("ch001", "第1章")])
        zf = _render_epub(book)
        nav = zf.read("OEBPS/nav.xhtml").decode("utf-8")
        assert 'epub:type="frontmatter"' in nav

    def test_backmatter_detected_atogaki(self):
        book = _make_book([("ch001", "第1章"), ("aft", "あとがき")])
        zf = _render_epub(book)
        nav = zf.read("OEBPS/nav.xhtml").decode("utf-8")
        assert 'epub:type="backmatter"' in nav

    def test_page_list_nav_present(self):
        book = _make_book([("ch001", "第1章")])
        zf = _render_epub(book)
        nav = zf.read("OEBPS/nav.xhtml").decode("utf-8")
        assert 'epub:type="page-list"' in nav

    def test_toc_nav_items(self):
        book = _make_book([("ch001", "第1章"), ("ch002", "第2章"), ("ch003", "第3章")])
        zf = _render_epub(book)
        nav = zf.read("OEBPS/nav.xhtml").decode("utf-8")
        assert "第1章" in nav
        assert "第2章" in nav
        assert "第3章" in nav


# ─────────────────────────────────────────
# epub:type 自動判定テスト
# ─────────────────────────────────────────
class TestEpubTypeDetection:
    def _type(self, title: str) -> str:
        from tateyomi.renderers.epub3_renderer import _epub_type_for_chapter
        return _epub_type_for_chapter(title, 0, 3)

    def test_bodymatter_default(self):
        assert self._type("第1章") == "bodymatter"

    def test_frontmatter_maegaki(self):
        assert self._type("まえがき") == "frontmatter"

    def test_frontmatter_haji_ni(self):
        assert self._type("はじめに") == "frontmatter"

    def test_frontmatter_joshoo(self):
        assert self._type("序章") == "frontmatter"

    def test_frontmatter_prologue(self):
        assert self._type("プロローグ") == "frontmatter"

    def test_backmatter_atogaki(self):
        assert self._type("あとがき") == "backmatter"

    def test_backmatter_index(self):
        assert self._type("索引") == "backmatter"

    def test_backmatter_appendix(self):
        assert self._type("付録") == "backmatter"

    def test_backmatter_author_intro(self):
        assert self._type("著者紹介") == "backmatter"

    def test_bodymatter_chapter(self):
        assert self._type("第5章　解説") == "bodymatter"


# ─────────────────────────────────────────
# section epub:type 注入テスト
# ─────────────────────────────────────────
class TestSectionEpubType:
    def test_chapter_section_type_set(self):
        book = _make_book([("ch001", "第1章")])
        zf = _render_epub(book)
        ch = zf.read("OEBPS/Text/ch001.xhtml").decode("utf-8")
        assert 'epub:type="chapter"' in ch

    def test_frontmatter_section_type_set(self):
        book = _make_book([("pre", "まえがき"), ("ch001", "第1章")])
        zf = _render_epub(book)
        pre = zf.read("OEBPS/Text/pre.xhtml").decode("utf-8")
        assert 'epub:type="frontmatter"' in pre

    def test_backmatter_section_type_set(self):
        book = _make_book([("ch001", "第1章"), ("aft", "あとがき")])
        zf = _render_epub(book)
        aft = zf.read("OEBPS/Text/aft.xhtml").decode("utf-8")
        assert 'epub:type="backmatter"' in aft


# ─────────────────────────────────────────
# toc.ncx ネスト深度テスト
# ─────────────────────────────────────────
class TestTocNcx:
    def test_depth_1_without_h2(self):
        book = _make_book([("ch001", "第1章"), ("ch002", "第2章")])
        zf = _render_epub(book)
        ncx = zf.read("OEBPS/toc.ncx").decode("utf-8")
        assert 'content="1"' in ncx or 'dtb:depth" content="1"' in ncx

    def test_depth_2_with_h2(self):
        ch = Chapter(
            chapter_id="ch001",
            title="第1章",
            html_content="""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:epub="http://www.idpf.org/2007/ops"
      xml:lang="ja" lang="ja">
<head><meta charset="UTF-8"/><title>第1章</title></head>
<body><section class="chapter-break">
<h1>第1章</h1><h2>第一節</h2><p>本文</p></section></body>
</html>""",
        )
        book = ParsedBook(title="テスト", author="著者", chapters=[ch])
        zf = _render_epub(book)
        ncx = zf.read("OEBPS/toc.ncx").decode("utf-8")
        assert 'content="2"' in ncx
        assert "第一節" in ncx

    def test_nav_points_ordered(self):
        book = _make_book([("ch001", "第1章"), ("ch002", "第2章"), ("ch003", "第3章")])
        zf = _render_epub(book)
        ncx = zf.read("OEBPS/toc.ncx").decode("utf-8")
        pos1 = ncx.index("ch001")
        pos2 = ncx.index("ch002")
        pos3 = ncx.index("ch003")
        assert pos1 < pos2 < pos3

    def test_cover_spine_properties(self):
        """表紙ページが page-spread-center を持つ"""
        from tateyomi.config import ImageItem
        book = ParsedBook(
            title="T", author="A",
            chapters=[Chapter(chapter_id="ch001", title="ch1",
                               html_content="<html><body></body></html>")],
            images=[ImageItem(item_id="cover-img", href="Images/cover.png", media_type="image/png", data=b"PNG")],
            cover_image_href="Images/cover.png",
        )
        zf = _render_epub(book)
        opf = zf.read("OEBPS/content.opf").decode("utf-8")
        assert "page-spread-center" in opf
