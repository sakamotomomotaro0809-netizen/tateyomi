"""
テキストレベルの縦書き変換
約物の置換・縦中横スパン挿入・長段落自動分割
"""
from __future__ import annotations
import re
from typing import Callable, Optional
from tateyomi.config import ParsedBook
from tateyomi.utils.char_table import apply_vertical_chars, wrap_tcy_spans

# 長段落分割の閾値（文字数）
_PARA_SPLIT_THRESHOLD = 150


def transform(
    book: ParsedBook,
    enable_tcy: bool = True,
    normalize: bool = False,
    auto_reflow: bool = True,
    progress_cb: Optional[Callable[[int, int, str], None]] = None,
) -> ParsedBook:
    """
    全チャプターのHTML内テキストを縦書き用に変換する。
    normalize=True の場合、N. テキスト正規化も適用する。
    auto_reflow=True の場合、長段落を句点で自動分割する。
    progress_cb(current, total, chapter_title) を章ごとに呼び出す。
    """
    total = len(book.chapters)
    for i, chapter in enumerate(book.chapters):
        if progress_cb:
            progress_cb(i, total, chapter.title or f"章 {i + 1}")
        html = chapter.html_content
        if normalize:
            from tateyomi.utils.normalize import normalize_html_text
            html = normalize_html_text(html)
        if auto_reflow:
            html = split_long_paragraphs(html)
        html = apply_vertical_chars(html)
        if enable_tcy:
            html = wrap_tcy_spans(html)
        chapter.html_content = html
    if progress_cb and total:
        progress_cb(total, total, "完了")
    return book


def split_long_paragraphs(html: str, threshold: int = _PARA_SPLIT_THRESHOLD) -> str:
    """
    threshold文字を超える <p> 要素を句点（。）で段落分割する。
    HTMLタグは保持し、テキストノードのみ処理する。
    """
    def split_p(m: re.Match) -> str:
        tag_open = m.group(1)   # <p ...>
        content  = m.group(2)   # 中身
        tag_close = m.group(3)  # </p>

        # タグを除いた純テキスト長を計算
        plain = re.sub(r"<[^>]+>", "", content)
        if len(plain) <= threshold:
            return m.group(0)

        # 句点「。」または「．」の後で分割（タグの外側のみ）
        parts = _split_at_kuten(content)
        if len(parts) <= 1:
            return m.group(0)

        return "".join(f"{tag_open}{p}{tag_close}" for p in parts if p.strip())

    return re.sub(
        r"(<p(?:\s[^>]*)?>)(.*?)(</p>)",
        split_p,
        html,
        flags=re.DOTALL,
    )


def _split_at_kuten(content: str) -> list[str]:
    """
    句点「。」「．」の直後でコンテンツを分割する。
    HTMLタグをまたがらないよう、テキストノード単位で処理する。
    """
    # トークン分割: タグ / テキスト
    tokens = re.split(r"(<[^>]+>)", content)
    parts: list[str] = []
    current: list[str] = []
    in_tag_depth = 0

    for token in tokens:
        if token.startswith("<"):
            # タグはそのまま現在のパートに追加
            if re.match(r"<[^/][^>]*>", token):
                in_tag_depth += 1
            elif token.startswith("</"):
                in_tag_depth -= 1
            current.append(token)
        else:
            # テキストノード: 句点の後で区切る
            i = 0
            while i < len(token):
                ch = token[i]
                current.append(ch)
                if ch in ("。", "．") and in_tag_depth == 0:
                    parts.append("".join(current))
                    current = []
                i += 1

    if current:
        parts.append("".join(current))

    return parts
