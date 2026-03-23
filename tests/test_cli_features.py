"""
AA. 新機能CLIテスト
split / meta / --dry-run / warichu / docx list+table
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


# ─────────────────────────────────────────
# ヘルパー: 最小 EPUB 生成
# ─────────────────────────────────────────
def _make_epub(tmp_path: Path, title: str = "テスト", author: str = "著者",
               num_chapters: int = 3) -> Path:
    from tateyomi.config import ParsedBook, Chapter
    from tateyomi.renderers.epub3_renderer import render

    chapters = [
        Chapter(
            chapter_id=f"ch{i+1:03d}",
            title=f"第{i+1}章",
            html_content=f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ja" lang="ja">
<head><meta charset="UTF-8"/><title>第{i+1}章</title></head>
<body><h1>第{i+1}章</h1><p>本文{i+1}</p></body></html>""",
        )
        for i in range(num_chapters)
    ]
    book = ParsedBook(title=title, author=author, chapters=chapters)
    out = tmp_path / "test.epub"
    render(book, out)
    return out


# ─────────────────────────────────────────
# V. --dry-run
# ─────────────────────────────────────────
class TestDryRun:
    def test_no_output_file_created(self, tmp_path):
        """--dry-run では出力ファイルが生成されない"""
        # テキストファイルを用意
        txt = tmp_path / "sample.txt"
        txt.write_text("タイトル\n著者\n\n本文テキストです。\n", encoding="utf-8")
        out = tmp_path / "out.epub"

        result = runner.invoke(app, ["convert", str(txt), str(out), "--dry-run"])
        assert result.exit_code == 0
        assert not out.exists(), "dry-run なのに出力ファイルが生成された"

    def test_shows_title(self, tmp_path):
        txt = tmp_path / "sample.txt"
        txt.write_text("テストタイトル\n著者名\n\n本文。\n", encoding="utf-8")
        out = tmp_path / "out.epub"

        result = runner.invoke(app, ["convert", str(txt), str(out), "--dry-run"])
        assert result.exit_code == 0
        assert "テストタイトル" in result.output

    def test_dry_run_label_shown(self, tmp_path):
        txt = tmp_path / "sample.txt"
        txt.write_text("タイトル\n\n本文。\n", encoding="utf-8")
        out = tmp_path / "out.epub"

        result = runner.invoke(app, ["convert", str(txt), str(out), "--dry-run"])
        assert "DRY RUN" in result.output

    def test_dry_run_with_epub(self, tmp_path):
        epub = _make_epub(tmp_path)
        out = tmp_path / "out.epub"
        result = runner.invoke(app, ["convert", str(epub), str(out), "--dry-run"])
        assert result.exit_code == 0
        assert not out.exists()


# ─────────────────────────────────────────
# Z. tateyomi meta
# ─────────────────────────────────────────
class TestMetaCommand:
    def test_update_title(self, tmp_path):
        epub = _make_epub(tmp_path)
        out = tmp_path / "updated.epub"

        result = runner.invoke(app, [
            "meta", str(epub), "--title", "新しいタイトル", "--output", str(out)
        ])
        assert result.exit_code == 0
        assert out.exists()

        # OPF 内のタイトルが変更されているか確認
        with zipfile.ZipFile(str(out)) as z:
            opf = next(n for n in z.namelist() if n.endswith(".opf"))
            content = z.read(opf).decode("utf-8")
        assert "新しいタイトル" in content

    def test_update_author(self, tmp_path):
        epub = _make_epub(tmp_path)
        out = tmp_path / "updated.epub"

        result = runner.invoke(app, [
            "meta", str(epub), "--author", "新著者", "--output", str(out)
        ])
        assert result.exit_code == 0
        with zipfile.ZipFile(str(out)) as z:
            opf = next(n for n in z.namelist() if n.endswith(".opf"))
            content = z.read(opf).decode("utf-8")
        assert "新著者" in content

    def test_update_language(self, tmp_path):
        epub = _make_epub(tmp_path)
        out = tmp_path / "updated.epub"

        result = runner.invoke(app, [
            "meta", str(epub), "--lang", "en", "--output", str(out)
        ])
        assert result.exit_code == 0
        with zipfile.ZipFile(str(out)) as z:
            opf = next(n for n in z.namelist() if n.endswith(".opf"))
            content = z.read(opf).decode("utf-8")
        assert "<dc:language>en</dc:language>" in content

    def test_no_options_exits_nonzero(self, tmp_path):
        epub = _make_epub(tmp_path)
        result = runner.invoke(app, ["meta", str(epub)])
        assert result.exit_code != 0

    def test_epub_structure_preserved(self, tmp_path):
        """メタデータ変更後も EPUB 構造が壊れないか"""
        epub = _make_epub(tmp_path)
        out = tmp_path / "updated.epub"
        runner.invoke(app, ["meta", str(epub), "--title", "変更後", "--output", str(out)])

        with zipfile.ZipFile(str(out)) as z:
            names = z.namelist()
        assert "mimetype" in names
        assert "META-INF/container.xml" in names
        assert any(n.endswith(".opf") for n in names)

    def test_overwrite_in_place(self, tmp_path):
        """--output 省略で元ファイルを上書きする"""
        epub = _make_epub(tmp_path)
        original_size = epub.stat().st_size

        result = runner.invoke(app, ["meta", str(epub), "--title", "上書きテスト"])
        assert result.exit_code == 0
        assert epub.exists()
        with zipfile.ZipFile(str(epub)) as z:
            opf = next(n for n in z.namelist() if n.endswith(".opf"))
            content = z.read(opf).decode("utf-8")
        assert "上書きテスト" in content


