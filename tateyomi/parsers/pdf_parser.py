"""
PDFパーサー
pdfplumber を使用してテキストを読み取り順で抽出し、
チャプター分割 + 画像抽出を行う
"""
from __future__ import annotations
import io
import re
import uuid
from pathlib import Path
import pdfplumber
from PIL import Image
from tateyomi.config import ParsedBook, Chapter, ImageItem
from tateyomi.parsers.base import BaseParser

CHAPTER_HEADING = re.compile(
    r"^(?:第[0-9０-９一二三四五六七八九十百千]+[章節話部編]"
    r"|Chapter\s*\d+"
    r"|CHAPTER\s*\d+"
    r"|プロローグ|エピローグ|序章|終章)",
)


def _escape_html(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


class PdfParser(BaseParser):
    def parse(self, path: Path) -> ParsedBook:
        images: list[ImageItem] = []
        all_paragraphs: list[str] = []
        img_counter = 0

        with pdfplumber.open(str(path)) as pdf:
            # メタデータ
            meta = pdf.metadata or {}
            title = meta.get("Title") or path.stem
            author = meta.get("Author") or ""

            for page_idx, page in enumerate(pdf.pages):
                # テキスト抽出（読み取り順ソート）
                paragraphs = self._extract_paragraphs(page)
                all_paragraphs.extend(paragraphs)

                # 画像抽出
                for img_info in page.images:
                    try:
                        img_data = self._extract_image(page, img_info)
                        if img_data:
                            img_counter += 1
                            href = f"Images/page{page_idx + 1:03d}_img{img_counter:02d}.png"
                            images.append(ImageItem(
                                item_id=f"img-p{page_idx + 1:03d}-{img_counter:02d}",
                                href=href,
                                media_type="image/png",
                                data=img_data,
                            ))
                    except Exception:
                        pass  # 画像抽出失敗は無視

        if not all_paragraphs:
            raise ValueError(
                "PDFからテキストを抽出できませんでした。"
                "スキャンPDFの場合はOCR処理後に変換してください。"
            )

        # チャプター分割
        chapters = self._split_chapters(all_paragraphs, images)

        return ParsedBook(
            title=title,
            author=author,
            language="ja",
            uid=str(uuid.uuid4()),
            chapters=chapters,
            images=images,
            source_format="pdf",
        )

    def _extract_paragraphs(self, page) -> list[str]:
        """
        bounding boxを使って読み取り順にテキストを取得し、
        段落リストとして返す
        """
        words = page.extract_words(x_tolerance=3, y_tolerance=3)
        if not words:
            return []

        # 行にグループ化（y座標が近いものを同じ行に）
        if not words:
            return []

        line_heights = []
        sorted_words = sorted(words, key=lambda w: w["top"])

        lines: list[list[dict]] = []
        current_line: list[dict] = [sorted_words[0]]
        for w in sorted_words[1:]:
            if abs(w["top"] - current_line[-1]["top"]) < 8:
                current_line.append(w)
            else:
                lines.append(sorted(current_line, key=lambda x: x["x0"]))
                current_line = [w]
        lines.append(sorted(current_line, key=lambda x: x["x0"]))

        # 行間ギャップで段落分割
        paragraphs: list[str] = []
        para_lines: list[str] = []
        prev_bottom = None

        for line in lines:
            line_text = " ".join(w["text"] for w in line).strip()
            if not line_text:
                continue
            top = line[0]["top"]
            bottom = max(w["bottom"] for w in line)
            line_h = bottom - top

            if prev_bottom is not None and (top - prev_bottom) > line_h * 1.5:
                if para_lines:
                    paragraphs.append("".join(para_lines))
                    para_lines = []

            para_lines.append(line_text)
            prev_bottom = bottom

        if para_lines:
            paragraphs.append("".join(para_lines))

        return paragraphs

    def _extract_image(self, page, img_info: dict) -> bytes | None:
        """ページから画像バイト列を抽出"""
        try:
            # pdfplumber経由でPILに変換
            x0 = img_info.get("x0", 0)
            y0 = img_info.get("y0", 0)
            x1 = img_info.get("x1", 100)
            y1 = img_info.get("y1", 100)
            cropped = page.crop((x0, y0, x1, y1))
            pil_img = cropped.to_image(resolution=150).original
            buf = io.BytesIO()
            pil_img.save(buf, format="PNG")
            return buf.getvalue()
        except Exception:
            return None

    def _split_chapters(
        self, paragraphs: list[str], images: list[ImageItem]
    ) -> list[Chapter]:
        """段落リストを章ごとに分割してChapterリストを返す"""
        chapters: list[Chapter] = []
        current_title = "本文"
        current_paras: list[str] = []

        for para in paragraphs:
            if CHAPTER_HEADING.match(para.strip()):
                if current_paras:
                    chapters.append(
                        _build_chapter(len(chapters), current_title, current_paras)
                    )
                current_title = para.strip()
                current_paras = []
            else:
                current_paras.append(para)

        if current_paras or not chapters:
            chapters.append(
                _build_chapter(len(chapters), current_title, current_paras)
            )

        return chapters


def _build_chapter(idx: int, title: str, paragraphs: list[str]) -> Chapter:
    chapter_id = f"chapter{idx + 1:03d}"
    para_html = "\n    ".join(
        f"<p>{_escape_html(p)}</p>" for p in paragraphs if p.strip()
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
