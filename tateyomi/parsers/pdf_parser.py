"""
PDFパーサー (改良版)
- 複数カラム検出
- ヘッダー/フッター除去
- 行高さ適応的グルーピング
- 章見出し検出
"""
from __future__ import annotations
import io
import re
import uuid
import statistics
from pathlib import Path

import pdfplumber
from PIL import Image

from tateyomi.config import ParsedBook, Chapter, ImageItem
from tateyomi.parsers.base import BaseParser

CHAPTER_HEADING = re.compile(
    r"^(?:第[0-9０-９一二三四五六七八九十百千万]+[章節話部編巻]"
    r"|Chapter\s*\d+"
    r"|CHAPTER\s*\d+"
    r"|プロローグ|エピローグ|序章|終章|はじめに|おわりに|あとがき|まえがき)",
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
            meta = pdf.metadata or {}
            title = _clean_meta(meta.get("Title")) or path.stem
            author = _clean_meta(meta.get("Author")) or ""

            total_pages = len(pdf.pages)

            for page_idx, page in enumerate(pdf.pages):
                # テキスト抽出
                paragraphs = self._extract_paragraphs(page, page_idx, total_pages)
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
                        pass

        if not all_paragraphs:
            raise ValueError(
                "PDFからテキストを抽出できませんでした。\n"
                "スキャンPDF（画像のみ）の場合は、OCR処理後に変換してください。"
            )

        chapters = self._split_chapters(all_paragraphs)

        return ParsedBook(
            title=title,
            author=author,
            language="ja",
            uid=str(uuid.uuid4()),
            chapters=chapters,
            images=images,
            source_format="pdf",
        )

    # ──────────────────────────────────────────────────
    # テキスト抽出
    # ──────────────────────────────────────────────────

    def _extract_paragraphs(
        self, page, page_idx: int, total_pages: int
    ) -> list[str]:
        """
        pdfplumber の bounding box を使って読み取り順でテキスト抽出。
        ヘッダー/フッター除去 + 複数カラム対応。
        """
        words = page.extract_words(x_tolerance=3, y_tolerance=5)
        if not words:
            return []

        page_h = page.height
        page_w = page.width

        # ヘッダー/フッター除去（上下 7% の領域）
        margin_v = page_h * 0.07
        words = [w for w in words if margin_v < w["top"] < page_h - margin_v]
        if not words:
            return []

        # 行高さの中央値を計算
        heights = [w["bottom"] - w["top"] for w in words]
        median_h = statistics.median(heights) if heights else 12.0
        line_tol = max(median_h * 0.6, 4.0)

        # カラム分割（大きな水平ギャップを検出）
        columns = self._detect_columns(words, page_w)

        paragraphs: list[str] = []
        for col_words in columns:
            col_paras = self._words_to_paragraphs(col_words, line_tol, median_h)
            paragraphs.extend(col_paras)

        return paragraphs

    def _detect_columns(self, words: list[dict], page_w: float) -> list[list[dict]]:
        """
        水平ギャップによるカラム分割。
        ギャップが page_w の 10% 以上なら別カラムとみなす。
        """
        if not words:
            return []

        # x0 でソートしてギャップを探す
        xs = sorted(set(round(w["x0"]) for w in words))
        gap_threshold = page_w * 0.10

        # ギャップ位置を探す
        split_points: list[float] = []
        for i in range(1, len(xs)):
            if xs[i] - xs[i - 1] > gap_threshold:
                split_points.append((xs[i - 1] + xs[i]) / 2)

        if not split_points:
            return [words]

        # カラムに分割
        columns: list[list[dict]] = [[] for _ in range(len(split_points) + 1)]
        for w in words:
            col_idx = 0
            for sp in split_points:
                if w["x0"] > sp:
                    col_idx += 1
            columns[col_idx].append(w)

        return [c for c in columns if c]

    def _words_to_paragraphs(
        self, words: list[dict], line_tol: float, median_h: float
    ) -> list[str]:
        """単語リストを行→段落に変換"""
        if not words:
            return []

        # y座標でソートして行をグループ化
        sorted_words = sorted(words, key=lambda w: (round(w["top"] / line_tol), w["x0"]))

        lines: list[list[dict]] = []
        cur_line: list[dict] = [sorted_words[0]]
        for w in sorted_words[1:]:
            if abs(w["top"] - cur_line[0]["top"]) <= line_tol:
                cur_line.append(w)
            else:
                lines.append(sorted(cur_line, key=lambda x: x["x0"]))
                cur_line = [w]
        lines.append(sorted(cur_line, key=lambda x: x["x0"]))

        # 段落分割（行間ギャップ > 1.5 * median_h）
        paragraphs: list[str] = []
        para_lines: list[str] = []
        prev_bottom: float | None = None

        for line in lines:
            line_text = "".join(w["text"] for w in line).strip()
            if not line_text:
                continue

            top = line[0]["top"]
            bottom = max(w["bottom"] for w in line)

            if prev_bottom is not None and (top - prev_bottom) > median_h * 1.5:
                if para_lines:
                    paragraphs.append("".join(para_lines))
                    para_lines = []

            para_lines.append(line_text)
            prev_bottom = bottom

        if para_lines:
            paragraphs.append("".join(para_lines))

        return [p for p in paragraphs if p.strip()]

    # ──────────────────────────────────────────────────
    # 画像抽出
    # ──────────────────────────────────────────────────

    def _extract_image(self, page, img_info: dict) -> bytes | None:
        try:
            x0 = float(img_info.get("x0", 0))
            y0 = float(img_info.get("y0", 0))
            x1 = float(img_info.get("x1", 100))
            y1 = float(img_info.get("y1", 100))

            # 極小画像は除外（装飾・罫線等）
            if (x1 - x0) < 20 or (y1 - y0) < 20:
                return None

            cropped = page.crop((x0, y0, x1, y1))
            pil_img = cropped.to_image(resolution=150).original
            buf = io.BytesIO()
            pil_img.save(buf, format="PNG")
            return buf.getvalue()
        except Exception:
            return None

    # ──────────────────────────────────────────────────
    # チャプター分割
    # ──────────────────────────────────────────────────

    def _split_chapters(self, paragraphs: list[str]) -> list[Chapter]:
        chapters: list[Chapter] = []
        current_title = "本文"
        current_paras: list[str] = []

        for para in paragraphs:
            stripped = para.strip()
            # 短い行（30文字以下）で章見出しパターンに合致するか確認
            if len(stripped) <= 30 and CHAPTER_HEADING.match(stripped):
                if current_paras or chapters:
                    chapters.append(_build_chapter(len(chapters), current_title, current_paras))
                current_title = stripped
                current_paras = []
            else:
                current_paras.append(para)

        if current_paras or not chapters:
            chapters.append(_build_chapter(len(chapters), current_title, current_paras))

        return chapters


# ──────────────────────────────────────────────────
# ヘルパー
# ──────────────────────────────────────────────────

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


def _clean_meta(val) -> str:
    if val is None:
        return ""
    s = str(val).strip()
    return "" if s == "None" else s