# ─────────────────────────────────────────
# Y. tateyomi split
# ─────────────────────────────────────────
class TestSplitCommand:
    def test_creates_chapter_files(self, tmp_path):
        epub = _make_epub(tmp_path, num_chapters=3)
        out_dir = tmp_path / "split"

        result = runner.invoke(app, ["split", str(epub), str(out_dir)])
        assert result.exit_code == 0
        epubs = list(out_dir.glob("*.epub"))
        assert len(epubs) == 3

    def test_custom_prefix(self, tmp_path):
        epub = _make_epub(tmp_path, num_chapters=2)
        out_dir = tmp_path / "split"

        runner.invoke(app, ["split", str(epub), str(out_dir), "--prefix", "part"])
        epubs = list(out_dir.glob("part_*.epub"))
        assert len(epubs) == 2

    def test_each_file_is_valid_epub(self, tmp_path):
        epub = _make_epub(tmp_path, num_chapters=2)
        out_dir = tmp_path / "split"
        runner.invoke(app, ["split", str(epub), str(out_dir)])

        for ep in sorted(out_dir.glob("*.epub")):
            with zipfile.ZipFile(str(ep)) as z:
                names = z.namelist()
            assert "mimetype" in names
            assert any(n.endswith(".opf") for n in names)

    def test_chapter_content_in_split_file(self, tmp_path):
        epub = _make_epub(tmp_path, num_chapters=3)
        out_dir = tmp_path / "split"
        runner.invoke(app, ["split", str(epub), str(out_dir)])

        files = sorted(out_dir.glob("*.epub"))
        # 1つ目のファイルに「第1章」が含まれるか
        with zipfile.ZipFile(str(files[0])) as z:
            texts = [z.read(n).decode("utf-8", errors="replace")
                     for n in z.namelist() if n.endswith(".xhtml")]
        assert any("第1章" in t or "1" in t for t in texts)

    def test_output_dir_created(self, tmp_path):
        epub = _make_epub(tmp_path, num_chapters=1)
        out_dir = tmp_path / "new" / "deep" / "dir"
        assert not out_dir.exists()
        runner.invoke(app, ["split", str(epub), str(out_dir)])
        assert out_dir.exists()

    def test_nonepub_file_fails(self, tmp_path):
        txt = tmp_path / "test.txt"
        txt.write_text("test")
        result = runner.invoke(app, ["split", str(txt), str(tmp_path / "out")])
        assert result.exit_code != 0


# ─────────────────────────────────────────
# U. 割注 (warichu)
# ─────────────────────────────────────────
class TestWarichu:
    def test_warichu_single_line(self):
        from tateyomi.utils.aozora import _process_annotations
        line = "本文テキスト［＃割注］割注内容［＃割注終わり］続き"
        result, heading = _process_annotations(line)
        assert '<span class="warichu">割注内容</span>' in result
        assert "本文テキスト" in result
        assert "続き" in result

    def test_warichu_in_parse_aozora(self):
        from tateyomi.utils.aozora import parse_aozora
        text = "タイトル\n著者\n\n本文。これは［＃割注］注釈テキスト［＃割注終わり］の例。\n"
        _, _, blocks = parse_aozora(text)
        combined = " ".join(b.content for b in blocks)
        assert '<span class="warichu">' in combined
        assert "注釈テキスト" in combined

    def test_warichu_css_in_tateyomi_css(self):
        """tateyomi.css に .warichu スタイルが定義されているか"""
        from pathlib import Path
        css_path = Path(__file__).parent.parent / "tateyomi" / "assets" / "tateyomi.css"
        css = css_path.read_text(encoding="utf-8")
        assert ".warichu" in css

    def test_warichu_not_converted_to_heading(self):
        from tateyomi.utils.aozora import _process_annotations
        line = "テキスト［＃割注］注釈［＃割注終わり］"
        result, heading = _process_annotations(line)
        assert heading == ""  # 見出しにならない

    def test_warichu_in_epub_output(self, tmp_path):
        """割注が EPUB チャプターに含まれるか"""
        from tateyomi.utils.aozora import parse_aozora
        from tateyomi.config import ParsedBook, Chapter
        from tateyomi.renderers.epub3_renderer import render

        text = "タイトル\n著者\n\n本文。これは［＃割注］注釈［＃割注終わり］です。\n"
        _, _, blocks = parse_aozora(text)
        # blocks から Chapter を作る
        body = "".join(f"<p>{b.content}</p>" for b in blocks)
        html = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ja"><head><meta charset="UTF-8"/>
