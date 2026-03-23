"""
表紙画像自動生成ユーティリティ
タイトル・著者名をPillowで描画してKindle推奨サイズ(1600x2560)の表紙画像を生成する。
フォントが見つからない場合はデフォルトフォントにフォールバック。
"""
from __future__ import annotations
import io
from pathlib import Path

from tateyomi.config import ParsedBook, ImageItem

# Kindle推奨表紙サイズ
COVER_W = 1600
COVER_H = 2560

# 背景色・文字色のデフォルト
BG_COLOR = (245, 240, 230)       # クリーム色
TITLE_COLOR = (30, 30, 60)       # 紺
AUTHOR_COLOR = (80, 80, 100)     # グレー紺
LINE_COLOR = (160, 140, 100)     # ゴールド


def _find_cjk_font() -> str | None:
    """システムからCJKフォントを探す"""
    candidates = [
        # Windows
        "C:/Windows/Fonts/msgothic.ttc",
        "C:/Windows/Fonts/meiryo.ttc",
        "C:/Windows/Fonts/YuGothM.ttc",
        "C:/Windows/Fonts/NotoSerifCJKjp-Regular.otf",
        # Linux
        "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc",
        "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf",
        # macOS
        "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc",
        "/Library/Fonts/Osaka.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return path
    # tateyomi フォントキャッシュ
    try:
        from tateyomi.utils.fonts import get_cached_fonts
        cached = get_cached_fonts()
        if cached:
            return str(next(iter(cached.values())))
    except Exception:
        pass
    return None


def generate_cover(title: str, author: str = "") -> bytes:
    """表紙画像をPNGバイト列として返す"""
    from PIL import Image, ImageDraw, ImageFont

    img = Image.new("RGB", (COVER_W, COVER_H), BG_COLOR)
    draw = ImageDraw.Draw(img)

    font_path = _find_cjk_font()

    def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
        if font_path:
            try:
                return ImageFont.truetype(font_path, size)
            except Exception:
                pass
        return ImageFont.load_default()

    # 装飾ライン（上下）
    line_y_top = COVER_H // 6
    line_y_bot = COVER_H * 5 // 6
    for y_off in (-2, 0, 2):
        draw.line([(80, line_y_top + y_off), (COVER_W - 80, line_y_top + y_off)],
                  fill=LINE_COLOR, width=2)
        draw.line([(80, line_y_bot + y_off), (COVER_W - 80, line_y_bot + y_off)],
                  fill=LINE_COLOR, width=2)

    # タイトル（中央寄せ、複数行対応）
    title_font = load_font(120)
    max_chars = 12  # 1行の最大文字数
    title_lines = [title[i:i + max_chars] for i in range(0, len(title), max_chars)]
    line_spacing = 140
    total_h = len(title_lines) * line_spacing
    y_start = COVER_H // 2 - total_h // 2 - 60

    for j, line in enumerate(title_lines):
        try:
            bbox = draw.textbbox((0, 0), line, font=title_font)
            text_w = bbox[2] - bbox[0]
        except AttributeError:
            text_w = len(line) * 100
        x = (COVER_W - text_w) // 2
        draw.text((x, y_start + j * line_spacing), line, font=title_font, fill=TITLE_COLOR)

    # 著者名
    if author:
        author_font = load_font(60)
        try:
            bbox = draw.textbbox((0, 0), author, font=author_font)
            aw = bbox[2] - bbox[0]
        except AttributeError:
            aw = len(author) * 50
        ax = (COVER_W - aw) // 2
        ay = line_y_bot + 50
        draw.text((ax, ay), author, font=author_font, fill=AUTHOR_COLOR)

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def add_cover_to_book(book: ParsedBook) -> None:
    """表紙画像を持たない ParsedBook に自動生成した表紙を追加する"""
    if book.cover_image_href:
        return  # 既存の表紙がある場合はスキップ

    data = generate_cover(book.title or "No Title", book.author or "")
    cover = ImageItem(
        item_id="cover-img",
        href="Images/cover.png",
        media_type="image/png",
        data=data,
    )
    book.images.insert(0, cover)
    book.cover_image_href = "Images/cover.png"
