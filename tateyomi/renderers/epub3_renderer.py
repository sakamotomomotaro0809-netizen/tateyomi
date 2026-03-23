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


def render(book: ParsedBook, output_path: Path, config=None) -> None:
    """ParsedBook を EPUB3 ファイルとして書き出す"""
    output_path.parent.mkdir(parents=True, exist_ok=True)

    css_main = (_ASSETS_DIR / "tateyomi.css").read_text(encoding="utf-8")
    css_kindle = (_ASSETS_DIR / "kindle-overrides.css").read_text(encoding="utf-8")

    # G. 版面設定を CSS に注入
    if config is not None:
        css_main = _inject_layout_css(css_main, config.layout)

    # H. カスタムCSS追加
    extra_css = ""
    if config is not None:
        extra_css = _load_extra_css(config.convert)

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
        if extra_css:
            zf.writestr("OEBPS/Styles/custom.css", extra_css)

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

        # 7. チャプターHTML（CSS リンクを注入 + epub:type を設定）
        total_ch = len(book.chapters)
        for i, chapter in enumerate(book.chapters):
            etype = _epub_type_for_chapter(chapter.title or "", i, total_ch)
            section_type = _chapter_section_type(etype)
            html = _inject_css_links(chapter.html_content, has_custom_css=bool(extra_css))
            html = _set_section_epub_type(html, section_type)
            zf.writestr(f"OEBPS/Text/{chapter.chapter_id}.xhtml", html)

        # 8. nav.xhtml
        zf.writestr("OEBPS/nav.xhtml", _nav_xhtml(book, cover_chapter))

        # 9. toc.ncx (EPUB2後方互換)
        zf.writestr("OEBPS/toc.ncx", _toc_ncx(book, uid, cover_chapter))

        # 10. content.opf
        zf.writestr("OEBPS/content.opf",
                    _content_opf(book, uid, now, cover_chapter, font_items,
                                 has_custom_css=bool(extra_css)))


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


def _inject_layout_css(css: str, layout) -> str:
    """G. 版面設定を CSS 変数としてルールの先頭に注入"""
    overrides = f"""
/* G. 版面設定 (tateyomi.toml) */
:root {{
  --line-height: {layout.line_height};
  --font-size: {layout.font_size};
  --margin-block: {layout.margin_block};
  --margin-inline: {layout.margin_inline};
}}
html {{
  line-height: {layout.line_height};
  font-size: {layout.font_size};
}}
body {{
  padding: {layout.margin_block} {layout.margin_inline};
}}
"""
    if layout.chars_hint > 0:
        # 一行字数の目安: font-size を調整
        overrides += f"""
/* 一行約{layout.chars_hint}字 */
body {{
  font-size: calc(100vh / ({layout.chars_hint} * 1.8));
}}
"""
    return overrides + css


def _load_extra_css(convert_cfg) -> str:
    """H. カスタムCSSを読み込む"""
    css_parts: list[str] = []
    if convert_cfg.extra_css:
        css_parts.append(convert_cfg.extra_css)
    if convert_cfg.extra_css_file:
        p = Path(convert_cfg.extra_css_file)
        if p.exists():
            css_parts.append(p.read_text(encoding="utf-8"))
    return "\n".join(css_parts)


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


def _accessibility_meta(book: ParsedBook) -> str:
    """BH. EPUB Accessibility 1.1 メタデータを生成する"""
    has_images = bool(book.images)
    lines = [
        "    <!-- EPUB Accessibility 1.1 -->",
        '    <meta property="schema:accessMode">textual</meta>',
    ]
    if has_images:
        lines.append('    <meta property="schema:accessMode">visual</meta>')
    lines.append('    <meta property="schema:accessModeSufficient">textual</meta>')
    lines += [
        '    <meta property="schema:accessibilityFeature">structuralNavigation</meta>',
        '    <meta property="schema:accessibilityFeature">tableOfContents</meta>',
        '    <meta property="schema:accessibilityFeature">readingOrder</meta>',
    ]
    if has_images:
        lines.append(
            '    <meta property="schema:accessibilityFeature">alternativeText</meta>'
        )
    lines += [
        '    <meta property="schema:accessibilityHazard">none</meta>',
        '    <meta property="schema:accessibilitySummary">'
        "縦書き日本語電子書籍。EPUB Accessibility 1.1 準拠。</meta>",
        '    <meta property="dcterms:conformsTo">'
        "EPUB Accessibility 1.1 - WCAG 2.1 Level AA</meta>",
    ]
    return "\n".join(lines)


