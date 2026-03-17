"""
F. フォント埋め込みユーティリティ
Noto Serif CJK JP (源ノ明朝) の自動ダウンロード・埋め込み
"""
from __future__ import annotations
import urllib.request
import ssl
import zipfile
import io
from pathlib import Path

# キャッシュディレクトリ
_CACHE_DIR = Path.home() / ".tateyomi" / "fonts"

# Noto Serif CJK JP フォント (Google Fonts GitHub)
# Regular + Bold の2ウェイト
_FONT_URLS = {
    "NotoSerifCJKjp-Regular.otf": (
        "https://github.com/googlefonts/noto-cjk/raw/main/Serif/OTF/Japanese/"
        "NotoSerifCJKjp-Regular.otf"
    ),
    "NotoSerifCJKjp-Bold.otf": (
        "https://github.com/googlefonts/noto-cjk/raw/main/Serif/OTF/Japanese/"
        "NotoSerifCJKjp-Bold.otf"
    ),
}

# サブセット版（軽量）
_FONT_SUBSET_URLS = {
    "NotoSerifJP-Regular.otf": (
        "https://github.com/notofonts/noto-cjk/releases/download/"
        "Serif2.002/07_NotoSerifJP.zip"
    ),
}


def get_cached_fonts() -> dict[str, Path]:
    """キャッシュ済みフォントのパス辞書を返す"""
    _CACHE_DIR.mkdir(parents=True, exist_ok=True)
    result: dict[str, Path] = {}
    for name in _FONT_URLS:
        p = _CACHE_DIR / name
        if p.exists() and p.stat().st_size > 1000:
            result[name] = p
    return result


def download_fonts(progress_cb=None) -> dict[str, Path]:
    """
    Noto Serif CJK JP をダウンロードしてキャッシュする。
    progress_cb(name, downloaded, total): 進捗コールバック
    Returns: {filename: Path} のキャッシュ済みパス辞書
    """
    _CACHE_DIR.mkdir(parents=True, exist_ok=True)
    ctx = ssl._create_unverified_context()
    result: dict[str, Path] = {}

    for name, url in _FONT_URLS.items():
        dest = _CACHE_DIR / name
        if dest.exists() and dest.stat().st_size > 100_000:
            result[name] = dest
            continue

        try:
            if progress_cb:
                progress_cb(name, 0, -1)

            req = urllib.request.Request(url, headers={"User-Agent": "tateyomi/0.1"})
            with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
                total = int(resp.headers.get("Content-Length", -1))
                data = b""
                chunk = 8192
                while True:
                    buf = resp.read(chunk)
                    if not buf:
                        break
                    data += buf
                    if progress_cb:
                        progress_cb(name, len(data), total)

            dest.write_bytes(data)
            result[name] = dest

        except Exception as e:
            if progress_cb:
                progress_cb(f"ERROR: {name}", 0, 0)

    return result


def embed_fonts_in_book(book, font_dir: Path | None = None) -> None:
    """
    書籍にフォント情報を付与する。
    epub3_renderer が font_dir を参照してフォントを埋め込む。
    """
    if font_dir and font_dir.is_dir():
        book.font_dir = str(font_dir)
        return

    # キャッシュ確認
    cached = get_cached_fonts()
    if cached:
        book.font_dir = str(_CACHE_DIR)


def get_font_css(font_names: list[str]) -> str:
    """フォント埋め込み用 @font-face CSS を生成"""
    lines: list[str] = []
    for name in font_names:
        weight = "bold" if "Bold" in name or "bold" in name else "normal"
        lines.append(f"""@font-face {{
  font-family: "NotoSerifCJKjp";
  font-weight: {weight};
  src: url("../Fonts/{name}");
}}""")
    if lines:
        lines.append("""body, p, h1, h2, h3 {
  font-family: "NotoSerifCJKjp", serif;
}""")
    return "\n".join(lines)
