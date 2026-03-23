"""
縦書き変換用文字テーブル
横書き用約物 → 縦書き用Unicodeフォーム変換
"""

# 横書き → 縦書き Unicodeフォーム変換テーブル
# 縦書きフォームが存在する文字のみ（CSS writing-modeで自動回転しないもの）
HORIZONTAL_TO_VERTICAL: dict[str, str] = {
    # 句読点
    "、": "\uFE11",  # ﹑ PRESENTATION FORM FOR VERTICAL IDEOGRAPHIC COMMA
    "。": "\uFE12",  # ﹒ PRESENTATION FORM FOR VERTICAL IDEOGRAPHIC FULL STOP
    # 括弧類（縦書きフォーム）
    "「": "\uFE41",  # ﹁ PRESENTATION FORM FOR VERTICAL LEFT CORNER BRACKET
    "」": "\uFE42",  # ﹂ PRESENTATION FORM FOR VERTICAL RIGHT CORNER BRACKET
    "『": "\uFE43",  # ﹃ PRESENTATION FORM FOR VERTICAL WHITE LEFT CORNER BRACKET
    "』": "\uFE44",  # ﹄ PRESENTATION FORM FOR VERTICAL WHITE RIGHT CORNER BRACKET
    # 三点リーダー
    "…": "\uFE19",  # ︙ PRESENTATION FORM FOR VERTICAL HORIZONTAL ELLIPSIS
    # ダッシュ類はCSSに任せる（回転は自動）
}

# 縦中横 (tate-chu-yoko) に変換すべきパターン
# 2〜4桁の数字、アルファベット2〜4文字など
import re

TCY_PATTERN = re.compile(r"[0-9]{1,4}|[A-Za-z][A-Za-z0-9]{0,7}")


def apply_vertical_chars(html: str) -> str:
    """横書き約物を縦書きUnicodeフォームに変換。HTMLタグ内は変換しない。"""
    parts = re.split(r"(<[^>]+>)", html)
    result = []
    for part in parts:
        if part.startswith("<"):
            result.append(part)
        else:
            result.append("".join(HORIZONTAL_TO_VERTICAL.get(ch, ch) for ch in part))
    return "".join(result)


def wrap_tcy_spans(html: str) -> str:
    """
    2〜4桁の数字やラテン文字列を <span class="tcy"> で囲む
    縦中横（縦書き中の横組み）対応
    """
    def replacer(m: re.Match) -> str:
        return f'<span class="tcy">{m.group()}</span>'

    # HTMLタグ内は変換しない（属性値を破壊しないよう簡易的に対処）
    parts = re.split(r"(<[^>]+>)", html)
    result = []
    for part in parts:
        if part.startswith("<"):
            result.append(part)
        else:
            result.append(TCY_PATTERN.sub(replacer, part))
    return "".join(result)