def _content_opf(
    book: ParsedBook,
    uid: str,
    now: str,
    cover_chapter: "Chapter | None" = None,
    font_items: "list[tuple[str, bytes]] | None" = None,
    has_custom_css: bool = False,
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
    if has_custom_css:
        manifest_items.append(
            '    <item id="css-custom" href="Styles/custom.css" '
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
    total_ch = len(book.chapters)
    spine_items = []
    if cover_chapter:
        # 表紙は center-spread
        spine_items.append(
            '    <itemref idref="cover" linear="yes" properties="page-spread-center"/>'
        )
    for i, ch in enumerate(book.chapters):
        etype = _epub_type_for_chapter(ch.title or "", i, total_ch)
        # RTL縦書き: 奇数ページ=右ページ(page-spread-right), 偶数=左(page-spread-left)
        # KDP では省略するのが最も安全なため properties は付けない
        spine_items.append(f'    <itemref idref="{ch.chapter_id}" linear="yes"/>')

    a11y = _accessibility_meta(book)

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf"
         xmlns:dc="http://purl.org/dc/elements/1.1/"
         version="3.0"
         unique-identifier="book-id"
         xml:lang="{lang}"
         prefix="schema: http://schema.org/">

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
{a11y}
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


def _epub_type_for_chapter(title: str, index: int, total: int) -> str:
    """
    チャプタータイトルと位置から EPUB3 epub:type を推定する。
    前付け / 本文 / 後付けを分類。
    """
    import re as _re
    t = title.strip()

    # 「第X章」「第X節」「Chapter N」など章番号プレフィックスがある場合は常に bodymatter
    if _re.match(
        r"^(第[0-9０-９一二三四五六七八九十百千万]+[章節話部編巻]|Chapter\s*\d+)",
        t,
        _re.IGNORECASE,
    ):
        return "bodymatter"

    # 前付け (frontmatter) — タイトル全体か主要部分がパターンに一致
    frontmatter_patterns = (
        "まえがき", "前書き", "はじめに", "序文", "序章", "プロローグ",
        "凡例", "謝辞", "献辞", "扉",
        "preface", "introduction", "prologue", "foreword",
    )
    # 後付け (backmatter) — タイトル全体か主要部分がパターンに一致
    backmatter_patterns = (
        "あとがき", "後書き", "おわりに", "終章", "エピローグ",
        "付録", "参考文献", "索引", "用語集", "年表", "著者紹介",
        "afterword", "epilogue", "appendix", "glossary", "bibliography",
    )
    # 「解説」は単独タイトルのときのみ backmatter とみなす（部分一致は除外）
    standalone_backmatter = ("解説", "index")

    tl = t.lower()
    for pat in frontmatter_patterns:
        if pat.lower() in tl:
            return "frontmatter"
    for pat in backmatter_patterns:
        if pat.lower() in tl:
            return "backmatter"
    for pat in standalone_backmatter:
        if tl == pat.lower() or tl.startswith(pat.lower() + "　") or tl.startswith(pat.lower() + " "):
            return "backmatter"

    return "bodymatter"


def _chapter_section_type(epub_type: str) -> str:
    """epub_type から <section epub:type> に使う値を返す"""
    if epub_type == "frontmatter":
        return "frontmatter"
    if epub_type == "backmatter":
        return "backmatter"
    return "chapter"


def _nav_xhtml(book: ParsedBook, cover_chapter=None) -> str:
    title = _x(book.title)
    total = len(book.chapters)

    # 各章の epub:type を算出
    chapter_types = [
        _epub_type_for_chapter(ch.title or "", i, total)
        for i, ch in enumerate(book.chapters)
    ]

    # ── toc ──
    toc_items = "\n".join(
        f'      <li><a href="Text/{ch.chapter_id}.xhtml">{_x(ch.title)}</a></li>'
        for ch in book.chapters
    )

    # ── landmarks ──
    landmark_items: list[str] = []

    if cover_chapter:
        landmark_items.append(
            '      <li><a epub:type="cover" href="Text/cover.xhtml">表紙</a></li>'
        )
    landmark_items.append(
        '      <li><a epub:type="toc" href="nav.xhtml">目次</a></li>'
    )

    # frontmatter の最初
    for ch, etype in zip(book.chapters, chapter_types):
        if etype == "frontmatter":
            landmark_items.append(
                f'      <li><a epub:type="frontmatter" '
                f'href="Text/{ch.chapter_id}.xhtml">{_x(ch.title)}</a></li>'
            )
            break

    # bodymatter の最初（先頭の bodymatter 章）
    bodymatter_ch = next(
        (ch for ch, et in zip(book.chapters, chapter_types) if et == "bodymatter"),
        book.chapters[0] if book.chapters else None,
    )
    if bodymatter_ch:
        landmark_items.append(
            f'      <li><a epub:type="bodymatter" '
            f'href="Text/{bodymatter_ch.chapter_id}.xhtml">本文開始</a></li>'
        )

    # backmatter の最初
    for ch, etype in zip(book.chapters, chapter_types):
        if etype == "backmatter":
            landmark_items.append(
                f'      <li><a epub:type="backmatter" '
                f'href="Text/{ch.chapter_id}.xhtml">{_x(ch.title)}</a></li>'
            )
            break

    landmarks = "\n".join(landmark_items)

    # ── page-list（空でも仕様上必要） ──
    page_list = """  <nav epub:type="page-list" hidden="">
    <ol>
    </ol>
  </nav>"""

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
{page_list}
</body>
</html>"""


def _extract_h2_from_chapter(html_content: str) -> list[str]:
    """チャプターHTMLからh2見出しテキストを抽出する"""
    import re
    return re.findall(r"<h2[^>]*>([^<]*)</h2>", html_content, re.IGNORECASE)


def _toc_ncx(book: ParsedBook, uid: str, cover_chapter=None) -> str:
    title = _x(book.title)

    play_order = 1
    nav_point_lines: list[str] = []

    for i, ch in enumerate(book.chapters):
        ch_title = _x(ch.title)
        ch_href = f"Text/{ch.chapter_id}.xhtml"

        # h2 見出しを取得してネストする
        h2_titles = _extract_h2_from_chapter(ch.html_content)

        if h2_titles:
            # 親 navPoint（章）
            nav_point_lines.append(
                f'    <navPoint id="navpoint-{play_order}" playOrder="{play_order}">'
            )
            nav_point_lines.append(
                f'      <navLabel><text>{ch_title}</text></navLabel>'
            )
            nav_point_lines.append(f'      <content src="{ch_href}"/>')
            play_order += 1

            # 子 navPoint（h2 見出し）
            for j, h2 in enumerate(h2_titles):
                nav_point_lines.append(
                    f'      <navPoint id="navpoint-{play_order}" playOrder="{play_order}">'
                )
                nav_point_lines.append(
                    f'        <navLabel><text>{_x(h2)}</text></navLabel>'
                )
                # h2 のアンカーは id 属性が必要だが、なければ章先頭にフォールバック
                nav_point_lines.append(f'        <content src="{ch_href}"/>')
                nav_point_lines.append('      </navPoint>')
                play_order += 1

            nav_point_lines.append('    </navPoint>')
        else:
            nav_point_lines.append(
                f'    <navPoint id="navpoint-{play_order}" playOrder="{play_order}">'
            )
            nav_point_lines.append(
                f'      <navLabel><text>{ch_title}</text></navLabel>'
            )
            nav_point_lines.append(f'      <content src="{ch_href}"/>')
            nav_point_lines.append('    </navPoint>')
            play_order += 1

    nav_points = "\n".join(nav_point_lines)

    # depth: h2 ネストがあれば 2、なければ 1
    has_nested = any(_extract_h2_from_chapter(ch.html_content) for ch in book.chapters)
    depth = 2 if has_nested else 1

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:{uid}"/>
    <meta name="dtb:depth" content="{depth}"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>{title}</text></docTitle>
  <navMap>
{nav_points}
  </navMap>
</ncx>"""


def _set_section_epub_type(html: str, section_type: str) -> str:
    """
    チャプター HTML の <section class="chapter-break"> に
    epub:type="<section_type>" を設定/上書きする。
    既に epub:type がある場合は置換、なければ追加。
    """
    import re
    # epub:type が既にある場合は値を置換
    def replacer(m: re.Match) -> str:
        tag = m.group(0)
        if 'epub:type=' in tag:
            tag = re.sub(r'epub:type="[^"]*"', f'epub:type="{section_type}"', tag)
        else:
            tag = tag.rstrip(">").rstrip() + f' epub:type="{section_type}">'
        return tag
    replaced = re.sub(r'<section\b[^>]*class="chapter-break"[^>]*>', replacer, html)
    return replaced


def _inject_css_links(html: str, has_custom_css: bool = False) -> str:
    """
    チャプター HTML に不足している CSS <link> を </head> 直前に注入する。
    既にリンクされている CSS は重複追加しない。
    """
    needed = [
        ("../Styles/tateyomi.css",         'rel="stylesheet" href="../Styles/tateyomi.css"'),
        ("../Styles/kindle-overrides.css", 'rel="stylesheet" href="../Styles/kindle-overrides.css"'),
    ]
    if has_custom_css:
        needed.append(
            ("../Styles/custom.css", 'rel="stylesheet" href="../Styles/custom.css"')
        )

    # 注入が必要な <link> を集める
    to_inject = []
    for _href, marker in needed:
        if marker not in html:
            to_inject.append(
                f'  <link rel="stylesheet" href="{_href}"/>'
            )

    if not to_inject:
        return html

    injection = "\n".join(to_inject) + "\n"
    # </head> の直前に挿入
    idx = html.lower().find("</head>")
    if idx == -1:
        return html
    return html[:idx] + injection + html[idx:]


def _x(text: str) -> str:
    """XMLエスケープ"""
    return (
        (text or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )
