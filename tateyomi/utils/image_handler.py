"""
画像抽出・変換ユーティリティ
"""
from __future__ import annotations
import io
from pathlib import Path
from PIL import Image


def normalize_image(data: bytes, media_type: str) -> tuple[bytes, str]:
    """
    画像データを正規化。JPEGまたはPNGに統一。
    Returns: (正規化されたバイト列, media_type)
    """
    try:
        img = Image.open(io.BytesIO(data))
        buf = io.BytesIO()
        if img.mode in ("RGBA", "P", "LA"):
            img = img.convert("RGBA")
            img.save(buf, format="PNG")
            return buf.getvalue(), "image/png"
        else:
            img = img.convert("RGB")
            img.save(buf, format="JPEG", quality=92)
            return buf.getvalue(), "image/jpeg"
    except Exception:
        # 変換失敗時はそのまま返す
        return data, media_type


def ext_from_media_type(media_type: str) -> str:
    mapping = {
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "image/svg+xml": ".svg",
        "image/webp": ".webp",
    }
    return mapping.get(media_type, ".img")
