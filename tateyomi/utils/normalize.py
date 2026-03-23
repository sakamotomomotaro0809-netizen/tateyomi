"""
N. テキスト正規化ユーティリティ
全角/半角統一・不要スペース除去・記号正規化
"""
from __future__ import annotations
import re
import unicodedata

# 全角英数 → 半角 (HTML内の属性値は変換しない)
_FULLWIDTH_ASCII = str.maketrans(
    "ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ"
    "ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ"
    "０１２３４５６７８９",
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
)

# 半角カタカナ → 全角カタカナ（unicodedata.normalize で対応）
# 連続スペース・タブ → 単一スペース
_MULTI_SPACE = re.compile(r"[ \t]+")
# 行頭/行末の余分な空白
_LINE_SPACE = re.compile(r"^[ \t]+|[ \t]+$", re.MULTILINE)
# 3つ以上の連続改行 → 2つ
_MULTI_NEWLINE = re.compile(r"\n{3,}")
# Windows改行 → Unix改行
_CRLF = re.compile(r"\r\n")

# 横書き用引用符を縦書き用に（任意）
_QUOTE_NORMALIZE = {
    '"': '「',
    '"': '」',
    ''': '「',
    ''': '」',
}


def normalize_text(text: str, fullwidth_ascii: bool = False) -> str:
    """
    日本語テキストを縦書き向けに正規化する。

    Args:
        text: 正規化するテキスト
        fullwidth_ascii: True の場合、全角英数を半角に変換
    """
    # CRLF → LF
    text = _CRLF.sub("\n", text)

    # 半角カタカナ → 全角カタカナ (NFC正規化)
    text = unicodedata.normalize("NFC", text)

    # 全角英数 → 半角 (オプション)
    if fullwidth_ascii:
        text = text.translate(_FULLWIDTH_ASCII)

    # 連続スペース・タブ → 単一スペース (改行は保持)
    text = _MULTI_SPACE.sub(" ", text)

    # 行頭/行末の空白除去
    text = _LINE_SPACE.sub("", text)

    # 3つ以上の連続改行 → 2つ (段落間を保持)
    text = _MULTI_NEWLINE.sub("\n\n", text)

    return text


def normalize_html_text(html: str) -> str:
    """
    HTMLの テキストノード だけを正規化する。
    タグ・属性は変更しない。
    """
    parts = re.split(r"(<[^>]+>)", html)
    result = []
    for part in parts:
        if part.startswith("<"):
            result.append(part)
        else:
            # テキストノードのみ正規化
            part = unicodedata.normalize("NFC", part)
            # 半角スペースの連続を1つに（インデント等は除く）
            part = _MULTI_SPACE.sub(" ", part)
            result.append(part)
    return "".join(result)
