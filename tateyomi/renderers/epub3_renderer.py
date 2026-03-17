"""
EPUB3レンダラー
Kindle KDP対応・縦書き・右から左ページ進行
"""
from __future__ import annotations
import os
import uuid
import zipfile
from pathlib import Path
from datetime import datetime, timezone

from tateyomi.config import ParsedBook, Chapter, ImageItem

# CSSアセットのパス
_ASSETS_DIR = Path(__file__).parent.parent / "assets"


def render(book: ParsedBook, output_path: Path) -> None:
    """ParsedBook を EPUB3 ファイルとして書き出す"""
    output_path.parent.mkdir(parents=True, exist_ok=True)

    css_main = (_ASSETS_DIR / "tateyomi.css").read_text(encoding="utf-8")
    css_kindle = (_ASSETS_DIR / "kindle-overrides.css").read_text(encoding="utf-8")

    uid = book.uid or str(uuid.uuid4())
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    with zipfile.ZipFile(str(output_path), "w", zipfile.ZIP_DEFLATED) as zf:
        # 1. mimetype (非圧縮・先頭固定)
        zf.writestr(
            zipfile.ZipInfo("mimetype"),
            "application/epub+zip",
            compress_type=zipfile.ZIP_STORED,
        )

        # 2. META-INF/container.xml
        zf.writestr("META-INF/container.xml", _container_xml())

        # 3. CSS
        zf.writestr("OEBPS/Styles/tateyomi.css", css_main)
        zf.writestr("OEBPS/Styles/kindle-overrides.css", css_kindle)

        # 4. 画像
        for img in book.images:
            zf.writestr(f"OEBPS/{img.href}", img.data)

        # 5. チャプターHTML
        for chapter in book.chapters:
            zf.writestr(f"OEBPS/Text/{chapter.chapter_id}.xhtml", chapter.html_content)

        # 6. nav.xhtml
        zf.writestr("OEBPS/nav.xhtml", _nav_xhtml(book))

        # 7. toc.ncx (EPUB2後方互換)
        zf.writestr("OEBPS/toc.ncx", _toc_ncx(book, uid))

        # 8. content.opf
        zf.writestr("OEBPS/content.opf", _content_opf(book, uid, now))


# ──────────────────────────────────────────────
# OPF / NAV / NCX 生成
# ──────────────────────────────────────────────

def _container_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf"
              media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>"""


def _content_opf(book: ParsedBook, uid: str, now: str) -> str:
    title = _x(book.title)
    author = _x(book.author)
    lang = _x(book.language or "ja")

    # manifest items
    manifest_items: list[str] = []
    manifest_items.append(
        '    <item id="nav" href="nav.xhtml" '
        'media-type="application/xhtml+xml" properties="nav"/>'
    )
    manifest_items.append(
        '    <item id="ncx" href="toc.ncx" '
        'media-type="application/x-dtbncx+xml"/>'
    )
    manifest_items.append(
        '    <item id="css-main" href="Styles/tateyomi.css" '
        'media-type="text/css"/>'
    )
    manifest_items.append(
        '    <item id="css-kindle" href="Styles/kindle-overrides.css" '
        'media-type="text/css"/>'
    )

    for chapter in book.chapters:
        manifest_items.append(
            f'    <item id="{chapter.chapter_id}" '
            f'href="Text/{chapter.chapter_id}.xhtml" '
            f'media-type="application/xhtml+xml"/>'
        )

    for img in book.images:
        extra = ""
        if img.href == book.cover_image_href:
            extra = ' properties="cover-image"'
        manifest_items.append(
            f'    <item id="{img.item_id}" '
            f'href="{img.href}" '
            f'media-type="{img.media_type}"{extra}/>'
        )

    # spine items
    spine_items = [
        f'    <itemref idref="{ch.chapter_id}" linear="yes"/>'
        for ch in book.chapters
    ]

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf"
         xmlns:dc="http://purl.org/dc/elements/1.1/"
         version="3.0"
         unique-identifier="book-id"
         xml:lang="{lang}">

  <metadata>
    <dc:identifier id="book-id">urn:uuid:{uid}</dc:identifier>
    <dc:title>{title}</dc:title>
    <dc:language>{lang}</dc:language>
    <dc:creator>{author}</dc:creator>
    <meta property="dcterms:modified">{now}</meta>
    <meta property="rendition:layout">reflowable</meta>
    <meta property="rendition:orientation">auto</meta>
    <meta property="rendition:spread">none</meta>
    <meta property="primary-writing-mode">vertical-rl</meta>
  </metadata>

  <manifest>
{chr(10).join(manifest_items)}
  </manifest>

  <spine toc="ncx" page-progression-direction="rtl">
{chr(10).join(spine_items)}
  </spine>

  <guide>
    <reference type="toc"  title="目次" href="nav.xhtml"/>
    <reference type="text" title="本文" href="Text/{book.chapters[0].chapter_id}.xhtml"/>
  </guide>

</package>"""


def _nav_xhtml(book: ParsedBook) -> str:
    title = _x(book.title)
    toc_items = "\n".join(
        f'      <li><a href="Text/{ch.chapter_id}.xhtml">{_x(ch.title)}</a></li>'
        for ch in book.chapters
    )
    landmarks = (
        f'      <li><a epub:type="toc" href="nav.xhtml">目次</a></li>\n'
        f'      <li><a epub:type="bodymatter" '
        f'href="Text/{book.chapters[0].chapter_id}.xhtml">本文</a></li>'
        if book.chapters else ""
    )
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:epub="http://www.idpf.org/2007/ops"
      xml:lang="ja" lang="ja">
<head>
  <meta charset="UTF-8"/>
  <title>{title}</title>
  <link rel="stylesheet" href="Styles/tateyomi.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>目次</h1>
    <ol>
{toc_items}
    </ol>
  </nav>
  <nav epub:type="landmarks" hidden="">
    <ol>
{landmarks}
    </ol>
  </nav>
</body>
</html>"""


def _toc_ncx(book: ParsedBook, uid: str) -> str:
    title = _x(book.title)
    nav_points = "\n".join(
        f"""    <navPoint id="navpoint-{i + 1}" playOrder="{i + 1}">
      <navLabel><text>{_x(ch.title)}</text></navLabel>
      <content src="Text/{ch.chapter_id}.xhtml"/>
    </navPoint>"""
        for i, ch in enumerate(book.chapters)
    )
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:{uid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>{title}</text></docTitle>
  <navMap>
{nav_points}
  </navMap>
</ncx>"""


def _x(text: str) -> str:
    """XMLエスケープ"""
    return (
        (text or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )
