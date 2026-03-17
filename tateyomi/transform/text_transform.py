"""
テキストレベルの縦書き変換
約物の置換・縦中横スパン挿入
"""
from __future__ import annotations
from tateyomi.config import ParsedBook
from tateyomi.utils.char_table import apply_vertical_chars, wrap_tcy_spans


def transform(book: ParsedBook, enable_tcy: bool = True) -> ParsedBook:
    """
    全チャプターのHTML内テキストを縦書き用に変換する。
    """
    for chapter in book.chapters:
        html = chapter.html_content
        html = apply_vertical_chars(html)
        if enable_tcy:
            html = wrap_tcy_spans(html)
        chapter.html_content = html
    return book
