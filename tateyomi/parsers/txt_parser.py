"""
テキストファイルパーサー
章区切りを検出してチャプター分割する
"""
from __future__ import annotations
import re
import uuid
from pathlib import Path
from tateyomi.config import ParsedBook, Chapter
from tateyomi.parsers.base import BaseParser

# 章見出しパターン（例: 第一章、第1章、一、プロローグ、などに対応）
CHAPTER_HEADING = re.compile(
    r"^(?:"
    r"第[0-9０-９一二三四五六七八九十百千]+[章節話部編]"
    r"|[一二三四五六七八九十]+[、。\s]"
    r"|Chapter\s*\d+"
    r"|CHAPTER\s*\d+"
    r"|プロローグ|エピローグ|序章|終章|あとがき|まえがき"
    r")",
    re.MULTILINE,
)


def _escape_html(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


class TxtParser(BaseParser):
    def parse(self, path: Path) -> ParsedBook:
        raw = path.read_text(encoding="utf-8", errors="replace")
        lines = raw.splitlines()

        # タイトルは1行目
        title = lines[0].strip() if lines else path.stem
        author = ""

        # 章分割
        chapters: list[Chapter] = []
        current_title = title
        current_lines: list[str] = []

        for line in lines[1:]:
            if CHAPTER_HEADING.match(line.strip()) and line.strip():
                if current_lines:
                    chapters.append(_make_chapter(chapters, current_title, current_lines))
                current_title = line.strip()
                current_lines = []
            else:
                current_lines.append(line)

        if current_lines or not chapters:
            chapters.append(_make_chapter(chapters, current_title, current_lines))

        return ParsedBook(
            title=title,
            author=author,
            language="ja",
            uid=str(uuid.uuid4()),
            chapters=chapters,
            source_format="txt",
        )


def _make_chapter(existing: list, title: str, lines: list[str]) -> Chapter:
    idx = len(existing) + 1
    chapter_id = f"chapter{idx:03d}"

    # 空行区切りで段落化
    paragraphs: list[list[str]] = []
    current: list[str] = []
    for line in lines:
        if line.strip() == "":
            if current:
                paragraphs.append(current)
                current = []
        else:
            current.append(line)
    if current:
        paragraphs.append(current)

    para_html = "\n".join(
        f"<p>{'<br/>'.join(_escape_html(l) for l in para)}</p>"
        for para in paragraphs
        if para
    )

    html = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:epub="http://www.idpf.org/2007/ops"
      xml:lang="ja" lang="ja">
<head>
  <meta charset="UTF-8"/>
  <title>{_escape_html(title)}</title>
  <link rel="stylesheet" href="../Styles/tateyomi.css"/>
  <link rel="stylesheet" href="../Styles/kindle-overrides.css"/>
</head>
<body epub:type="bodymatter">
  <section epub:type="chapter" class="chapter-break">
    <h1>{_escape_html(title)}</h1>
    {para_html}
  </section>
</body>
</html>"""

    return Chapter(chapter_id=chapter_id, title=title, html_content=html)
