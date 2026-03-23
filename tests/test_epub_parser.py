"""
EPUBパーサーのテスト
CSS除去・表紙検出・spine順チャプター抽出
"""
from __future__ import annotations
import zipfile
import io
import tempfile
from pathlib import Path
import pytest


def _make_minimal_epub(
    title: str = "テスト",
    author: str = "著者",
    chapters: list[tuple[str, str]] | None = None,
    with_stylesheet: bool = True,
) -> bytes:
    """
    最小限の EPUB2 ZIPをメモリ上に生成して bytes で返す。
    chapters: [(chapter_id, html_content), ...]
    """
    if chapters is None:
        chapters = [("ch001", "<p>本文テキスト</p>")]

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        # mimetype (非圧縮)
        zi = zipfile.ZipInfo("mimetype")
        zi.compress_type = zipfile.ZIP_STORED
        zf.writestr(zi, "application/epub+zip")

        # container.xml
        zf.writestr("META-INF/container.xml", """<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>""")

        # CSS
        if with_stylesheet:
            zf.writestr("OEBPS/Styles/original.css",
                        "body { writing-mode: horizontal-tb; font-size: 14px; }")

        # チャプター HTML
        css_link = '<link rel="stylesheet" href="../Styles/original.css"/>' if with_stylesheet else ""
        spine_items = []
        manifest_items = []
        for cid, body in chapters:
            html = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ja" lang="ja">
<head><meta charset="UTF-8"/><title>章</title>
{css_link}
<style>p {{ color: red; }}</style>
</head>
<body><h1>見出し</h1><p>{body}</p></body></html>"""
            zf.writestr(f"OEBPS/Text/{cid}.xhtml", html)
            manifest_items.append(
                f'<item id="{cid}" href="Text/{cid}.xhtml" media-type="application/xhtml+xml"/>'
            )
            spine_items.append(f'<itemref idref="{cid}"/>')

        # content.opf
        opf = f"""<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>{title}</dc:title>
    <dc:creator>{author}</dc:creator>
    <dc:language>ja</dc:language>
    <dc:identifier id="book-id">test-uid</dc:identifier>
  </metadata>
  <manifest>
    {''.join(manifest_items)}
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="ncx">
    {''.join(spine_items)}
  </spine>
</package>"""
        zf.writestr("OEBPS/content.opf", opf)

        # toc.ncx
        zf.writestr("OEBPS/toc.ncx", """<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="test-uid"/></head>
  <docTitle><text>テスト</text></docTitle>
  <navMap/>
</ncx>""")

    return buf.getvalue()


class TestEpubParser:
    def test_basic_parse(self, tmp_path):
        data = _make_minimal_epub()
        epub_path = tmp_path / "test.epub"
        epub_path.write_bytes(data)
        from tateyomi.parsers.epub_parser import EpubParser
        book = EpubParser().parse(epub_path)
        assert book.title == "テスト"
        assert book.author == "著者"
        assert len(book.chapters) >= 1

    def test_original_css_stripped(self, tmp_path):
        """元の CSS リンクが除去されているか"""
        data = _make_minimal_epub(with_stylesheet=True)
        epub_path = tmp_path / "test.epub"
        epub_path.write_bytes(data)
        from tateyomi.parsers.epub_parser import EpubParser
        book = EpubParser().parse(epub_path)
        for ch in book.chapters:
            assert "original.css" not in ch.html_content

    def test_inline_style_stripped(self, tmp_path):
        """元のインライン <style> ブロックが除去されているか"""
        data = _make_minimal_epub(with_stylesheet=True)
        epub_path = tmp_path / "test.epub"
        epub_path.write_bytes(data)
        from tateyomi.parsers.epub_parser import EpubParser
        book = EpubParser().parse(epub_path)
        for ch in book.chapters:
            assert "<style>" not in ch.html_content.lower()

    def test_body_content_preserved(self, tmp_path):
        """本文テキストは保持されるか"""
        data = _make_minimal_epub(chapters=[("ch001", "重要なテキスト内容です")])
        epub_path = tmp_path / "test.epub"
        epub_path.write_bytes(data)
        from tateyomi.parsers.epub_parser import EpubParser
        book = EpubParser().parse(epub_path)
        assert any("重要なテキスト内容です" in ch.html_content for ch in book.chapters)

    def test_multiple_chapters(self, tmp_path):
        data = _make_minimal_epub(chapters=[
            ("ch001", "第1章本文"),
            ("ch002", "第2章本文"),
            ("ch003", "第3章本文"),
        ])
        epub_path = tmp_path / "test.epub"
        epub_path.write_bytes(data)
        from tateyomi.parsers.epub_parser import EpubParser
        book = EpubParser().parse(epub_path)
        assert len(book.chapters) == 3


class TestStripExternalCss:
    def test_removes_link_rel_stylesheet(self):
        from tateyomi.parsers.epub_parser import _strip_external_css
        html = '<html><head><link rel="stylesheet" href="style.css"/></head><body>text</body></html>'
        result = _strip_external_css(html)
        assert "style.css" not in result
        assert "text" in result

    def test_removes_style_block(self):
        from tateyomi.parsers.epub_parser import _strip_external_css
        html = "<html><head><style>body { color: red; }</style></head><body>text</body></html>"
        result = _strip_external_css(html)
        assert "color: red" not in result
        assert "text" in result

    def test_multiline_style_removed(self):
        from tateyomi.parsers.epub_parser import _strip_external_css
        html = "<html><head><style>\nbody {\n  writing-mode: horizontal-tb;\n}\n</style></head><body/></html>"
        result = _strip_external_css(html)
        assert "writing-mode" not in result

    def test_link_with_type_attr(self):
        from tateyomi.parsers.epub_parser import _strip_external_css
        html = '<html><head><link type="text/css" rel="stylesheet" href="a.css"/></head><body/></html>'
        result = _strip_external_css(html)
        assert "a.css" not in result

    def test_non_stylesheet_link_preserved(self):
        from tateyomi.parsers.epub_parser import _strip_external_css
        html = '<html><head><link rel="icon" href="icon.png"/></head><body/></html>'
        result = _strip_external_css(html)
        assert "icon.png" in result

    def test_body_text_preserved(self):
        from tateyomi.parsers.epub_parser import _strip_external_css
        html = '<html><head><style>p{color:red}</style></head><body><p>本文テスト</p></body></html>'
        result = _strip_external_css(html)
        assert "本文テスト" in result
