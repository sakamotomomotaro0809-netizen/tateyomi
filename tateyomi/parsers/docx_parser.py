"""
D. Word (.docx) パーサー
python-docx を使用して段落・見出し・画像を抽出する
"""
from __future__ import annotations
import io
import uuid
from pathlib import Path

from tateyomi.config import ParsedBook, Chapter, ImageItem
from tateyomi.parsers.base import BaseParser

try:
    from docx import Document
    from docx.oxml.ns import qn
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False

# Word の見出しスタイル名
_HEADING_STYLES = {
    "Heading 1": "h1", "見出し 1": "h1", "見出し1": "h1",
    "Heading 2": "h2", "見出し 2": "h2", "見出し2": "h2",
    "Heading 3": "h3", "見出し 3": "h3", "見出し3": "h3",
    "Title": "h1", "タイトル": "h1",
}


def _escape_html(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


class DocxParser(BaseParser):
    def parse(self, path: Path) -> ParsedBook:
        if not DOCX_AVAILABLE:
            raise RuntimeError(
                "python-docx がインストールされていません。\n"
                "pip install python-docx を実行してください。"
            )

        doc = Document(str(path))

        # メタデータ
        props = doc.core_properties
        title = props.title or path.stem
        author = props.author or ""

        # 画像抽出
        images: list[ImageItem] = []
        img_counter = 0
        cover_href: str | None = None

        for rel in doc.part.rels.values():
            if "image" in rel.reltype:
                try:
                    img_data = rel.target_part.blob
                    ct = rel.target_part.content_type
                    ext = _ext_from_ct(ct)
                    img_counter += 1
                    href = f"Images/docx_img{img_counter:03d}{ext}"
                    img_id = f"docx-img-{img_counter:03d}"
                    images.append(ImageItem(
                        item_id=img_id,
                        href=href,
                        media_type=ct,
                        data=img_data,
                    ))
                    if img_counter == 1:
                        cover_href = href
                except Exception:
                    pass

        # 段落→チャプター分割
        chapters: list[Chapter] = []
        current_title = title
        current_blocks: list[tuple[str, str]] = []  # (kind, html)

        for para in doc.paragraphs:
            style_name = para.style.name if para.style else ""
            heading_tag = _HEADING_STYLES.get(style_name, "")
            text = para.text.strip()

            if not text:
                continue

            if heading_tag == "h1":
                # 章区切り
                if current_blocks:
                    chapters.append(
                        _blocks_to_chapter(len(chapters), current_title, current_blocks)
                    )
                current_title = text
                current_blocks = [(heading_tag, _escape_html(text))]
            elif heading_tag in ("h2", "h3"):
                current_blocks.append((heading_tag, _escape_html(text)))
            else:
                # 通常段落: runごとにbold/italic処理
                html = _para_to_html(para)
                if html:
                    current_blocks.append(("p", html))

        if current_blocks or not chapters:
            chapters.append(
                _blocks_to_chapter(len(chapters), current_title, current_blocks)
            )

        return ParsedBook(
            title=title,
            author=author,
            language="ja",
            uid=str(uuid.uuid4()),
            chapters=chapters,
            images=images,
            source_format="docx",
            cover_image_href=cover_href,
        )


def _para_to_html(para) -> str:
    """段落のrunをHTMLに変換 (bold/italic対応)"""
    parts: list[str] = []
    for run in para.runs:
        text = _escape_html(run.text)
        if not text:
            continue
        if run.bold:
            text = f"<strong>{text}</strong>"
        if run.italic:
            text = f"<em>{text}</em>"
        parts.append(text)
    return "".join(parts)


def _blocks_to_chapter(idx: int, title: str, blocks: list[tuple[str, str]]) -> Chapter:
    chapter_id = f"chapter{idx + 1:03d}"
    html_parts: list[str] = []
    for kind, content in blocks:
        if kind in ("h1", "h2", "h3"):
            html_parts.append(f"<{kind}>{content}</{kind}>")
        else:
            html_parts.append(f"<p>{content}</p>")

    body_html = "\n    ".join(html_parts)
    title_esc = _escape_html(title)

    html = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:epub="http://www.idpf.org/2007/ops"
      xml:lang="ja" lang="ja">
<head>
  <meta charset="UTF-8"/>
  <title>{title_esc}</title>
  <link rel="stylesheet" href="../Styles/tateyomi.css"/>
  <link rel="stylesheet" href="../Styles/kindle-overrides.css"/>
</head>
<body epub:type="bodymatter">
  <section epub:type="chapter" class="chapter-break">
    {body_html}
  </section>
</body>
</html>"""
    return Chapter(chapter_id=chapter_id, title=title, html_content=html)


def _ext_from_ct(content_type: str) -> str:
    mapping = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "image/svg+xml": ".svg",
        "image/webp": ".webp",
        "image/x-emf": ".emf",
        "image/x-wmf": ".wmf",
    }
    return mapping.get(content_type, ".img")
