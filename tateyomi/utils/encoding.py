"""
A. 文字コード自動検出ユーティリティ
Shift-JIS / EUC-JP / UTF-8 / UTF-16 を自動判定してテキストを返す
"""
from __future__ import annotations
from pathlib import Path

# 優先順位付き候補エンコーディング（日本語テキストでよく使われる順）
_CANDIDATES = [
    "utf-8-sig",   # BOM付きUTF-8
    "utf-8",
    "utf-16",
    "shift_jis",   # 青空文庫・Windows標準
    "cp932",       # Windows拡張Shift-JIS
    "euc_jp",      # Unix系日本語
    "iso-2022-jp", # JIS
    "latin-1",     # バイナリフォールバック
]

# 日本語文字が含まれているかの簡易チェック用
_JP_RANGE = (
    ("\u3040", "\u309f"),  # ひらがな
    ("\u30a0", "\u30ff"),  # カタカナ
    ("\u4e00", "\u9fff"),  # 漢字
    ("\uff00", "\uffef"),  # 全角英数
)


def _jp_ratio(text: str, sample: int = 2000) -> float:
    """テキスト先頭 sample 文字中の日本語文字比率"""
    chunk = text[:sample]
    if not chunk:
        return 0.0
    jp = sum(
        1 for ch in chunk
        if any(lo <= ch <= hi for lo, hi in _JP_RANGE)
    )
    return jp / len(chunk)


def detect_encoding(path: Path) -> str:
    """ファイルの文字コードを自動検出して返す"""
    raw = path.read_bytes()

    # chardet が使えれば使う
    try:
        import chardet
        result = chardet.detect(raw[:8192])
        enc = result.get("encoding") or ""
        conf = result.get("confidence", 0)
        if enc and conf > 0.7:
            # Shift_JIS / Windows-1252 などを正規化
            enc_lower = enc.lower().replace("-", "_")
            if "shift" in enc_lower or "932" in enc_lower:
                return "cp932"
            if "euc" in enc_lower and "jp" in enc_lower:
                return "euc_jp"
            return enc
    except ImportError:
        pass

    # フォールバック: 各エンコーディングで試みて日本語比率が高いものを採用
    best_enc = "utf-8"
    best_ratio = -1.0

    for enc in _CANDIDATES:
        try:
            text = raw.decode(enc)
            ratio = _jp_ratio(text)
            if ratio > best_ratio:
                best_ratio = ratio
                best_enc = enc
        except (UnicodeDecodeError, LookupError):
            continue

    return best_enc


def read_text_auto(path: Path) -> tuple[str, str]:
    """
    ファイルを自動検出したエンコーディングで読み込む。
    Returns: (text, detected_encoding)
    """
    enc = detect_encoding(path)
    raw = path.read_bytes()
    try:
        text = raw.decode(enc, errors="replace")
    except (UnicodeDecodeError, LookupError):
        text = raw.decode("utf-8", errors="replace")
        enc = "utf-8"
    return text, enc
