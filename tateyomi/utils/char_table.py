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

# 縦中横の対象は「2文字まで」。
#
# 2026-08-24: 以前は数字4桁・英字8文字までを対象にしていたが、縦中横は対象を
#   1文字ぶんの枡に押し込む指定なので、長い綴りを入れると潰れて読めなくなる。
#   実測では Google(6文字)が36回、ChatGPT(7文字)が5回、この状態で入っていた。
#   日本語組版の原則どおり2文字までに絞り、3文字以上は回転に任せる
#   （text-orientation: mixed の既定動作。SEO や PPC が横に寝るのは通常の見え方）。
#   ⚠ 対象は「綴り全体」で拾う。ここを 2文字ずつ拾う正規表現にすると
#     Google が Go/og/le と刻まれて、かえって悪化する。
TCY_PATTERN = re.compile(r"[0-9]+|[A-Za-z][A-Za-z0-9]*")
TCY_MAX_LEN = 2


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
    2文字までの数字・ラテン文字列を <span class="tcy"> で囲む（縦中横）。

    3文字以上は囲まない。縦中横は1文字ぶんの枡に押し込む指定なので、長い綴りを
    入れると潰れて読めなくなるため（Google・ChatGPT など）。囲まなければ
    text-orientation: mixed の既定どおり回転して表示され、そちらが通常の見え方。
    """
    def replacer(m: re.Match) -> str:
        s = m.group()
        if len(s) > TCY_MAX_LEN:
            return s
        return f'<span class="tcy">{s}</span>'

    # HTMLタグ内は変換しない（属性値を破壊しないよう簡易的に対処）
    #
    # 2026-08-24: リンクの「中の文字」も対象外にする。以前は巻末に載せたURLが
    #   https / book / affiliat / e … と断片ごとに縦中横で囲まれ、1枡ずつに
    #   押し込まれて判読できない状態になっていた（実測）。URLは綴りが意味を持つので
    #   刻んではいけない。回転させたまま出すのが正しい。
    parts = re.split(r"(<[^>]+>)", html)
    result = []
    in_link = 0
    for part in parts:
        if part.startswith("<"):
            if re.match(r"<a\b", part, re.I):
                in_link += 1
            elif re.match(r"</a\s*>", part, re.I):
                in_link = max(0, in_link - 1)
            result.append(part)
        elif in_link:
            result.append(part)
        else:
            result.append(TCY_PATTERN.sub(replacer, part))
    return "".join(result)
