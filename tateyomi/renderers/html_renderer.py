"""
HTMLレンダラー
縦書きHTMLを単一ファイルとして出力する
PDF変換のフォールバック：ブラウザ印刷 or wkhtmltopdf 利用
"""
from __future__ import annotations
import base64
import re
from pathlib import Path

from tateyomi.config import ParsedBook

_ASSETS_DIR = Path(__file__).parent.parent / "assets"


def render(book: ParsedBook, output_path: Path) -> None:
    """ParsedBook を単一HTML（画像埋め込み）として書き出す"""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    css_main = (_ASSETS_DIR / "tateyomi.css").read_text(encoding="utf-8")
    css_kindle = (_ASSETS_DIR / "kindle-overrides.css").read_text(encoding="utf-8")

    # 画像を base64 data URI に変換（ファイル名ベースマッチング）
    img_map: dict[str, str] = {}
    for img in book.images:
        b64 = base64.b64encode(img.data).decode("ascii")
        img_map[Path(img.href).name] = f"data:{img.media_type};base64,{b64}"

    chapters_html: list[str] = []
    for chapter in book.chapters:
        ch = _replace_img_src(chapter.html_content, img_map)
        body = _extract_body(ch)
        chapters_html.append(body)

    title = _x(book.title)
    author = _x(book.author or "")

    # 目次 HTML
    toc_items = "\n".join(
        f'      <li><a href="#{ch.chapter_id}">{_x(ch.title)}</a></li>'
        for ch in book.chapters
    )

    # 章ナビゲーション付きコンテンツ
    parts: list[str] = []
    for i, (ch, body) in enumerate(zip(book.chapters, chapters_html)):
        prev_link = (
            f'<a class="nav-link" href="#{book.chapters[i-1].chapter_id}">&#9664; 前章</a>'
            if i > 0 else '<span class="nav-link"></span>'
        )
        next_link = (
            f'<a class="nav-link" href="#{book.chapters[i+1].chapter_id}">次章 &#9654;</a>'
            if i < len(book.chapters) - 1 else '<span class="nav-link"></span>'
        )
        nav_bar = f'<div class="chapter-nav">{prev_link}<a class="nav-link" href="#toc">目次</a>{next_link}</div>'
        parts.append(
            f'<article id="{ch.chapter_id}" class="chapter-break">\n'
            f'{nav_bar}\n{body}\n{nav_bar}\n'
            f'</article>'
        )

    content = "\n\n".join(parts)

    html_out = f"""<!DOCTYPE html>
<html lang="ja" xml:lang="ja">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>{title}</title>
  <style>
/* ===== tateyomi.css ===== */
{css_main}

/* ===== kindle-overrides.css ===== */
{css_kindle}

/* ===== 単一HTML表示用追加スタイル ===== */
@page {{
  size: A5;
  margin: 15mm 20mm;
}}

body {{
  background: #fff;
  color: #000;
  height: 90vh;
  overflow-x: auto;
  overflow-y: hidden;
}}

/* 目次（横書き） */
#toc {{
  writing-mode: horizontal-tb !important;
  -webkit-writing-mode: horizontal-tb !important;
  padding: 1.5em 2em;
  background: #f5f5f5;
  border-bottom: 2px solid #ccc;
  margin-bottom: 0;
}}
#toc h2 {{
  font-size: 1.1em;
  margin: 0 0 0.8em;
  writing-mode: horizontal-tb;
}}
#toc ol {{
  margin: 0;
  padding-left: 1.5em;
  columns: 2;
  column-gap: 2em;
}}
#toc li {{ margin-bottom: 0.4em; }}
#toc a {{ color: #2D6CDF; text-decoration: none; }}
#toc a:hover {{ text-decoration: underline; }}

/* ヘッダー情報 */
#book-header {{
  writing-mode: horizontal-tb !important;
  -webkit-writing-mode: horizontal-tb !important;
  padding: 1.5em 2em 0.5em;
  background: #f5f5f5;
}}
#book-header h1 {{ font-size: 1.4em; margin: 0 0 0.3em; }}
#book-header p {{ margin: 0; color: #666; font-size: 0.9em; }}

/* 章ナビゲーション */
.chapter-nav {{
  writing-mode: horizontal-tb !important;
  -webkit-writing-mode: horizontal-tb !important;
  display: flex;
  justify-content: space-between;
  padding: 0.5em 1em;
  background: #f0f0f0;
  border-radius: 4px;
  margin: 0.5em 0;
  font-size: 0.85em;
}}
.nav-link {{
  color: #2D6CDF;
  text-decoration: none;
  min-width: 4em;
}}
.nav-link:hover {{ text-decoration: underline; }}

/* 印刷時 */
@media print {{
  #toc, #book-header, .chapter-nav {{ display: none; }}
  article.chapter-break {{ page-break-before: always; }}
  body {{ height: auto; overflow: visible; }}
}}
  </style>
</head>
<body>
<header id="book-header">
  <h1>{title}</h1>
  {f'<p>{author}</p>' if author else ''}
</header>
<nav id="toc">
  <h2>目次</h2>
  <ol>
{toc_items}
  </ol>
</nav>
{content}
</body>
</html>"""

    output_path.write_text(html_out, encoding="utf-8")


def _replace_img_src(html: str, img_map: dict[str, str]) -> str:
    """img src をファイル名ベースで data URI に置換"""
    def replacer(m: re.Match) -> str:
        src = m.group(1)
        fname = src.split("/")[-1]
        if fname in img_map:
            return f'src="{img_map[fname]}"'
        return m.group(0)
    return re.sub(r'src="([^"]+)"', replacer, html)


def _extract_body(html: str) -> str:
    m = re.search(r"<body[^>]*>(.*?)</body>", html, re.DOTALL | re.IGNORECASE)
    return m.group(1).strip() if m else html


def _x(text: str) -> str:
    return (text or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
