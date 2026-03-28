#!/usr/bin/env python3
"""
Japanese Text Preprocessor for Fish Audio TTS API.

数字表現をひらがなに変換し、音便規則を正確に適用する。
Fish Audio APIに送信する前の前処理として使用する。

Usage:
    CLI:    python scripts/text_preprocessor.py "1000万円の売上"
    Import: from scripts.text_preprocessor import JapaneseTextPreprocessor
            preprocessor = JapaneseTextPreprocessor()
            result = preprocessor.preprocess("1000万円の売上")
"""

import re
import sys


class JapaneseTextPreprocessor:
    """日本語テキスト内の数字をひらがなに変換するプリプロセッサ。"""

    # 大単位（兆・億・万）
    LARGE_UNITS = {
        "兆": 10**12,
        "億": 10**8,
        "万": 10**4,
    }

    # 大単位の読み（通常形）
    LARGE_UNIT_READINGS = {
        "兆": "ちょう",
        "億": "おく",
        "万": "まん",
    }

    # 1の位の読み
    ONES = {
        0: "",
        1: "いち",
        2: "に",
        3: "さん",
        4: "よん",
        5: "ご",
        6: "ろく",
        7: "なな",
        8: "はち",
        9: "きゅう",
    }

    # 十の位: 特殊読み
    TENS_READING = {
        1: "じゅう",
        2: "にじゅう",
        3: "さんじゅう",
        4: "よんじゅう",
        5: "ごじゅう",
        6: "ろくじゅう",
        7: "ななじゅう",
        8: "はちじゅう",
        9: "きゅうじゅう",
    }

    # 百の位: 音便規則あり
    HUNDREDS_READING = {
        1: "ひゃく",
        2: "にひゃく",
        3: "さんびゃく",      # 連濁
        4: "よんひゃく",
        5: "ごひゃく",
        6: "ろっぴゃく",      # 促音便 + 半濁音
        7: "ななひゃく",
        8: "はっぴゃく",      # 促音便 + 半濁音
        9: "きゅうひゃく",
    }

    # 千の位: 音便規則あり
    THOUSANDS_READING = {
        1: "いっせん",        # 促音便
        2: "にせん",
        3: "さんぜん",        # 連濁
        4: "よんせん",
        5: "ごせん",
        6: "ろくせん",
        7: "ななせん",
        8: "はっせん",        # 促音便
        9: "きゅうせん",
    }

    # 大単位に付く1の音便規則
    # 1兆 → いっちょう, 1億 → いちおく, 1万 → いちまん
    ONE_BEFORE_LARGE_UNIT = {
        "兆": "いっ",         # 促音便
        "億": "いち",
        "万": "いち",
    }

    # 8 + 大単位の音便規則
    EIGHT_BEFORE_LARGE_UNIT = {
        "兆": "はっ",         # 促音便
        "億": "はち",
        "万": "はち",
    }

    # 大単位の特殊読み（兆の場合）
    LARGE_UNIT_SPECIAL = {
        "兆": "ちょう",
        "億": "おく",
        "万": "まん",
    }

    def __init__(self):
        """プリプロセッサを初期化する。"""
        # 数字 + 大単位のパターン（複合パターン対応）
        # 例: 1兆2000億3000万, 1000万, 300万, 1億
        # 数字のみ（単位なし）も対象にする
        self._pattern = re.compile(
            r"(\d[\d,]*)"
            r"(兆)?"
            r"(\d[\d,]*)?"
            r"(億)?"
            r"(\d[\d,]*)?"
            r"(万)?"
            r"(\d[\d,]*)?"
        )

    def preprocess(self, text: str) -> str:
        """テキスト内の数字表現をひらがなに変換する。

        Args:
            text: 変換対象のテキスト

        Returns:
            数字がひらがなに変換されたテキスト
        """
        # 数字+大単位の複合パターンを検出して変換
        result = self._convert_number_expressions(text)
        return result

    def _convert_number_expressions(self, text: str) -> str:
        """数字表現を検出してひらがなに変換する。"""
        # 複合数字パターン: 1兆2000億3000万4000 のような形式
        # より具体的なパターンから順にマッチさせる
        compound_pattern = re.compile(
            r"(\d[\d,]*兆)?(\d[\d,]*億)?(\d[\d,]*万)?(\d[\d,]*)?(?=[^\d]|$)"
        )

        def replace_compound(match):
            full = match.group(0)
            if not full or not any(c.isdigit() for c in full):
                return full

            total = 0
            has_unit = False

            # 兆の部分
            if match.group(1):
                num_str = match.group(1).replace(",", "").replace("兆", "")
                total += int(num_str) * 10**12
                has_unit = True

            # 億の部分
            if match.group(2):
                num_str = match.group(2).replace(",", "").replace("億", "")
                total += int(num_str) * 10**8
                has_unit = True

            # 万の部分
            if match.group(3):
                num_str = match.group(3).replace(",", "").replace("万", "")
                total += int(num_str) * 10**4
                has_unit = True

            # 残りの数字（単位なし）
            if match.group(4):
                num_str = match.group(4).replace(",", "")
                total += int(num_str)

            if total == 0 and not has_unit:
                return full

            return self._number_to_hiragana(total)

        # まず単純な「数字+単位」パターンを処理
        # 例: 1000万, 300万, 1億, 1兆
        simple_pattern = re.compile(r"(\d[\d,]*)(兆|億|万)")

        # 複合形式を検出: 数字+単位が2つ以上連続するケース
        compound_full = re.compile(
            r"(\d[\d,]*兆)(\d[\d,]*億)?(\d[\d,]*万)?(\d[\d,]*)?"
            r"|(\d[\d,]*億)(\d[\d,]*万)?(\d[\d,]*)?"
            r"|(\d[\d,]*万)(\d[\d,]*)?"
        )

        def replace_compound_full(match):
            full = match.group(0)
            total = 0

            for unit_char, unit_val in [("兆", 10**12), ("億", 10**8), ("万", 10**4)]:
                idx = full.find(unit_char)
                if idx >= 0:
                    # 単位の前にある数字を取得
                    before = full[:idx]
                    # 前の単位より後の部分だけ取得
                    num_part = ""
                    for c in reversed(before):
                        if c.isdigit() or c == ",":
                            num_part = c + num_part
                        else:
                            break
                    if num_part:
                        num_part = num_part.replace(",", "")
                        total += int(num_part) * unit_val
                    full = full[idx + 1:]

            # 残りの数字
            remaining = full.strip()
            if remaining:
                remaining = remaining.replace(",", "")
                if remaining.isdigit():
                    total += int(remaining)

            return self._number_to_hiragana(total)

        # 単純パターンで処理（一つの数字+一つの単位）
        def replace_simple(match):
            num_str = match.group(1).replace(",", "")
            unit = match.group(2)
            num = int(num_str)
            unit_val = self.LARGE_UNITS[unit]
            total = num * unit_val
            return self._number_to_hiragana(total)

        # 複合パターンがあるか確認
        compound_check = re.compile(
            r"\d[\d,]*(?:兆|億|万)(?:\d[\d,]*(?:兆|億|万|$))+"
        )
        if compound_check.search(text):
            text = compound_full.sub(replace_compound_full, text)
        else:
            text = simple_pattern.sub(replace_simple, text)

        return text

    def _number_to_hiragana(self, num: int) -> str:
        """数値をひらがなに変換する（音便規則適用）。

        Args:
            num: 変換する数値

        Returns:
            ひらがな表現
        """
        if num == 0:
            return "ぜろ"

        result = ""

        # 兆の処理
        cho = num // 10**12
        if cho > 0:
            result += self._digit_group_to_hiragana(cho, "兆")
            num %= 10**12

        # 億の処理
        oku = num // 10**8
        if oku > 0:
            result += self._digit_group_to_hiragana(oku, "億")
            num %= 10**8

        # 万の処理
        man = num // 10**4
        if man > 0:
            result += self._digit_group_to_hiragana(man, "万")
            num %= 10**4

        # 千以下の処理
        if num > 0:
            result += self._small_number_to_hiragana(num)

        return result

    def _digit_group_to_hiragana(self, group_num: int, unit: str) -> str:
        """数字グループ（大単位の係数）をひらがなに変換する。

        例: 1 + 兆 → いっちょう, 3000 + 万 → さんぜんまん

        Args:
            group_num: 大単位の係数（1-9999）
            unit: 大単位（兆/億/万）

        Returns:
            ひらがな表現（単位含む）
        """
        unit_reading = self.LARGE_UNIT_READINGS[unit]

        if group_num == 1:
            prefix = self.ONE_BEFORE_LARGE_UNIT[unit]
            return prefix + unit_reading

        if group_num == 8:
            prefix = self.EIGHT_BEFORE_LARGE_UNIT[unit]
            return prefix + unit_reading

        # 10, 100, 1000 などの場合は小数字変換してから単位を付ける
        # ただし末尾の「ち」→促音便の処理が必要な場合がある
        prefix = self._small_number_to_hiragana(group_num)

        # 10の場合: じゅう + 兆 → じゅっちょう
        # ここでは特殊ケースを処理
        if unit == "兆":
            # 「く」で終わる場合: 促音便
            # 6(ろく), 8(はちorはっ) → ろくちょう?
            # 実際には 6兆=ろくちょう, 10兆=じゅっちょう
            if prefix.endswith("く"):
                prefix = prefix[:-1] + "っ"
                unit_reading = "ちょう"
            elif prefix.endswith("ち"):
                prefix = prefix[:-1] + "っ"
                unit_reading = "ちょう"

        return prefix + unit_reading

    def _small_number_to_hiragana(self, num: int) -> str:
        """1-9999の数値をひらがなに変換する。

        Args:
            num: 1-9999の数値

        Returns:
            ひらがな表現
        """
        if num == 0:
            return ""

        result = ""

        # 千の位
        sen = num // 1000
        if sen > 0:
            result += self.THOUSANDS_READING[sen]
            num %= 1000

        # 百の位
        hyaku = num // 100
        if hyaku > 0:
            result += self.HUNDREDS_READING[hyaku]
            num %= 100

        # 十の位
        juu = num // 10
        if juu > 0:
            result += self.TENS_READING[juu]
            num %= 10

        # 一の位
        if num > 0:
            result += self.ONES[num]

        return result


def main():
    """CLIエントリポイント。"""
    if len(sys.argv) < 2:
        print("Usage: python text_preprocessor.py <text>", file=sys.stderr)
        print('Example: python text_preprocessor.py "1000万円の投資"', file=sys.stderr)
        sys.exit(1)

    preprocessor = JapaneseTextPreprocessor()
    input_text = " ".join(sys.argv[1:])
    output_text = preprocessor.preprocess(input_text)
    print(output_text)


if __name__ == "__main__":
    main()
