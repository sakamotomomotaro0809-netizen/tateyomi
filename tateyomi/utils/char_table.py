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
# 詳しい規則は下の TCY_PATTERN 付近のコメントを参照
import re

# 縦中横の対象。
#
# 2026-08-24: 以前は数字4桁・英字8文字までを対象にしていたが、縦中横は対象を
#   1文字ぶんの枡に押し込む指定なので、長い綴りを入れると潰れて読めなくなる。
#   実測では Google(6文字)が36回、ChatGPT(7文字)が5回、この状態で入っていた。
#
#   そこで次の2つだけを縦中横にし、それ以外は回転に任せる
#   （text-orientation: mixed の既定動作）。
#     1. 1〜3文字の数字（100・500）と1〜2文字のラテン文字（AI など）
#     2. 2〜3文字の全大文字略語（SNS・PPC・SEO・URL・PDF など）
#
#   2 を足したのは、SNS や PPC が横倒しで出てくると読みの流れが切れるため。
#   日本語組版では2〜3文字の欧文略語を縦中横に組むのが通例（W3C 日本語組版処理の要件）。
#   Google や ChatGPT のような綴りの語はここに該当しないので、従来どおり回転する。
#
#   ⚠ 対象は「綴り全体」で拾う。ここを 2文字ずつ拾う正規表現にすると
#     Google が Go/og/le と刻まれて、かえって悪化する。
#   ⚠ 桁区切りのカンマを含めて1つの数として拾う。含めないと「1,000」が
#     1 と 000 に割れ、1 だけ立って 000 が寝るという不揃いな組みになる
#     （実測でこの割れが24箇所あった）。
TCY_PATTERN = re.compile(r"[0-9]+(?:,[0-9]{3})*|[A-Za-z][A-Za-z0-9]*")
TCY_MAX_LEN = 2
TCY_ACRONYM_MAX_LEN = 3


def _is_tcy(s: str) -> bool:
    """縦中横にすべき綴りか。"""
    if len(s) <= TCY_MAX_LEN:
        return True
    # 3桁の数字（100・500 など）と、全大文字の略語（SNS・PPC など）は3文字まで許す
    if len(s) <= TCY_ACRONYM_MAX_LEN and (s.isdigit() or s.isupper()):
        return True
    return False


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
    縦中横にすべき綴りを <span class="tcy"> で囲む。

    対象は 1〜2文字の数字・ラテン文字と、2〜3文字の全大文字略語（SNS・PPC など）。
    それ以外は囲まない。縦中横は1文字ぶんの枡に押し込む指定なので、長い綴りを
    入れると潰れて読めなくなるため（Google・ChatGPT など）。囲まなければ
    text-orientation: mixed の既定どおり回転して表示され、そちらが通常の見え方。
    """
    def replacer(m: re.Match) -> str:
        s = m.group()
        if not _is_tcy(s):
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
