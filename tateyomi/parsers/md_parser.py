"""
Markdownパーサー
Markdown (.md) を ParsedBook に変換する。
依存: 標準ライブラリのみ（markdown パッケージがあれば利用、なければ簡易パーサーを使用）
"""
from __future__ import annotations
import re
import uuid
from pathlib import Path

from tateyomi.config import ParsedBook, Chapter
from tateyomi.parsers.base import BaseParser


def _escape_html(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


# ── 簡易 Markdown → HTML 変換 ─────────────────────────────────────────

def _inline(text: str) -> str:
    """インライン要素変換: **bold**, *italic*, `code`, [link](url)"""
    # `code`
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    # **bold** / __bold__
    text = re.sub(r"\*\*(.+?)\*\*|__(.+?)__", lambda m: f"<strong>{m.group(1) or m.group(2)}</strong>", text)
    # *italic* / _italic_
    text = re.sub(r"\*(.+?)\*|_(.+?)_", lambda m: f"<em>{m.group(1) or m.group(2)}</em>", text)
    # [text](url) → テキストのみ（EPUB内でURLは意味をなさないため）
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    return text


class _Block:
    def __init__(self, kind: str, content: str, level: int = 0):
        self.kind = kind      # heading / p / ul / ol / pre / hr / blank
        self.content = content
        self.level = level    # heading level (1-6)


def _parse_md(text: str) -> tuple[str, str, list[_Block]]:
    """Markdown テキストを title / author / blocks に分解する"""
    lines = text.splitlines()
    blocks: list[_Block] = []
    title = ""
    author = ""

    i = 0
    in_code = False
    code_lines: list[str] = []
    ul_items: list[str] = []
    ol_items: list[str] = []

    def flush_ul():
        nonlocal ul_items
        if ul_items:
            items_html = "".join(f"<li>{_inline(_escape_html(li))}</li>" for li in ul_items)
            blocks.append(_Block("ul", f"<ul>{items_html}</ul>"))
            ul_items = []

    def flush_ol():
        nonlocal ol_items
        if ol_items:
            items_html = "".join(f"<li>{_inline(_escape_html(li))}</li>" for li in ol_items)
            blocks.append(_Block("ol", f"<ol>{items_html}</ol>"))
            ol_items = []

    while i < len(lines):
        line = lines[i]

        # fenced code block
        if line.startswith("```") or line.startswith("~~~"):
            if in_code:
                flush_ul(); flush_ol()
                code_html = _escape_html("\n".join(code_lines))
                blocks.append(_Block("pre", f"<pre><code>{code_html}</code></pre>"))
                code_lines = []
                in_code = False
            else:
                flush_ul(); flush_ol()
                in_code = True
            i += 1
            continue

        if in_code:
            code_lines.append(line)
            i += 1
            continue

        # setext heading (= or -)
        if i + 1 < len(lines):
            next_line = lines[i + 1]
            if re.fullmatch(r"=+", next_line.strip()) and line.strip():
                flush_ul(); flush_ol()
                heading_text = _inline(_escape_html(line.strip()))
                if not title:
                    title = line.strip()
                blocks.append(_Block("heading", f"<h1>{heading_text}</h1>", level=1))
                i += 2
                continue
            if re.fullmatch(r"-+", next_line.strip()) and line.strip() and not line.startswith("-"):
                flush_ul(); flush_ol()
                heading_text = _inline(_escape_html(line.strip()))
                blocks.append(_Block("heading", f"<h2>{heading_text}</h2>", level=2))
                i += 2
                continue

        # ATX heading
        m = re.match(r"^(#{1,6})\s+(.*)", line)
        if m:
            flush_ul(); flush_ol()
            level = len(m.group(1))
            heading_text = _inline(_escape_html(m.group(2).rstrip("#").strip()))
            if level == 1 and not title:
                title = m.group(2).rstrip("#").strip()
            blocks.append(_Block("heading", f"<h{level}>{heading_text}</h{level}>", level=level))
            i += 1
            continue

        # horizontal rule
        if re.fullmatch(r"[-*_]{3,}", line.strip()):
            flush_ul(); flush_ol()
            blocks.append(_Block("hr", "<hr/>"))
            i += 1
            continue

        # unordered list
        m = re.match(r"^[-*+]\s+(.*)", line)
        if m:
            flush_ol()
            ul_items.append(m.group(1))
            i += 1
            continue

        # ordered list
        m = re.match(r"^\d+\.\s+(.*)", line)
        if m:
            flush_ul()
            ol_items.append(m.group(1))
            i += 1
            continue

        # blockquote → <blockquote>
        m = re.match(r"^>\s?(.*)", line)
        if m:
            flush_ul(); flush_ol()
            blocks.append(_Block("p", f"<blockquote>{_inline(_escape_html(m.group(1)))}</blockquote>"))
            i += 1
            continue

        # blank line
        if not line.strip():
            flush_ul(); flush_ol()
            blocks.append(_Block("blank", ""))
            i += 1
            continue

        # paragraph
        flush_ul(); flush_ol()
        blocks.append(_Block("p", f"<p>{_inline(_escape_html(line.strip()))}</p>"))
        i += 1

    flush_ul()
    flush_ol()
    if in_code and code_lines:
        blocks.append(_Block("pre", f"<pre><code>{_escape_html(chr(10).join(code_lines))}</code></pre>"))

    return title, author, blocks


def _blocks_to_chapter(idx: int, title: str, blocks: list[_Block]) -> Chapter:
    chapter_id = f"chapter{idx + 1:03d}"
    html_parts = [b.content for b in blocks if b.kind != "blank" and b.content]
    body_html = "\n    ".join(html_parts)
    title_escaped = _escape_html(title)

    html = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:epub="http://www.idpf.org/2007/ops"
      xml:lang="ja" lang="ja">
<head>
  <meta charset="UTF-8"/>
  <title>{title_escaped}</title>
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


class MdParser(BaseParser):
    def parse(self, path: Path) -> ParsedBook:
        from tateyomi.utils.encoding import read_text_auto
        raw, _ = read_text_auto(path)

        title, author, blocks = _parse_md(raw)
        if not title:
            title = path.stem

        # h1 を章区切りとして分割
        chapters: list[Chapter] = []
        current_title = title
        current_blocks: list[_Block] = []

        for block in blocks:
            if block.kind == "heading" and block.level == 1:
                if current_blocks:
                    chapters.append(_blocks_to_chapter(len(chapters), current_title, current_blocks))
                # タグを除去してテキストだけを章タイトルとして使う
                current_title = re.sub(r"<[^>]+>", "", block.content)
                current_blocks = [block]
            else:
                current_blocks.append(block)

        if current_blocks or not chapters:
            chapters.append(_blocks_to_chapter(len(chapters), current_title, current_blocks))

        return ParsedBook(
            title=title,
            author=author,
            language="ja",
            uid=str(uuid.uuid4()),
            chapters=chapters,
            source_format="md",
        )
