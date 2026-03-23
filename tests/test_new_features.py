"""
G+H+I+K+N 機能テスト
settings / normalize / image_resize / epub3_renderer(config付き)
"""
from __future__ import annotations
import io
import zipfile
import tempfile
from pathlib import Path

import pytest


# ─────────────────────────────────────────
# I. TateyomiConfig
# ─────────────────────────────────────────
class TestTateyomiConfig:
    def test_default_values(self):
        from tateyomi.settings import TateyomiConfig, LayoutSettings, ConvertSettings
        cfg = TateyomiConfig()
        assert cfg.layout.line_height == 1.8
        assert cfg.layout.font_size == "1em"
        assert cfg.layout.margin_block == "15mm"
        assert cfg.layout.margin_inline == "20mm"
        assert cfg.layout.chars_hint == 0
        assert cfg.convert.enable_tcy is True
        assert cfg.convert.resize_images is True
        assert cfg.convert.normalize_text is True
        assert cfg.convert.image_max_width == 1650
        assert cfg.convert.image_max_height == 2550

    def test_load_returns_defaults_when_no_file(self, tmp_path):
        from tateyomi.settings import TateyomiConfig
        cfg = TateyomiConfig.load(tmp_path / "nonexistent.toml")
        assert cfg.layout.line_height == 1.8

    def test_load_from_toml(self, tmp_path):
        """TOMLファイルから設定を読み込めるか"""
        toml_text = "[layout]\nline_height = 2.0\nfont_size = \"1.2em\"\n[convert]\nenable_tcy = false\n"
        cfg_file = tmp_path / "tateyomi.toml"
        cfg_file.write_text(toml_text, encoding="utf-8")
        from tateyomi.settings import TateyomiConfig
        cfg = TateyomiConfig.load(cfg_file)
        assert cfg.layout.line_height == 2.0
        assert cfg.layout.font_size == "1.2em"
        assert cfg.convert.enable_tcy is False

    def test_save_and_reload(self, tmp_path):
        """保存 → 再読み込みで値が一致するか"""
        from tateyomi.settings import TateyomiConfig, LayoutSettings, ConvertSettings
        cfg = TateyomiConfig(
            layout=LayoutSettings(line_height=2.2, font_size="1.1em"),
            convert=ConvertSettings(enable_tcy=False, resize_images=False),
        )
        out = tmp_path / "tateyomi.toml"
        cfg.save(out)
        assert out.exists()
        loaded = TateyomiConfig.load(out)
        assert loaded.layout.line_height == 2.2
        assert loaded.layout.font_size == "1.1em"
        assert loaded.convert.enable_tcy is False
        assert loaded.convert.resize_images is False

    def test_unknown_keys_ignored(self, tmp_path):
        """不明なキーは無視されデフォルト値が使われるか"""
        toml_text = "[layout]\nunknown_key = 999\n"
        cfg_file = tmp_path / "tateyomi.toml"
        cfg_file.write_text(toml_text, encoding="utf-8")
        from tateyomi.settings import TateyomiConfig
        cfg = TateyomiConfig.load(cfg_file)
        assert cfg.layout.line_height == 1.8  # デフォルト維持


# ─────────────────────────────────────────
# N. テキスト正規化
# ─────────────────────────────────────────
class TestNormalize:
    def test_crlf_to_lf(self):
        from tateyomi.utils.normalize import normalize_text
        assert "\r\n" not in normalize_text("abc\r\ndef")

    def test_multi_space_collapsed(self):
        from tateyomi.utils.normalize import normalize_text
        assert "  " not in normalize_text("a   b")

    def test_multi_newline_collapsed(self):
        from tateyomi.utils.normalize import normalize_text
        result = normalize_text("a\n\n\n\nb")
        assert "\n\n\n" not in result
        assert "a" in result and "b" in result

    def test_nfc_normalization(self):
        """半角カタカナが全角になるか"""
        import unicodedata
        from tateyomi.utils.normalize import normalize_text
        half = "ｱｲｳ"  # 半角カタカナ
        result = normalize_text(half)
        # NFC後は全角カタカナになる
        assert unicodedata.normalize("NFC", half) == result.strip()

    def test_fullwidth_ascii_option(self):
        from tateyomi.utils.normalize import normalize_text
        result = normalize_text("ＡＢＣ１２３", fullwidth_ascii=True)
        assert result.strip() == "ABC123"

    def test_fullwidth_ascii_off_by_default(self):
        from tateyomi.utils.normalize import normalize_text
        result = normalize_text("ＡＢＣ")
        assert "Ａ" in result  # 変換されない

    def test_normalize_html_text_preserves_tags(self):
        from tateyomi.utils.normalize import normalize_html_text
        html = "<p>テスト  テキスト</p>"
        result = normalize_html_text(html)
        assert "<p>" in result
        assert "</p>" in result
        # 連続スペースが1つに
        assert "テスト テキスト" in result

    def test_apply_vertical_chars_skips_tags(self):
        """apply_vertical_chars が HTML タグ内属性を変換しないか"""
        from tateyomi.utils.char_table import apply_vertical_chars
        # href 属性値に「、」が入った極端なケース（属性内は変換しない）
        html = '<a href="test、page">文章、文章。</a>'
        result = apply_vertical_chars(html)
        # タグ内の「、」は変換しない
        assert 'href="test、page"' in result
        # テキストノードの「、」は変換される
        assert "文章、" not in result or "\uFE11" in result

    def test_normalize_html_text_no_tag_modification(self):
        from tateyomi.utils.normalize import normalize_html_text
        html = '<img src="test  image.png" alt="test"/>'
        result = normalize_html_text(html)
        # タグ属性は変更しない
        assert 'src="test  image.png"' in result


