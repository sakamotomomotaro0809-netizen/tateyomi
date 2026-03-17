"""青空文庫プリプロセッサのテスト"""
import pytest
from tateyomi.utils.aozora import parse_aozora, _ruby_to_html, _process_annotations


class TestRubyConversion:
    def test_pipe_ruby(self):
        result = _ruby_to_html("｜夏目漱石《なつめそうせき》")
        assert "<ruby>夏目漱石<rt>なつめそうせき</rt></ruby>" in result

    def test_auto_ruby(self):
        result = _ruby_to_html("私《わたくし》は")
        assert "<ruby>私<rt>わたくし</rt></ruby>" in result

    def test_no_ruby(self):
        result = _ruby_to_html("普通のテキスト")
        assert result == "普通のテキスト"

    def test_multiple_ruby(self):
        result = _ruby_to_html("先生《せんせい》と私《わたくし》")
        assert result.count("<ruby>") == 2


class TestAnnotations:
    def test_heading_big(self):
        line = "上　先生と私［＃「上　先生と私」は大見出し］"
        html, level = _process_annotations(line)
        assert level == "h1"
        assert "先生と私" in html

    def test_heading_mid(self):
        line = "一［＃「一」は中見出し］"
        html, level = _process_annotations(line)
        assert level == "h2"

    def test_indent_removal(self):
        line = "［＃２字下げ］本文テキスト"
        html, level = _process_annotations(line)
        assert "［＃" not in html
        assert "本文テキスト" in html

    def test_annotation_removal(self):
        line = "テキスト※［＃「てへん＋劣」、第3水準1-84-77］"
        html, level = _process_annotations(line)
        assert "※" not in html
        assert "テキスト" in html


class TestParseAozora:
    SAMPLE = """夏目漱石
こころ

-------------------------------------------------------

［＃２字下げ］上　先生と私［＃「上　先生と私」は大見出し］

［＃５字下げ］一［＃「一」は中見出し］

私《わたくし》はその人を常に先生と呼んでいた。
だからここでもただ先生と書くだけで本名は打ち明けない。
"""

    def test_title_author(self):
        title, author, blocks = parse_aozora(self.SAMPLE)
        assert title == "夏目漱石"

    def test_heading_detected(self):
        _, _, blocks = parse_aozora(self.SAMPLE)
        h1_blocks = [b for b in blocks if b.kind == "h1"]
        assert len(h1_blocks) >= 1
        assert "先生と私" in h1_blocks[0].content

    def test_ruby_in_paragraph(self):
        _, _, blocks = parse_aozora(self.SAMPLE)
        p_blocks = [b for b in blocks if b.kind == "p"]
        texts = " ".join(b.content for b in p_blocks)
        assert "<ruby>" in texts

    def test_no_annotation_in_output(self):
        _, _, blocks = parse_aozora(self.SAMPLE)
        for block in blocks:
            assert "［＃" not in block.content
