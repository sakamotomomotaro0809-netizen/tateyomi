"""レンダラーのテスト"""
import pytest
import zipfile
import tempfile
from pathlib import Path

from tateyomi.config import ParsedBook, Chapter, ImageItem
from tateyomi.renderers.epub3_renderer import render as epub_render
from tateyomi.renderers.html_renderer import render as html_render


def _make_book(num_chapters: int = 2) -> ParsedBook:
    chapters = [
        Chapter(
            chapter_id=f"chapter{i+1:03d}",
            title=f"第{i+1}章",
            html_content=f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:epub="http://www.idpf.org/2007/ops"
      xml:lang="ja" lang="ja">
<head><meta charset="UTF-8"/><title>第{i+1}章</title>
<link rel="stylesheet" href="../Styles/tateyomi.css"/>
</head>
<body epub:type="bodymatter">
<section class="chapter-break"><h1>第{i+1}章</h1>
<p>テスト本文テキスト。縦書きのテストです。</p>
</section></body></html>""",
        )
        for i in range(num_chapters)
    ]
    return ParsedBook(
        title="テスト書籍",
        author="テスト著者",
        language="ja",
        uid="test-uid-1234",
        chapters=chapters,
    )


class TestEpub3Renderer:
    def test_output_file_created(self):
        book = _make_book()
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "test.epub"
            epub_render(book, out)
            assert out.exists()
            assert out.stat().st_size > 1000

    def test_valid_epub_structure(self):
        book = _make_book()
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "test.epub"
            epub_render(book, out)
            with zipfile.ZipFile(str(out)) as z:
                names = z.namelist()
                assert "mimetype" in names
                assert "META-INF/container.xml" in names
                assert "OEBPS/content.opf" in names
                assert "OEBPS/nav.xhtml" in names
                assert "OEBPS/toc.ncx" in names

    def test_rtl_page_progression(self):
        """spine に page-progression-direction="rtl" が設定されているか"""
        book = _make_book()
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "test.epub"
            epub_render(book, out)
            with zipfile.ZipFile(str(out)) as z:
                opf = z.read("OEBPS/content.opf").decode("utf-8")
            assert 'page-progression-direction="rtl"' in opf

    def test_writing_mode_in_opf_meta(self):
        """OPFに primary-writing-mode: vertical-rl が含まれているか"""
        book = _make_book()
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "test.epub"
            epub_render(book, out)
            with zipfile.ZipFile(str(out)) as z:
                opf = z.read("OEBPS/content.opf").decode("utf-8")
            assert "vertical-rl" in opf

    def test_chapters_in_spine(self):
        book = _make_book(num_chapters=3)
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "test.epub"
            epub_render(book, out)
            with zipfile.ZipFile(str(out)) as z:
                opf = z.read("OEBPS/content.opf").decode("utf-8")
            assert "chapter001" in opf
            assert "chapter002" in opf
            assert "chapter003" in opf

    def test_css_included(self):
        book = _make_book()
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "test.epub"
            epub_render(book, out)
            with zipfile.ZipFile(str(out)) as z:
                names = z.namelist()
            assert "OEBPS/Styles/tateyomi.css" in names
            assert "OEBPS/Styles/kindle-overrides.css" in names

    def test_images_included(self):
        book = _make_book()
        book.images.append(ImageItem(
            item_id="img001",
            href="Images/test.png",
            media_type="image/png",
            data=b"\x89PNG\r\n\x1a\n" + b"\x00" * 100,
        ))
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "test.epub"
            epub_render(book, out)
            with zipfile.ZipFile(str(out)) as z:
                assert "OEBPS/Images/test.png" in z.namelist()

    def test_metadata_in_opf(self):
        book = _make_book()
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "test.epub"
            epub_render(book, out)
            with zipfile.ZipFile(str(out)) as z:
                opf = z.read("OEBPS/content.opf").decode("utf-8")
            assert "テスト書籍" in opf
            assert "テスト著者" in opf


class TestHtmlRenderer:
    def test_output_file_created(self):
        book = _make_book()
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "test.html"
            html_render(book, out)
            assert out.exists()

    def test_writing_mode_in_html(self):
        book = _make_book()
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "test.html"
            html_render(book, out)
            content = out.read_text(encoding="utf-8")
        assert "writing-mode" in content
        assert "vertical-rl" in content

    def test_title_in_html(self):
        book = _make_book()
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "test.html"
            html_render(book, out)
            content = out.read_text(encoding="utf-8")
        assert "テスト書籍" in content