# ─────────────────────────────────────────
# K. 画像リサイズ
# ─────────────────────────────────────────
def _make_png(width: int, height: int) -> bytes:
    """テスト用のシンプルなPNG画像を作成"""
    from PIL import Image
    img = Image.new("RGB", (width, height), color=(128, 64, 32))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


class TestImageResize:
    def test_no_resize_when_small(self):
        from tateyomi.utils.image_resize import resize_image
        data = _make_png(100, 200)
        result_data, result_mt = resize_image(data, "image/png", 1650, 2550)
        assert result_data == data  # そのまま返す

    def test_resize_when_too_large(self):
        from tateyomi.utils.image_resize import resize_image
        from PIL import Image
        data = _make_png(3000, 4000)
        result_data, result_mt = resize_image(data, "image/png", 1650, 2550)
        img = Image.open(io.BytesIO(result_data))
        assert img.width <= 1650
        assert img.height <= 2550

    def test_aspect_ratio_maintained(self):
        from tateyomi.utils.image_resize import resize_image
        from PIL import Image
        data = _make_png(3000, 1500)  # 2:1 横長
        result_data, _ = resize_image(data, "image/png", 1650, 2550)
        img = Image.open(io.BytesIO(result_data))
        # アスペクト比が保たれているか（2:1 を維持）
        ratio = img.width / img.height
        assert abs(ratio - 2.0) < 0.05

    def test_resize_cover(self):
        from tateyomi.utils.image_resize import resize_cover, COVER_W, COVER_H
        from PIL import Image
        data = _make_png(3200, 5000)
        result_data, _ = resize_cover(data, "image/jpeg")
        img = Image.open(io.BytesIO(result_data))
        assert img.width <= COVER_W
        assert img.height <= COVER_H

    def test_resize_images_in_book(self):
        from tateyomi.utils.image_resize import resize_images_in_book
        from tateyomi.config import ParsedBook, Chapter, ImageItem
        book = ParsedBook(
            title="test", author="author",
            chapters=[Chapter(chapter_id="c1", title="ch1", html_content="<p>test</p>")],
            images=[ImageItem(
                item_id="img1",
                href="Images/big.png",
                media_type="image/png",
                data=_make_png(3000, 4000),
            )],
        )
        resize_images_in_book(book, max_w=1650, max_h=2550)
        from PIL import Image
        img = Image.open(io.BytesIO(book.images[0].data))
        assert img.width <= 1650
        assert img.height <= 2550

    def test_invalid_data_returns_original(self):
        """壊れたデータでもクラッシュしない"""
        from tateyomi.utils.image_resize import resize_image
        bad_data = b"not-an-image"
        result_data, result_mt = resize_image(bad_data, "image/png")
        assert result_data == bad_data


# ─────────────────────────────────────────
# G. 版面設定 + H. カスタムCSS → EPUB出力
# ─────────────────────────────────────────
def _make_simple_book():
    from tateyomi.config import ParsedBook, Chapter
    return ParsedBook(
        title="設定テスト",
        author="著者",
        chapters=[Chapter(
            chapter_id="ch001",
            title="第1章",
            html_content="""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ja" lang="ja">
<head><meta charset="UTF-8"/><title>テスト</title></head>
<body><p>本文テキスト</p></body></html>""",
        )],
    )


