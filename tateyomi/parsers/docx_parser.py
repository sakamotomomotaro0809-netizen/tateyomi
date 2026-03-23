"""
D. Word (.docx) パーサー
python-docx を使用して段落・見出し・画像・リスト・表・脚注を抽出する
"""
from __future__ import annotations
import io
import uuid
from pathlib import Path

from tateyomi.config import ParsedBook, Chapter, ImageItem
from tateyomi.parsers.base import BaseParser

_W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

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

# リスト（箇条書き）スタイル
_LIST_BULLET_STYLES = {
    "List Bullet", "List Bullet 2", "List Bullet 3",
    "箇条書き", "リスト段落",
}

# リスト（番号付き）スタイル
_LIST_NUMBER_STYLES = {
    "List Number", "List Number 2", "List Number 3",
    "番号付きリスト",
}


def _get_docx_footnotes(doc) -> dict[str, str]:
    """Word文書から脚注テキストを取得する: {footnote_id: text}"""
    footnotes: dict[str, str] = {}
    try:
        from lxml import etree
        for rel in doc.part.rels.values():
            if "footnote" in rel.reltype.lower():
                root = etree.fromstring(rel.target_part.blob)
                ns = {"w": _W_NS}
                for fn in root.findall("w:footnote", ns):
                    fn_id = fn.get(f"{{{_W_NS}}}id")
                    if fn_id and fn_id not in ("-1", "0"):
                        texts = fn.findall(f".//{{{_W_NS}}}t")
                        text = "".join((t.text or "") for t in texts)
                        if text.strip():
                            footnotes[fn_id] = text.strip()
    except Exception:
        pass
    return footnotes


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

        # 脚注マップ取得
        footnotes = _get_docx_footnotes(doc)

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

        # ドキュメント本体をボディ要素順に処理（段落と表を混在対応）
        blocks_raw = _extract_body_blocks(doc, footnotes)

        # 段落→チャプター分割
        chapters: list[Chapter] = []
        current_title = title
        current_blocks: list[tuple[str, str, list]] = []  # (kind, html, fn_list)

        for kind, content, block_fns in blocks_raw:
            if kind == "h1":
                if current_blocks:
                    chapters.append(
                        _blocks_to_chapter(len(chapters), current_title, current_blocks)
                    )
                current_title = content
                current_blocks = [("h1", _escape_html(content), [])]
            elif kind in ("h2", "h3"):
                current_blocks.append((kind, _escape_html(content), []))
            else:
                current_blocks.append((kind, content, block_fns))

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


def _extract_body_blocks(
    doc, footnotes: dict[str, str] | None = None
) -> list[tuple[str, str, list]]:
    """
    doc.element.body を順に走査し、段落と表を (kind, content, fn_list) のリストで返す。
    kind: "h1"/"h2"/"h3"/"p"/"ul_item"/"ol_item"/"table"
    fn_list: このブロックで参照された [(fn_id, fn_text), ...]
    """
    blocks: list[tuple[str, str, list]] = []
    fn_counter = [0]  # 脚注連番（可変リストで参照渡し）

    for child in doc.element.body:
        tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag

        if tag == "p":
            try:
                from docx.text.paragraph import Paragraph
                para = Paragraph(child, doc)
                style_name = para.style.name if para.style else ""
                text = para.text.strip()

                # 脚注参照のみある段落（テキストなし）も処理
                heading_tag = _HEADING_STYLES.get(style_name, "")
                if heading_tag:
                    if text:
                        blocks.append((heading_tag, text, []))
                elif style_name in _LIST_BULLET_STYLES:
                    used: list[tuple[str, str]] = []
                    html = _para_to_html(para, footnotes, fn_counter, used)
                    if html:
                        blocks.append(("ul_item", html, used))
                elif style_name in _LIST_NUMBER_STYLES:
                    used = []
                    html = _para_to_html(para, footnotes, fn_counter, used)
                    if html:
                        blocks.append(("ol_item", html, used))
                else:
                    used = []
                    html = _para_to_html(para, footnotes, fn_counter, used)
                    if html:
                        blocks.append(("p", html, used))
            except Exception:
                pass

        elif tag == "tbl":
            try:
                from docx.table import Table
                table = Table(child, doc)
                blocks.append(("table", _table_to_html(table), []))
            except Exception:
                pass

    return blocks


def _para_to_html(
    para,
    footnotes: dict[str, str] | None = None,
    fn_counter: list[int] | None = None,
    used_fns: list[tuple[str, str]] | None = None,
) -> str:
    """段落の run を HTML に変換 (bold/italic/脚注参照対応)"""
    parts: list[str] = []
    for run in para.runs:
        # 脚注参照の検出
        if footnotes is not None and fn_counter is not None and used_fns is not None:
            for fn_ref in run._r.findall(f".//{{{_W_NS}}}footnoteReference"):
                fn_id = fn_ref.get(f"{{{_W_NS}}}id")
                if fn_id and fn_id in footnotes:
                    fn_counter[0] += 1
                    num = fn_counter[0]
                    used_fns.append((fn_id, footnotes[fn_id]))
                    parts.append(
                        f'<a epub:type="noteref" role="doc-noteref" href="#fn-{fn_id}">'
                        f"<sup>{num}</sup></a>"
                    )
        text = _escape_html(run.text)
        if not text:
            continue
        if run.bold:
            text = f"<strong>{text}</strong>"
        if run.italic:
            text = f"<em>{text}</em>"
        parts.append(text)
    return "".join(parts)


def _table_to_html(table) -> str:
    """表を HTML <table> に変換"""
    rows: list[str] = []
    for row in table.rows:
        cells = []
        for cell in row.cells:
            cell_text = _escape_html(cell.text.strip())
            cells.append(f"<td>{cell_text}</td>")
        rows.append(f"<tr>{''.join(cells)}</tr>")
    return f"<table>{''.join(rows)}</table>"


def _blocks_to_chapter(
    idx: int, title: str, blocks: list[tuple[str, str, list]]
) -> Chapter:
    chapter_id = f"chapter{idx + 1:03d}"
    html_parts: list[str] = []
    all_fns: dict[str, str] = {}  # fn_id → text (重複排除・順序保持)

    # 連続する ul_item / ol_item をリストブロックにまとめる
    i = 0
    while i < len(blocks):
        kind, content, block_fns = blocks[i]
        for fn_id, fn_text in block_fns:
            if fn_id not in all_fns:
                all_fns[fn_id] = fn_text
        if kind in ("h1", "h2", "h3"):
            html_parts.append(f"<{kind}>{content}</{kind}>")
            i += 1
        elif kind == "table":
            html_parts.append(content)
            i += 1
        elif kind in ("ul_item", "ol_item"):
            tag = "ul" if kind == "ul_item" else "ol"
            items = []
            while i < len(blocks) and blocks[i][0] == kind:
                items.append(f"<li>{blocks[i][1]}</li>")
                i += 1
            html_parts.append(f"<{tag}>{''.join(items)}</{tag}>")
        else:
            html_parts.append(f"<p>{content}</p>")
            i += 1

    # 脚注 aside を章末に追加
    if all_fns:
        fn_parts = ['<section epub:type="footnotes" role="doc-footnotes" class="footnotes">']
        for fn_id, fn_text in all_fns.items():
            fn_text_esc = _escape_html(fn_text)
            fn_parts.append(
                f'  <aside epub:type="footnote" role="doc-footnote" id="fn-{fn_id}">'
                f"<p>{fn_text_esc}</p></aside>"
            )
        fn_parts.append("</section>")
        html_parts.extend(fn_parts)

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
