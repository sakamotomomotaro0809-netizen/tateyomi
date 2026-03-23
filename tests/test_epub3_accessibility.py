"""
BH. EPUB Accessibility 1.1 メタデータ テスト
"""
from __future__ import annotations
import zipfile
import tempfile
from pathlib import Path

import pytest

from tateyomi.config import ParsedBook, Chapter, ImageItem


def _make_book(chapters=None, images=None) -> ParsedBook:
    if chapters is None:
        chapters = [("ch001", "第1章")]
    chs = [
        Chapter(
            chapter_id=cid,
            title=title,
            html_content=(
                f'<?xml version="1.0" encoding="UTF-8"?>'
                f'<!DOCTYPE html>'
                f'<html xmlns="http://www.w3.org/1999/xhtml"'
                f' xmlns:epub="http://www.idpf.org/2007/ops"'
                f' xml:lang="ja" lang="ja">'
                f'<head><meta charset="UTF-8"/><title>{title}</title></head>'
                f'<body><section class="chapter-break"><h1>{title}</h1>'
                f'<p>本文</p></section></body></html>'
            ),
        )
        for cid, title in chapters
    ]
    book = ParsedBook(title="テスト書籍", author="著者", chapters=chs)
    if images:
        book.images = images
    return book


def _render_opf(book: ParsedBook) -> str:
    """OPF 文字列を取得する"""
    from tateyomi.renderers.epub3_renderer import render
    with tempfile.TemporaryDirectory() as d:
        out = Path(d) / "out.epub"
        render(book, out)
        data = out.read_bytes()
    import io
    zf = zipfile.ZipFile(io.BytesIO(data))
    return zf.read("OEBPS/content.opf").decode("utf-8")


# ── schema: prefix ─────────────────────────────────────────────────────────

class TestSchemaPrefix:
    def test_package_has_schema_prefix(self):
        opf = _render_opf(_make_book())
        assert 'prefix="schema: http://schema.org/"' in opf

    def test_package_still_has_dc_namespace(self):
        opf = _render_opf(_make_book())
        assert 'xmlns:dc="http://purl.org/dc/elements/1.1/"' in opf


# ── accessMode ─────────────────────────────────────────────────────────────

class TestAccessMode:
    def test_textual_always_present(self):
        opf = _render_opf(_make_book())
        assert '<meta property="schema:accessMode">textual</meta>' in opf

    def test_visual_absent_without_images(self):
        book = _make_book()
        book.images = []
        opf = _render_opf(book)
        assert '<meta property="schema:accessMode">visual</meta>' not in opf

    def test_visual_present_with_images(self):
        img = ImageItem(
            item_id="img001",
            href="Images/fig01.png",
            media_type="image/png",
            data=b"\x89PNG\r\n\x1a\n",
        )
        book = _make_book(images=[img])
        opf = _render_opf(book)
        assert '<meta property="schema:accessMode">visual</meta>' in opf

    def test_accessmode_sufficient_textual(self):
        opf = _render_opf(_make_book())
        assert '<meta property="schema:accessModeSufficient">textual</meta>' in opf


# ── accessibilityFeature ────────────────────────────────────────────────────

class TestAccessibilityFeature:
    def test_structural_navigation(self):
        opf = _render_opf(_make_book())
        assert (
            '<meta property="schema:accessibilityFeature">'
            "structuralNavigation</meta>"
        ) in opf

    def test_table_of_contents(self):
        opf = _render_opf(_make_book())
        assert (
            '<meta property="schema:accessibilityFeature">'
            "tableOfContents</meta>"
        ) in opf

    def test_reading_order(self):
        opf = _render_opf(_make_book())
        assert (
            '<meta property="schema:accessibilityFeature">'
            "readingOrder</meta>"
        ) in opf

    def test_alternative_text_absent_without_images(self):
        book = _make_book()
        book.images = []
        opf = _render_opf(book)
        assert "alternativeText" not in opf

    def test_alternative_text_present_with_images(self):
        img = ImageItem(
            item_id="img001",
            href="Images/fig01.png",
            media_type="image/png",
            data=b"\x89PNG\r\n\x1a\n",
        )
        book = _make_book(images=[img])
        opf = _render_opf(book)
        assert "alternativeText" in opf


# ── accessibilityHazard / accessibilitySummary / conformsTo ────────────────

class TestA11yMiscMeta:
    def test_hazard_none(self):
        opf = _render_opf(_make_book())
        assert (
            '<meta property="schema:accessibilityHazard">none</meta>'
        ) in opf

    def test_accessibility_summary_present(self):
        opf = _render_opf(_make_book())
        assert 'property="schema:accessibilitySummary"' in opf

    def test_conforms_to_epub_accessibility(self):
        opf = _render_opf(_make_book())
        assert "EPUB Accessibility 1.1" in opf
        assert 'property="dcterms:conformsTo"' in opf

    def test_conforms_to_wcag(self):
        opf = _render_opf(_make_book())
        assert "WCAG 2.1" in opf


# ── 順序確認（既存メタデータの後に追記されること）─────────────────────────

class TestA11yMetaOrder:
    def test_accessibility_meta_after_writing_mode(self):
        opf = _render_opf(_make_book())
        writing_mode_pos = opf.find("primary-writing-mode")
        schema_pos = opf.find("schema:accessMode")
        assert writing_mode_pos != -1
        assert schema_pos != -1
        assert schema_pos > writing_mode_pos
