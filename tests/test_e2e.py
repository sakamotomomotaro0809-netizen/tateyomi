"""
BC. E2Eテスト
実際の変換パイプライン全体（パース→変換→レンダリング→検証）を通すテスト。
"""
from __future__ import annotations
import io
import zipfile
import tempfile
from pathlib import Path
import pytest
from typer.testing import CliRunner

from tateyomi.cli import app

runner = CliRunner()


# ── ヘルパー ──────────────────────────────────────────────────────────

def _txt(text: str, suffix: str = ".txt") -> Path:
    """一時テキストファイルを作成して Path を返す"""
    f = tempfile.NamedTemporaryFile(
        suffix=suffix, mode="w", encoding="utf-8", delete=False
    )
    f.write(text)
    f.close()
    return Path(f.name)


def _md(text: str) -> Path:
    return _txt(text, ".md")


SAMPLE_TXT = """\
テスト書籍タイトル
テスト著者

第1章　はじめに

これはテストのための本文テキストです。
日本語の縦書き変換を検証します。

第2章　本論

縦書きとは、文字を上から下へ、行を右から左へ配置する組版方式です。

第3章　おわりに

以上でテストを終わります。
"""

SAMPLE_MD = """\
# Markdownテスト

## はじめに

これはMarkdownのテストです。

**太字**と*斜体*のテスト。

- 項目1
- 項目2

# 第2章

本文2。
"""


# ── E2E: TXT → EPUB ──────────────────────────────────────────────────
class TestTxtToEpub:
    def test_basic_conversion(self, tmp_path):
        src = _txt(SAMPLE_TXT)
        out = tmp_path / "out.epub"
        result = runner.invoke(app, ["convert", str(src), str(out)])
        src.unlink(missing_ok=True)
        assert result.exit_code == 0, result.output
        assert out.exists()

    def test_epub_is_valid_zip(self, tmp_path):
        src = _txt(SAMPLE_TXT)
        out = tmp_path / "out.epub"
        runner.invoke(app, ["convert", str(src), str(out)])
        src.unlink(missing_ok=True)
        assert zipfile.is_zipfile(str(out))

    def test_epub_has_required_files(self, tmp_path):
        src = _txt(SAMPLE_TXT)
        out = tmp_path / "out.epub"
        runner.invoke(app, ["convert", str(src), str(out)])
        src.unlink(missing_ok=True)
        with zipfile.ZipFile(str(out)) as zf:
            names = zf.namelist()
        assert "mimetype" in names
        assert "META-INF/container.xml" in names
        assert any(n.endswith(".opf") for n in names)
        assert any(n == "OEBPS/nav.xhtml" for n in names)

    def test_epub_rtl_direction(self, tmp_path):
        src = _txt(SAMPLE_TXT)
        out = tmp_path / "out.epub"
        runner.invoke(app, ["convert", str(src), str(out)])
        src.unlink(missing_ok=True)
        with zipfile.ZipFile(str(out)) as zf:
            opf = zf.read("OEBPS/content.opf").decode("utf-8")
        assert 'page-progression-direction="rtl"' in opf

    def test_epub_vertical_writing(self, tmp_path):
        src = _txt(SAMPLE_TXT)
        out = tmp_path / "out.epub"
        runner.invoke(app, ["convert", str(src), str(out)])
        src.unlink(missing_ok=True)
        with zipfile.ZipFile(str(out)) as zf:
            css = zf.read("OEBPS/Styles/tateyomi.css").decode("utf-8")
        assert "vertical-rl" in css

    def test_title_override(self, tmp_path):
        src = _txt(SAMPLE_TXT)
        out = tmp_path / "out.epub"
        runner.invoke(app, ["convert", str(src), str(out), "--title", "カスタムタイトル"])
        src.unlink(missing_ok=True)
        with zipfile.ZipFile(str(out)) as zf:
            opf = zf.read("OEBPS/content.opf").decode("utf-8")
        assert "カスタムタイトル" in opf

    def test_author_override(self, tmp_path):
        src = _txt(SAMPLE_TXT)
        out = tmp_path / "out.epub"
        runner.invoke(app, ["convert", str(src), str(out), "--author", "テスト著者名"])
        src.unlink(missing_ok=True)
        with zipfile.ZipFile(str(out)) as zf:
            opf = zf.read("OEBPS/content.opf").decode("utf-8")
        assert "テスト著者名" in opf

    def test_chapters_present(self, tmp_path):
        src = _txt(SAMPLE_TXT)
        out = tmp_path / "out.epub"
        runner.invoke(app, ["convert", str(src), str(out)])
        src.unlink(missing_ok=True)
        with zipfile.ZipFile(str(out)) as zf:
            chapters = [n for n in zf.namelist() if n.startswith("OEBPS/Text/")]
        assert len(chapters) >= 3


# ── E2E: TXT → HTML ──────────────────────────────────────────────────
class TestTxtToHtml:
    def test_html_output(self, tmp_path):
        src = _txt(SAMPLE_TXT)
        out = tmp_path / "out.html"
        result = runner.invoke(app, ["convert", str(src), str(out)])
        src.unlink(missing_ok=True)
        assert result.exit_code == 0
        assert out.exists()

    def test_html_contains_content(self, tmp_path):
        src = _txt(SAMPLE_TXT)
        out = tmp_path / "out.html"
        runner.invoke(app, ["convert", str(src), str(out)])
        src.unlink(missing_ok=True)
        html = out.read_text(encoding="utf-8")
        assert "縦書き" in html or "テスト" in html

    def test_html_has_writing_mode(self, tmp_path):
        src = _txt(SAMPLE_TXT)
        out = tmp_path / "out.html"
        runner.invoke(app, ["convert", str(src), str(out)])
        src.unlink(missing_ok=True)
        html = out.read_text(encoding="utf-8")
        assert "vertical-rl" in html


