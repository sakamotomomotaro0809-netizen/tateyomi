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

    # B. 表紙ページHTML生成（表紙画像がある場合）
    cover_chapter = _make_cover_chapter(book) if book.cover_image_href else None

    # F. フォント収集
    font_items = _collect_fonts(book)

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

        # 5. フォント
        for font_href, font_data in font_items:
            zf.writestr(f"OEBPS/{font_href}", font_data)

        # 6. 表紙ページ
        if cover_chapter:
            zf.writestr(f"OEBPS/Text/{cover_chapter.chapter_id}.xhtml",
                        cover_chapter.html_content)

        # 7. チャプターHTML
        for chapter in book.chapters:
            zf.writestr(f"OEBPS/Text/{chapter.chapter_id}.xhtml", chapter.html_content)

        # 8. nav.xhtml
        zf.writestr("OEBPS/nav.xhtml", _nav_xhtml(book, cover_chapter))

        # 9. toc.ncx (EPUB2後方互換)
        zf.writestr("OEBPS/toc.ncx", _toc_ncx(book, uid, cover_chapter))

        # 10. content.opf
        zf.writestr("OEBPS/content.opf",
                    _content_opf(book, uid, now, cover_chapter, font_items))


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


def _make_cover_chapter(book: ParsedBook) -> "Chapter":
    """B. 表紙画像ページを生成"""
    from tateyomi.config import Chapter
    href = book.cover_image_href or ""
    # nav.xhtml から Images/ への相対パス調整
    img_path = f"../{href}" if not href.startswith("..") else href
    html = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:epub="http://www.idpf.org/2007/ops"
      xml:lang="ja" lang="ja">
<head>
  <meta charset="UTF-8"/>
  <title>表紙</title>
  <style>
    html, body {{ margin: 0; padding: 0; writing-mode: horizontal-tb !important; }}
    img {{ max-width: 100%; max-height: 100vh; display: block; margin: 0 auto; }}
  </style>
</head>
<body epub:type="cover">
  <figure epub:type="cover-image">
    <img src="{img_path}" alt="表紙"/>
  </figure>
</body>
</html>"""
    return Chapter(chapter_id="cover", title="表紙", html_content=html)


def _collect_fonts(book: ParsedBook) -> list[tuple[str, bytes]]:
    """F. ParsedBook に埋め込みフォントが指定されていれば収集"""
    result: list[tuple[str, bytes]] = []
    font_dir = getattr(book, "font_dir", None)
    if not font_dir:
        return result
    from pathlib import Path as _Path
    for f in _Path(font_dir).glob("*.otf"):
        result.append((f"Fonts/{f.name}", f.read_bytes()))
    for f in _Path(font_dir).glob("*.ttf"):
        result.append((f"Fonts/{f.name}", f.read_bytes()))
    return result


def _content_opf(
    book: ParsedBook,
    uid: str,
    now: str,
    cover_chapter: "Chapter | None" = None,
    font_items: "list[tuple[str, bytes]] | None" = None,
) -> str:
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

    # 表紙ページ
    if cover_chapter:
        manifest_items.append(
            f'    <item id="cover" href="Text/cover.xhtml" '
            f'media-type="application/xhtml+xml" properties="svg"/>'
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

    # F. フォント
    for font_href, _ in (font_items or []):
        font_id = font_href.replace("/", "_").replace(".", "_")
        mt = "font/otf" if font_href.endswith(".otf") else "font/ttf"
        manifest_items.append(
            f'    <item id="{font_id}" href="{font_href}" media-type="{mt}"/>'
        )

    # spine items
    spine_items = []
    if cover_chapter:
        spine_items.append('    <itemref idref="cover" linear="yes"/>')
    spine_items += [
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
    {f'<reference type="cover" title="表紙" href="Text/cover.xhtml"/>' if cover_chapter else ''}
    <reference type="toc"  title="目次" href="nav.xhtml"/>
    <reference type="text" title="本文" href="Text/{book.chapters[0].chapter_id}.xhtml"/>
  </guide>

</package>"""


def _nav_xhtml(book: ParsedBook, cover_chapter=None) -> str:
    title = _x(book.title)
    toc_items = "\n".join(
        f'      <li><a href="Text/{ch.chapter_id}.xhtml">{_x(ch.title)}</a></li>'
        for ch in book.chapters
    )
    cover_landmark = (
        f'      <li><a epub:type="cover" href="Text/cover.xhtml">表紙</a></li>\n'
        if cover_chapter else ""
    )
    landmarks = cover_landmark + (
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


def _toc_ncx(book: ParsedBook, uid: str, cover_chapter=None) -> str:
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
