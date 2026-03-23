"""
K. 画像自動リサイズ
Kindle推奨サイズ (1650×2550px) に収まるよう縮小する
大きすぎる画像はKindle変換で品質劣化・エラーの原因になる
"""
from __future__ import annotations
import io
from PIL import Image

# Kindle KDP 推奨最大サイズ
KINDLE_MAX_W = 1650
KINDLE_MAX_H = 2550
# 表紙推奨: 2560×1600 (横) or 1600×2560 (縦)
COVER_W = 1600
COVER_H = 2560


def resize_image(
    data: bytes,
    media_type: str,
    max_width: int = KINDLE_MAX_W,
    max_height: int = KINDLE_MAX_H,
) -> tuple[bytes, str]:
    """
    画像を最大サイズ以内にリサイズする。
    アスペクト比を維持。元が小さい場合は変更しない。
    Returns: (バイト列, media_type)
    """
    try:
        img = Image.open(io.BytesIO(data))
        orig_w, orig_h = img.size

        # リサイズ不要なら元データをそのまま返す
        if orig_w <= max_width and orig_h <= max_height:
            return data, media_type

        # アスペクト比を維持しつつ縮小
        ratio = min(max_width / orig_w, max_height / orig_h)
        new_w = int(orig_w * ratio)
        new_h = int(orig_h * ratio)

        img = img.resize((new_w, new_h), Image.LANCZOS)

        # アルファチャンネル処理
        buf = io.BytesIO()
        if img.mode in ("RGBA", "P", "LA"):
            img = img.convert("RGBA")
            img.save(buf, format="PNG", optimize=True)
            return buf.getvalue(), "image/png"
        else:
            img = img.convert("RGB")
            img.save(buf, format="JPEG", quality=90, optimize=True)
            return buf.getvalue(), "image/jpeg"

    except Exception:
        # リサイズ失敗時は元のデータをそのまま返す
        return data, media_type


def resize_cover(data: bytes, media_type: str) -> tuple[bytes, str]:
    """表紙画像を Kindle 推奨サイズ (1600×2560) に合わせる"""
    return resize_image(data, media_type, COVER_W, COVER_H)


def resize_images_in_book(book, max_w: int = KINDLE_MAX_W, max_h: int = KINDLE_MAX_H) -> None:
    """ParsedBook 内の全画像をリサイズする（インプレース変更）"""
    for img in book.images:
        is_cover = img.href == getattr(book, "cover_image_href", None)
        if is_cover:
            new_data, new_mt = resize_cover(img.data, img.media_type)
        else:
            new_data, new_mt = resize_image(img.data, img.media_type, max_w, max_h)
        img.data = new_data
        img.media_type = new_mt
