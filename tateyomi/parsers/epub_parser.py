"""
EPUBパーサー (EPUB2/EPUB3対応)
ebooklib を使用してチャプター・画像を抽出する
"""
from __future__ import annotations
import uuid
from pathlib import Path
from bs4 import BeautifulSoup
import ebooklib
from ebooklib import epub
from tateyomi.config import ParsedBook, Chapter, ImageItem
from tateyomi.parsers.base import BaseParser
from tateyomi.utils.image_handler import ext_from_media_type


class EpubParser(BaseParser):
    def parse(self, path: Path) -> ParsedBook:
        book = epub.read_epub(str(path), options={"ignore_ncx": False})

        title = self._get_meta(book, "title") or path.stem
        author = self._get_meta(book, "creator") or ""
        uid = self._get_meta(book, "identifier") or str(uuid.uuid4())
        language = self._get_meta(book, "language") or "ja"

        images: list[ImageItem] = []
        cover_href: str | None = None

        # 画像抽出
        for item in book.get_items_of_type(ebooklib.ITEM_IMAGE):
            href = item.get_name()
            images.append(ImageItem(
                item_id=_safe_id(item.get_id()),
                href=href,
                media_type=item.media_type,
                data=item.get_content(),
            ))
            # カバー画像検出
            if "cover" in href.lower() or "cover" in (item.get_id() or "").lower():
                cover_href = href

        # チャプター抽出（spine順）
        chapters: list[Chapter] = []
        spine_ids = [item_id for item_id, _ in book.spine]

        for idx, item_id in enumerate(spine_ids):
            item = book.get_item_with_id(item_id)
            if item is None or item.media_type != "application/xhtml+xml":
                continue

            chapter_id = f"chapter{idx + 1:03d}"
            raw_html = item.get_content().decode("utf-8", errors="replace")

            # タイトル抽出
            soup = BeautifulSoup(raw_html, "lxml")
            heading = soup.find(["h1", "h2", "h3"])
            chapter_title = heading.get_text(strip=True) if heading else f"Chapter {idx + 1}"

            # 画像参照収集
            img_refs = [img.get("src", "") for img in soup.find_all("img")]

            chapters.append(Chapter(
                chapter_id=chapter_id,
                title=chapter_title,
                html_content=raw_html,
                image_refs=img_refs,
            ))

        if not chapters:
            # spine が空の場合は全HTMLアイテムを取得
            for idx, item in enumerate(book.get_items_of_type(ebooklib.ITEM_DOCUMENT)):
                chapter_id = f"chapter{idx + 1:03d}"
                raw_html = item.get_content().decode("utf-8", errors="replace")
                soup = BeautifulSoup(raw_html, "lxml")
                heading = soup.find(["h1", "h2", "h3"])
                chapter_title = heading.get_text(strip=True) if heading else f"Chapter {idx + 1}"
                img_refs = [img.get("src", "") for img in soup.find_all("img")]
                chapters.append(Chapter(
                    chapter_id=chapter_id,
                    title=chapter_title,
                    html_content=raw_html,
                    image_refs=img_refs,
                ))

        return ParsedBook(
            title=title,
            author=author,
            language=language,
            uid=uid,
            chapters=chapters,
            images=images,
            source_format="epub",
            cover_image_href=cover_href,
        )

    def _get_meta(self, book: epub.EpubBook, name: str) -> str:
        meta = book.get_metadata("DC", name)
        if meta:
            val = meta[0][0]
            if val is None or str(val) == "None":
                return ""
            return str(val)
        return ""


def _safe_id(raw: str) -> str:
    """IDをASCII英数字とハイフンのみに正規化"""
    import re
    return re.sub(r"[^a-zA-Z0-9\-_]", "_", raw or "img")
