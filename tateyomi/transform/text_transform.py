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
    vertical_forms: bool = True,
    normalize: bool = False,
    auto_reflow: bool = True,
    horizontal: bool = False,
    progress_cb: Optional[Callable[[int, int, str], None]] = None,
) -> ParsedBook:
    """
    全チャプターのHTML内テキストを縦書き用に変換する。
    normalize=True の場合、N. テキスト正規化も適用する。
    auto_reflow=True の場合、長段落を句点で自動分割する。
    horizontal=True の場合、縦書き固有の変換（約物・縦中横）をスキップする。
    progress_cb(current, total, chapter_title) を章ごとに呼び出す。
    """
    total = len(book.chapters)
    for i, chapter in enumerate(book.chapters):
        if progress_cb:
            progress_cb(i, total, chapter.title or f"章 {i + 1}")
        html = chapter.html_content
        # Markdown記法の残骸をHTMLタグに変換（EPUBへの変換漏れ対策）
        html = convert_markdown_inline(html)
        if normalize:
            from tateyomi.utils.normalize import normalize_html_text
            html = normalize_html_text(html)
        if auto_reflow:
            html = split_long_paragraphs(html)
        if not horizontal and vertical_forms:
            # 約物の縦書きUnicodeフォームは横書きでは不要。
            # 2026-08-21: 縦書きでも切れるようにした。この置換は互換用の
            #   presentation form (U+FE11 等) を本文に埋め込むため、読者が
            #   本文内検索したときに通常の「」や。と一致しなくなる。
            #   見た目は writing-mode: vertical-rl でフォント側が処理するので、
            #   置換しなくても縦組みにはなる。既定は従来どおり有効。
            html = apply_vertical_chars(html)
        if enable_tcy and not horizontal:
            html = wrap_tcy_spans(html)
        chapter.html_content = html
    if progress_cb and total:
        progress_cb(total, total, "完了")
    return book


def convert_markdown_inline(html: str) -> str:
    """
    HTMLテキスト内に残ったMarkdown記法をHTMLタグに変換する。
    **太字** → <strong>太字</strong>
    *斜体* / _斜体_ → <em>斜体</em>

    注: **...** の中に <ruby> 等のHTMLタグが含まれる場合でも正しく変換できるよう、
    HTML全体に対して正規表現を適用する（属性値内の ** は実用上ほぼ存在しないため安全）。
    """
    # ** bold ** → <strong> (先に処理して * との競合を避ける)
    html = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", html, flags=re.DOTALL)
    # __bold__ → <strong>
    html = re.sub(r"__(.+?)__", r"<strong>\1</strong>", html, flags=re.DOTALL)
    # *italic* → <em> (** は処理済みなので残りの単体 * のみ)
    # タグをまたがらない範囲のみ（greedy ではなく行内で完結するパターン）
    html = re.sub(r"\*([^*<>\n]+?)\*", r"<em>\1</em>", html)
    # _italic_ → <em>
    html = re.sub(r"_([^_<>\n]+?)_", r"<em>\1</em>", html)
    return html


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