# ── E2E: MD → EPUB ───────────────────────────────────────────────────
class TestMdToEpub:
    def test_md_to_epub(self, tmp_path):
        src = _md(SAMPLE_MD)
        out = tmp_path / "out.epub"
        result = runner.invoke(app, ["convert", str(src), str(out)])
        src.unlink(missing_ok=True)
        assert result.exit_code == 0
        assert out.exists()

    def test_md_content_in_epub(self, tmp_path):
        src = _md(SAMPLE_MD)
        out = tmp_path / "out.epub"
        runner.invoke(app, ["convert", str(src), str(out)])
        src.unlink(missing_ok=True)
        with zipfile.ZipFile(str(out)) as zf:
            texts = " ".join(
                zf.read(n).decode("utf-8", errors="replace")
                for n in zf.namelist() if n.endswith(".xhtml")
            )
        assert "Markdown" in texts or "テスト" in texts


# ── E2E: convert パイプライン全体 ─────────────────────────────────────
class TestConvertPipeline:
    def test_no_tcy_option(self, tmp_path):
        src = _txt("タイトル\n著者\n\nテスト123本文。\n")
        out = tmp_path / "out.epub"
        result = runner.invoke(app, ["convert", str(src), str(out), "--no-tcy"])
        src.unlink(missing_ok=True)
        assert result.exit_code == 0
        with zipfile.ZipFile(str(out)) as zf:
            texts = " ".join(
                zf.read(n).decode("utf-8", errors="replace")
                for n in zf.namelist() if n.endswith(".xhtml")
            )
        # --no-tcy なので <span class="tcy"> が付かない
        assert '<span class="tcy">' not in texts

    def test_gen_cover_adds_image(self, tmp_path):
        src = _txt("表紙テスト\n著者\n\n本文。\n")
        out = tmp_path / "out.epub"
        result = runner.invoke(app, ["convert", str(src), str(out), "--gen-cover"])
        src.unlink(missing_ok=True)
        assert result.exit_code == 0
        with zipfile.ZipFile(str(out)) as zf:
            images = [n for n in zf.namelist()
                      if any(n.endswith(e) for e in (".jpg", ".jpeg", ".png"))]
        assert len(images) >= 1

    def test_dry_run_no_output(self, tmp_path):
        src = _txt(SAMPLE_TXT)
        out = tmp_path / "out.epub"
        result = runner.invoke(app, ["convert", str(src), str(out), "--dry-run"])
        src.unlink(missing_ok=True)
        assert result.exit_code == 0
        assert not out.exists()

    def test_info_command(self, tmp_path):
        src = _txt(SAMPLE_TXT)
        out = tmp_path / "ref.epub"
        runner.invoke(app, ["convert", str(src), str(out)])
        src.unlink(missing_ok=True)
        result = runner.invoke(app, ["info", str(out)])
        assert result.exit_code == 0
        assert "章数" in result.output

    def test_check_command(self, tmp_path):
        src = _txt(SAMPLE_TXT)
        out = tmp_path / "ref.epub"
        runner.invoke(app, ["convert", str(src), str(out)])
        src.unlink(missing_ok=True)
        result = runner.invoke(app, ["check", str(out)])
        assert result.exit_code == 0


# ── E2E: ログファイル出力 (AZ) ────────────────────────────────────────
class TestLogFile:
    def test_log_file_created(self, tmp_path):
        src = _txt(SAMPLE_TXT)
        out = tmp_path / "out.epub"
        log = tmp_path / "convert.log"
        result = runner.invoke(app, ["convert", str(src), str(out), "--log-file", str(log)])
        src.unlink(missing_ok=True)
        assert result.exit_code == 0
        assert log.exists()

    def test_log_contains_conversion_info(self, tmp_path):
        src = _txt(SAMPLE_TXT)
        out = tmp_path / "out.epub"
        log = tmp_path / "convert.log"
        runner.invoke(app, ["convert", str(src), str(out), "--log-file", str(log)])
        src.unlink(missing_ok=True)
        content = log.read_text(encoding="utf-8")
        assert "変換" in content or "convert" in content.lower()


# ── E2E: plugins コマンド (BA) ────────────────────────────────────────
class TestPluginsCommand:
    def test_plugins_command_runs(self):
        result = runner.invoke(app, ["plugins"])
        assert result.exit_code == 0

    def test_plugins_shows_sections(self):
        result = runner.invoke(app, ["plugins"])
        assert "パーサープラグイン" in result.output
        assert "レンダラープラグイン" in result.output
        assert "変換フック" in result.output

    def test_register_and_list_parser(self):
        from tateyomi.plugins import register_parser, get_parser_plugins, clear_registry
        clear_registry()

        class FakeParser:
            pass

        register_parser(".fake", FakeParser)
        plugins_map = get_parser_plugins()
        assert ".fake" in plugins_map
        assert plugins_map[".fake"] is FakeParser
        clear_registry()
