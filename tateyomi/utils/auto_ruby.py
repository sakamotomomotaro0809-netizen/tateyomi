"""
AX. ルビ自動付与ユーティリティ
fugashi (MeCab) または cutlet を使って漢字にルビを付ける。
どちらもインストールされていない場合は元テキストをそのまま返す。
"""
from __future__ import annotations
import re

_KANJI = re.compile(r"[\u4e00-\u9fff\u3400-\u4dbf]")


def _has_kanji(text: str) -> bool:
    return bool(_KANJI.search(text))


def _ruby_with_cutlet(text: str) -> str:
    """cutlet を使って漢字かなまじり文にルビを付ける"""
    from cutlet import Cutlet  # type: ignore
    katsu = Cutlet()
    # 形態素解析してルビ化
    result_parts: list[str] = []
    tokens = katsu.mecab.parse(text)
    for line in tokens.splitlines():
        if line == "EOS" or not line:
            continue
        parts = line.split("\t")
        if len(parts) < 2:
            continue
        surface = parts[0]
        reading = parts[1].split(",")[7] if len(parts[1].split(",")) > 7 else ""
        reading = reading.strip()
        if _has_kanji(surface) and reading and reading != "*":
            # カタカナをひらがなに変換
            hira = "".join(
                chr(ord(c) - 0x60) if "ァ" <= c <= "ン" else c
                for c in reading
            )
            result_parts.append(f"<ruby>{surface}<rt>{hira}</rt></ruby>")
        else:
            result_parts.append(surface)
    return "".join(result_parts)


def _ruby_with_fugashi(text: str) -> str:
    """fugashi を使って漢字にルビを付ける"""
    import fugashi  # type: ignore
    tagger = fugashi.Tagger()
    result_parts: list[str] = []
    for word in tagger(text):
        surface = word.surface
        try:
            reading = word.feature.kana or ""
        except AttributeError:
            reading = ""
        if _has_kanji(surface) and reading:
            hira = "".join(
                chr(ord(c) - 0x60) if "ァ" <= c <= "ン" else c
                for c in reading
            )
            result_parts.append(f"<ruby>{surface}<rt>{hira}</rt></ruby>")
        else:
            result_parts.append(surface)
    return "".join(result_parts)


def add_ruby_to_text(text: str) -> str:
    """
    テキストにルビを付ける。
    cutlet → fugashi の順で試み、どちらもなければ元テキストを返す。
    """
    try:
        return _ruby_with_cutlet(text)
    except ImportError:
        pass
    try:
        return _ruby_with_fugashi(text)
    except ImportError:
        pass
    return text


def add_ruby_to_html(html: str) -> str:
    """
    HTML の <p> タグ内テキストにルビを付ける。
    既存の <ruby> タグは処理しない。
    """
    def _process_p(m: re.Match) -> str:
        inner = m.group(1)
        # 既にルビがある箇所はスキップ（<ruby>〜</ruby> を一時保護）
        placeholders: dict[str, str] = {}
        ruby_pattern = re.compile(r"<ruby>.*?</ruby>", re.DOTALL)

        def protect(rm: re.Match) -> str:
            key = f"\x00RUBY{len(placeholders)}\x00"
            placeholders[key] = rm.group(0)
            return key

        protected = ruby_pattern.sub(protect, inner)
        rubified = add_ruby_to_text(protected)
        for key, val in placeholders.items():
            rubified = rubified.replace(key, val)
        return f"<p>{rubified}</p>"

    return re.sub(r"<p>(.*?)</p>", _process_p, html, flags=re.DOTALL)


def is_available() -> bool:
    """ルビ付与ライブラリが利用可能かチェック"""
    for lib in ("cutlet", "fugashi"):
        try:
            __import__(lib)
            return True
        except ImportError:
            pass
    return False
