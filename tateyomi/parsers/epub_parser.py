"""
EPUBパーサー (EPUB2/EPUB3対応)
ebooklib を使用してチャプター・画像を抽出する
"""
from __future__ import annotations
import uuid
import warnings
from pathlib import Path
from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning
import ebooklib
from ebooklib import epub

warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)
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

        # 画像パスマッピング構築
        image_map = _build_image_map(images)

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

            # 元の外部CSS リンクを除去（縦書きCSSと競合するため）
            raw_html = _strip_external_css(raw_html)
            raw_html = _fix_image_paths(raw_html, image_map)

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
                raw_html = _strip_external_css(raw_html)
                raw_html = _fix_image_paths(raw_html, image_map)
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


def _build_image_map(images: list) -> dict[str, str]:
    """
    画像ファイル名 → Text/ディレクトリからの相対パスのマッピングを構築。
    例: "photo.jpg" → "../Images/photo.jpg"
    """
    mapping: dict[str, str] = {}
    for img in images:
        filename = img.href.split("/")[-1]
        # OEBPS/{img.href} に保存される → Text/ からは ../{img.href}
        rel_path = f"../{img.href}"
        mapping[filename] = rel_path
    return mapping


def _fix_image_paths(html: str, image_map: dict[str, str]) -> str:
    """
    チャプター HTML 内の img src 属性を新しいパスに修正する。
    ファイル名ベースでマッチングする。
    """
    import re

    def replace_src(m: re.Match) -> str:
        original_src = m.group(1)
        # ファイル名を取得
        filename = original_src.split("/")[-1]
        if filename in image_map:
            return f'src="{image_map[filename]}"'
        return m.group(0)

    return re.sub(r'src="([^"]+)"', replace_src, html)


def _strip_external_css(html: str) -> str:
    """
    チャプター HTML から外部 CSS リンクを除去する。
    元の（横書き向け）スタイルシートが縦書き CSS と競合するのを防ぐ。
    tateyomi.css / kindle-overrides.css は epub3_renderer が後から注入する。
    """
    import re
    # <link rel="stylesheet" ...> を削除
    html = re.sub(
        r'<link\s[^>]*rel=["\']stylesheet["\'][^>]*/?>',
        "",
        html,
        flags=re.IGNORECASE,
    )
    # writing-mode を上書きする恐れのある <style> ブロックを削除
    # （ルビ・傍点など保持したいスタイルも消えるが、tateyomi.css で再定義済み）
    html = re.sub(
        r"<style\b[^>]*>.*?</style>",
        "",
        html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    return html


def _safe_id(raw: str) -> str:
    """IDをASCII英数字とハイフンのみに正規化"""
    import re
    return re.sub(r"[^a-zA-Z0-9\-_]", "_", raw or "img")
