"""
PDFレンダラー
WeasyPrint を使用して縦書きHTMLをPDFに変換する
"""
from __future__ import annotations
import tempfile
import base64
from pathlib import Path

from tateyomi.config import ParsedBook

# WeasyPrint は実行時インポート（GTK DLL エラーも含め捕捉）
WeasyHTML = None
WEASYPRINT_AVAILABLE = False
WEASYPRINT_ERROR = ""
try:
    from weasyprint import HTML as WeasyHTML  # type: ignore
    WEASYPRINT_AVAILABLE = True
except Exception as _e:
    WEASYPRINT_ERROR = str(_e)

_ASSETS_DIR = Path(__file__).parent.parent / "assets"


def render(book: ParsedBook, output_path: Path) -> None:
    """ParsedBook を縦書きPDFとして書き出す"""
    if not WEASYPRINT_AVAILABLE:
        raise RuntimeError(
            f"WeasyPrint のGTK/Pango DLLが見つかりません。\n"
            f"エラー: {WEASYPRINT_ERROR}\n"
            "GTKインストール: https://doc.courtbouillon.org/weasyprint/stable/first_steps.html\n"
            "代替: --format html で縦書きHTMLを生成し、Chromeから印刷してPDF化できます。"
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)

    css_main = (_ASSETS_DIR / "tateyomi.css").read_text(encoding="utf-8")

    # 全チャプターを1つのHTMLに結合
    full_html = _build_full_html(book, css_main)

    with tempfile.TemporaryDirectory() as tmpdir:
        # 画像をtmpdirに書き出し（WeasyPrintがfile://で参照するため）
        for img in book.images:
            img_path = Path(tmpdir) / Path(img.href).name
            img_path.write_bytes(img.data)

        html_obj = WeasyHTML(string=full_html, base_url=tmpdir)
        html_obj.write_pdf(str(output_path))


def _build_full_html(book: ParsedBook, css: str) -> str:
    """全チャプターを結合した単一HTMLを生成"""
    title = _x(book.title)

    # 画像をdata URIに埋め込み（外部ファイル参照の代替）
    img_data_uris: dict[str, str] = {}
    for img in book.images:
        b64 = base64.b64encode(img.data).decode("ascii")
        img_data_uris[Path(img.href).name] = f"data:{img.media_type};base64,{b64}"

    chapters_html_parts: list[str] = []
    for chapter in book.chapters:
        # img src を data URI に置換
        ch_html = chapter.html_content
        for filename, data_uri in img_data_uris.items():
            ch_html = ch_html.replace(filename, data_uri)

        # body内のコンテンツだけ抽出
        body_content = _extract_body(ch_html)
        chapters_html_parts.append(
            f'<section class="chapter-break">{body_content}</section>'
        )

    chapters_html = "\n".join(chapters_html_parts)

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ja" lang="ja">
<head>
  <meta charset="UTF-8"/>
  <title>{title}</title>
  <style>
    @page {{
      size: A5;
      margin: 15mm 20mm 15mm 20mm;
    }}
    {css}
    /* PDF固有調整 */
    html, body {{
      height: 100%;
    }}
  </style>
</head>
<body>
{chapters_html}
</body>
</html>"""


def _extract_body(html: str) -> str:
    """HTMLから<body>...</body>の内容を抽出"""
    import re
    m = re.search(r"<body[^>]*>(.*?)</body>", html, re.DOTALL | re.IGNORECASE)
    if m:
        return m.group(1)
    return html


def _x(text: str) -> str:
    return (
        (text or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )
