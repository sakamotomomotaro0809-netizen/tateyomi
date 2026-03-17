"""
HTMLレンダラー
縦書きHTMLを単一ファイルとして出力する
PDF変換のフォールバック：ブラウザ印刷 or wkhtmltopdf 利用
"""
from __future__ import annotations
import base64
from pathlib import Path

from tateyomi.config import ParsedBook

_ASSETS_DIR = Path(__file__).parent.parent / "assets"


def render(book: ParsedBook, output_path: Path) -> None:
    """ParsedBook を単一HTML（画像埋め込み）として書き出す"""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    css_main = (_ASSETS_DIR / "tateyomi.css").read_text(encoding="utf-8")

    # 画像を base64 data URI に変換
    img_map: dict[str, str] = {}
    for img in book.images:
        b64 = base64.b64encode(img.data).decode("ascii")
        img_map[Path(img.href).name] = f"data:{img.media_type};base64,{b64}"

    chapters_html: list[str] = []
    for chapter in book.chapters:
        ch = chapter.html_content
        # img src を data URI に置換
        for fname, uri in img_map.items():
            ch = ch.replace(fname, uri)
        body = _extract_body(ch)
        chapters_html.append(f'<section class="chapter-break">{body}</section>')

    title = _x(book.title)
    toc_items = "\n".join(
        f'<li><a href="#{ch.chapter_id}">{_x(ch.title)}</a></li>'
        for ch in book.chapters
    )
    # チャプターにidを付与
    chapters_with_id: list[str] = []
    for ch, html in zip(book.chapters, chapters_html):
        chapters_with_id.append(f'<div id="{ch.chapter_id}">{html}</div>')

    content = "\n".join(chapters_with_id)

    html_out = f"""<!DOCTYPE html>
<html lang="ja" xml:lang="ja">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width"/>
  <title>{title}</title>
  <style>
{css_main}

/* 単一HTML表示用追加スタイル */
@page {{
  size: A5;
  margin: 15mm 20mm 15mm 20mm;
}}

body {{
  background: #fff;
  color: #000;
  height: 90vh;
  overflow-x: auto;
  overflow-y: hidden;
}}

/* 目次（印刷時非表示） */
#toc {{
  writing-mode: horizontal-tb;
  -webkit-writing-mode: horizontal-tb;
  padding: 1em;
  background: #f8f8f8;
  margin-bottom: 1em;
}}
#toc h2 {{ font-size: 1em; margin: 0 0 0.5em; }}
#toc ol {{ margin: 0; padding-left: 1.5em; }}

@media print {{
  #toc {{ display: none; }}
  .chapter-break {{ page-break-before: always; }}
  body {{ height: auto; overflow: visible; }}
}}
  </style>
</head>
<body>
<nav id="toc">
  <h2>目次</h2>
  <ol>{toc_items}</ol>
</nav>
{content}
</body>
</html>"""

    output_path.write_text(html_out, encoding="utf-8")


def _extract_body(html: str) -> str:
    import re
    m = re.search(r"<body[^>]*>(.*?)</body>", html, re.DOTALL | re.IGNORECASE)
    return m.group(1) if m else html


def _x(text: str) -> str:
    return (text or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
