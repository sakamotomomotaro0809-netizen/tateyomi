"""
テキストレベルの縦書き変換
約物の置換・縦中横スパン挿入
"""
from __future__ import annotations
from typing import Callable, Optional
from tateyomi.config import ParsedBook
from tateyomi.utils.char_table import apply_vertical_chars, wrap_tcy_spans


def transform(
    book: ParsedBook,
    enable_tcy: bool = True,
    normalize: bool = False,
    progress_cb: Optional[Callable[[int, int, str], None]] = None,
) -> ParsedBook:
    """
    全チャプターのHTML内テキストを縦書き用に変換する。
    normalize=True の場合、N. テキスト正規化も適用する。
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
        html = apply_vertical_chars(html)
        if enable_tcy:
            html = wrap_tcy_spans(html)
        chapter.html_content = html
    if progress_cb and total:
        progress_cb(total, total, "完了")
    return book
