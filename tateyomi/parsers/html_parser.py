"""
HTMLファイルパーサー
単一HTML (.html / .htm) を ParsedBook に変換する。
h1/h2 を章区切りとして利用。BeautifulSoupで本文抽出。
"""
from __future__ import annotations
import re
import uuid
from pathlib import Path

from tateyomi.config import ParsedBook, Chapter
from tateyomi.parsers.base import BaseParser


def _strip_tags(html: str) -> str:
    return re.sub(r"<[^>]+>", "", html).strip()


def _make_chapter_html(idx: int, title: str, body_parts: list[str]) -> Chapter:
    chapter_id = f"chapter{idx + 1:03d}"
    title_esc = title.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    body = "\n    ".join(body_parts)
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
    {body}
  </section>
</body>
</html>"""
    return Chapter(chapter_id=chapter_id, title=title, html_content=html)


class HtmlParser(BaseParser):
    def parse(self, path: Path) -> ParsedBook:
        from tateyomi.utils.encoding import read_text_auto
        raw, _ = read_text_auto(path)

        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(raw, "lxml")
        except ImportError:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(raw, "html.parser")

        # メタ情報
        title_tag = soup.find("title")
        doc_title = title_tag.get_text(strip=True) if title_tag else path.stem

        meta_author = soup.find("meta", attrs={"name": re.compile(r"author", re.I)})
        doc_author = meta_author.get("content", "") if meta_author else ""

        # <body> 内容を取得
        body = soup.find("body") or soup
        # <script> / <style> / <nav> を除去
        for tag in body.find_all(["script", "style", "nav", "header", "footer"]):
            tag.decompose()

        # h1/h2 要素で章分割
        chapters: list[Chapter] = []
        current_title = doc_title
        current_parts: list[str] = []

        for element in body.children:
            tag_name = getattr(element, "name", None)
            if tag_name in ("h1", "h2"):
                # 前の章を確定
                if current_parts:
                    chapters.append(_make_chapter_html(len(chapters), current_title, current_parts))
                current_title = _strip_tags(str(element))
                current_parts = [str(element)]
            elif tag_name:
                current_parts.append(str(element))
            # NavigableString (テキストノード) は無視

        if current_parts or not chapters:
            chapters.append(_make_chapter_html(len(chapters), current_title, current_parts))

        return ParsedBook(
            title=doc_title,
            author=doc_author,
            language="ja",
            uid=str(uuid.uuid4()),
            chapters=chapters,
            source_format="html",
        )