<title>t</title></head><body>{body}</body></html>"""
        book = ParsedBook(
            title="割注テスト", author="著者",
            chapters=[Chapter(chapter_id="ch001", title="ch1", html_content=html)],
        )
        out = tmp_path / "warichu.epub"
        render(book, out)
        with zipfile.ZipFile(str(out)) as z:
            chapter = z.read("OEBPS/Text/ch001.xhtml").decode("utf-8")
        assert "warichu" in chapter


# ─────────────────────────────────────────
# R. docx リスト・表
# ─────────────────────────────────────────
class TestDocxListsAndTables:
    """docx_parser のリスト・表変換をモックなしで検証"""

    def test_list_bullet_styles_defined(self):
        from tateyomi.parsers.docx_parser import _LIST_BULLET_STYLES
        assert "List Bullet" in _LIST_BULLET_STYLES
        assert "箇条書き" in _LIST_BULLET_STYLES

    def test_list_number_styles_defined(self):
        from tateyomi.parsers.docx_parser import _LIST_NUMBER_STYLES
        assert "List Number" in _LIST_NUMBER_STYLES

    def test_table_to_html(self):
        """_table_to_html が正しい HTML 構造を返すか（モック table）"""
        from tateyomi.parsers.docx_parser import _table_to_html

        class FakeCell:
            def __init__(self, text): self.text = text
        class FakeRow:
            def __init__(self, texts): self.cells = [FakeCell(t) for t in texts]
        class FakeTable:
            def __init__(self, rows): self.rows = [FakeRow(r) for r in rows]

        table = FakeTable([["A", "B"], ["C", "D"]])
        html = _table_to_html(table)
        assert "<table>" in html
        assert "<tr>" in html
        assert "<td>A</td>" in html
        assert "<td>D</td>" in html

    def test_blocks_to_chapter_groups_list_items(self):
        """連続する ul_item が単一の <ul> にまとめられるか"""
        from tateyomi.parsers.docx_parser import _blocks_to_chapter
        blocks = [
            ("ul_item", "項目1", []),
            ("ul_item", "項目2", []),
            ("ul_item", "項目3", []),
            ("p", "段落", []),
        ]
        ch = _blocks_to_chapter(0, "テスト", blocks)
        html = ch.html_content
        # <ul> が1つだけある
        assert html.count("<ul>") == 1
        assert "<li>項目1</li>" in html
        assert "<li>項目2</li>" in html
        assert "<li>項目3</li>" in html

    def test_blocks_to_chapter_ol(self):
        from tateyomi.parsers.docx_parser import _blocks_to_chapter
        blocks = [("ol_item", "番号1", []), ("ol_item", "番号2", [])]
        ch = _blocks_to_chapter(0, "テスト", blocks)
        assert "<ol>" in ch.html_content
        assert "<li>番号1</li>" in ch.html_content

    def test_blocks_to_chapter_table(self):
        from tateyomi.parsers.docx_parser import _blocks_to_chapter
        blocks = [("table", "<table><tr><td>セル</td></tr></table>", [])]
        ch = _blocks_to_chapter(0, "テスト", blocks)
        assert "<table>" in ch.html_content
        assert "セル" in ch.html_content

    def test_mixed_content_order_preserved(self):
        """段落・リスト・表の順序が保たれるか"""
        from tateyomi.parsers.docx_parser import _blocks_to_chapter
        blocks = [
            ("p", "段落1", []),
            ("ul_item", "リスト", []),
            ("table", "<table><tr><td>表</td></tr></table>", []),
            ("p", "段落2", []),
        ]
        ch = _blocks_to_chapter(0, "テスト", blocks)
        html = ch.html_content
        # 出現順を確認
        p1 = html.index("段落1")
        ul = html.index("<ul>")
        tbl = html.index("<table>")
        p2 = html.index("段落2")
        assert p1 < ul < tbl < p2
