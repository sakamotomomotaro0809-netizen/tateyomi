"""
テキストファイルパーサー
- 通常テキスト: 章区切り検出でチャプター分割
- 青空文庫形式: ルビ・注記変換 + 見出し階層対応
"""
from __future__ import annotations
import re
import uuid
from pathlib import Path
from tateyomi.config import ParsedBook, Chapter
from tateyomi.parsers.base import BaseParser

# 章見出しパターン（通常テキスト用）
CHAPTER_HEADING = re.compile(
    r"^(?:"
    r"第[0-9０-９一二三四五六七八九十百千万]+[章節話部編巻]"
    r"|[一二三四五六七八九十百千]+[、。　\s]"
    r"|Chapter\s*\d+"
    r"|CHAPTER\s*\d+"
    r"|プロローグ|エピローグ|序章|終章|あとがき|まえがき|はじめに|おわりに"
    r")",
    re.MULTILINE,
)

# 青空文庫形式の検出パターン
AOZORA_SIGNATURE = re.compile(r"《[^》]+》|［＃[^\]]*］|｜")


def _escape_html(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _is_aozora(text: str) -> bool:
    """青空文庫形式かどうかを判定"""
    return bool(AOZORA_SIGNATURE.search(text[:3000]))


class TxtParser(BaseParser):
    def parse(self, path: Path) -> ParsedBook:
        raw = path.read_text(encoding="utf-8", errors="replace")

        if _is_aozora(raw):
            return self._parse_aozora(raw, path)
        return self._parse_plain(raw, path)

    # ──────────────────────────────────────────────────
    # 青空文庫形式パース
    # ──────────────────────────────────────────────────
    def _parse_aozora(self, raw: str, path: Path) -> ParsedBook:
        from tateyomi.utils.aozora import parse_aozora, AozoraBlock

        title, author, blocks = parse_aozora(raw)
        if not title:
            title = path.stem

        # ブロック列をチャプターに分割（h1 を章区切りとして使用）
        chapters: list[Chapter] = []
        current_title = title
        current_blocks: list[AozoraBlock] = []

        for block in blocks:
            if block.kind == "h1":
                if current_blocks:
                    chapters.append(_blocks_to_chapter(
                        len(chapters), current_title, current_blocks
                    ))
                current_title = _strip_tags(block.content)
                current_blocks = [block]
            else:
                current_blocks.append(block)

        if current_blocks or not chapters:
            chapters.append(_blocks_to_chapter(
                len(chapters), current_title, current_blocks
            ))

        return ParsedBook(
            title=title,
            author=author,
            language="ja",
            uid=str(uuid.uuid4()),
            chapters=chapters,
            source_format="txt",
        )

    # ──────────────────────────────────────────────────
    # 通常テキストパース
    # ──────────────────────────────────────────────────
    def _parse_plain(self, raw: str, path: Path) -> ParsedBook:
        lines = raw.splitlines()
        title = lines[0].strip() if lines else path.stem
        author = ""

        chapters: list[Chapter] = []
        current_title = title
        current_lines: list[str] = []

        for line in lines[1:]:
            if CHAPTER_HEADING.match(line.strip()) and line.strip():
                if current_lines:
                    chapters.append(_lines_to_chapter(
                        len(chapters), current_title, current_lines
                    ))
                current_title = line.strip()
                current_lines = []
            else:
                current_lines.append(line)

        if current_lines or not chapters:
            chapters.append(_lines_to_chapter(
                len(chapters), current_title, current_lines
            ))

        return ParsedBook(
            title=title,
            author=author,
            language="ja",
            uid=str(uuid.uuid4()),
            chapters=chapters,
            source_format="txt",
        )


# ──────────────────────────────────────────────────
# チャプターHTML生成
# ──────────────────────────────────────────────────

def _blocks_to_chapter(idx: int, title: str, blocks) -> Chapter:
    """AozoraBlock リストからChapterを生成"""
    from tateyomi.utils.aozora import AozoraBlock

    chapter_id = f"chapter{idx + 1:03d}"
    html_parts: list[str] = []

    for block in blocks:
        if block.kind == "h1":
            html_parts.append(f"<h1>{block.content}</h1>")
        elif block.kind == "h2":
            html_parts.append(f"<h2>{block.content}</h2>")
        elif block.kind == "h3":
            html_parts.append(f"<h3>{block.content}</h3>")
        else:
            # p: <br/> を段落内改行として使う
            html_parts.append(f"<p>{block.content}</p>")

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


def _lines_to_chapter(idx: int, title: str, lines: list[str]) -> Chapter:
    """行リストからChapterを生成（通常テキスト用）"""
    chapter_id = f"chapter{idx + 1:03d}"

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

    para_html = "\n    ".join(
        f"<p>{'<br/>'.join(_escape_html(l) for l in para)}</p>"
        for para in paragraphs
        if para
    )
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
    <h1>{title_escaped}</h1>
    {para_html}
  </section>
</body>
</html>"""
    return Chapter(chapter_id=chapter_id, title=title, html_content=html)


def _strip_tags(html: str) -> str:
    """HTMLタグを除去してプレーンテキストを返す"""
    return re.sub(r"<[^>]+>", "", html)