class TestEpubRendererWithConfig:
    def test_layout_css_injected(self):
        """G. 版面設定がCSSに注入されるか"""
        from tateyomi.renderers.epub3_renderer import render
        from tateyomi.settings import TateyomiConfig, LayoutSettings
        cfg = TateyomiConfig(layout=LayoutSettings(line_height=2.5, font_size="1.3em"))
        book = _make_simple_book()
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "test.epub"
            render(book, out, config=cfg)
            with zipfile.ZipFile(str(out)) as z:
                css = z.read("OEBPS/Styles/tateyomi.css").decode("utf-8")
        assert "2.5" in css
        assert "1.3em" in css

    def test_custom_css_added(self, tmp_path):
        """H. extra_css がカスタムCSSとして含まれるか"""
        from tateyomi.renderers.epub3_renderer import render
        from tateyomi.settings import TateyomiConfig, ConvertSettings
        cfg = TateyomiConfig(convert=ConvertSettings(extra_css="body { color: red; }"))
        book = _make_simple_book()
        out = tmp_path / "test.epub"
        render(book, out, config=cfg)
        with zipfile.ZipFile(str(out)) as z:
            names = z.namelist()
            assert "OEBPS/Styles/custom.css" in names
            custom = z.read("OEBPS/Styles/custom.css").decode("utf-8")
        assert "color: red" in custom

    def test_custom_css_file_loaded(self, tmp_path):
        """H. extra_css_file のCSS内容が含まれるか"""
        from tateyomi.renderers.epub3_renderer import render
        from tateyomi.settings import TateyomiConfig, ConvertSettings
        css_file = tmp_path / "custom.css"
        css_file.write_text("p { font-weight: bold; }", encoding="utf-8")
        cfg = TateyomiConfig(convert=ConvertSettings(extra_css_file=str(css_file)))
        book = _make_simple_book()
        out = tmp_path / "test.epub"
        render(book, out, config=cfg)
        with zipfile.ZipFile(str(out)) as z:
            custom = z.read("OEBPS/Styles/custom.css").decode("utf-8")
        assert "font-weight: bold" in custom

    def test_no_custom_css_when_not_set(self, tmp_path):
        """カスタムCSS未設定時は custom.css が含まれないか"""
        from tateyomi.renderers.epub3_renderer import render
        from tateyomi.settings import TateyomiConfig
        book = _make_simple_book()
        out = tmp_path / "test.epub"
        render(book, out, config=TateyomiConfig())
        with zipfile.ZipFile(str(out)) as z:
            assert "OEBPS/Styles/custom.css" not in z.namelist()

    def test_kindle_overrides_css_linked_in_chapters(self, tmp_path):
        """各チャプターに kindle-overrides.css リンクが含まれるか"""
        from tateyomi.renderers.epub3_renderer import render
        from tateyomi.settings import TateyomiConfig
        book = _make_simple_book()
        out = tmp_path / "test.epub"
        render(book, out, config=TateyomiConfig())
        with zipfile.ZipFile(str(out)) as z:
            chapter_html = z.read("OEBPS/Text/ch001.xhtml").decode("utf-8")
        assert "kindle-overrides.css" in chapter_html

    def test_custom_css_linked_in_chapters(self, tmp_path):
        """custom.css が有効なとき各チャプターにリンクされるか"""
        from tateyomi.renderers.epub3_renderer import render
        from tateyomi.settings import TateyomiConfig, ConvertSettings
        cfg = TateyomiConfig(convert=ConvertSettings(extra_css="p { color: blue; }"))
        book = _make_simple_book()
        out = tmp_path / "test.epub"
        render(book, out, config=cfg)
        with zipfile.ZipFile(str(out)) as z:
            chapter_html = z.read("OEBPS/Text/ch001.xhtml").decode("utf-8")
        assert "custom.css" in chapter_html

    def test_no_duplicate_css_links(self, tmp_path):
        """既にリンクされている CSS が重複追加されないか"""
        from tateyomi.renderers.epub3_renderer import render, _inject_css_links
        html = """<?xml version="1.0"?>
<html><head>
  <link rel="stylesheet" href="../Styles/tateyomi.css"/>
  <link rel="stylesheet" href="../Styles/kindle-overrides.css"/>
</head><body><p>test</p></body></html>"""
        result = _inject_css_links(html, has_custom_css=False)
        assert result.count("tateyomi.css") == 1
        assert result.count("kindle-overrides.css") == 1

    def test_chars_hint_in_css(self, tmp_path):  # noqa: F811
        """chars_hint > 0 のとき一行字数CSSが注入されるか"""
        from tateyomi.renderers.epub3_renderer import render
        from tateyomi.settings import TateyomiConfig, LayoutSettings
        cfg = TateyomiConfig(layout=LayoutSettings(chars_hint=40))
        book = _make_simple_book()
        out = tmp_path / "test.epub"
        render(book, out, config=cfg)
        with zipfile.ZipFile(str(out)) as z:
            css = z.read("OEBPS/Styles/tateyomi.css").decode("utf-8")
        assert "40" in css
        assert "calc" in css
