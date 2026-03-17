"""
tateyomi CLI
電子書籍を縦書き（右から左）に変換するコマンドラインツール
"""
from __future__ import annotations
from pathlib import Path
from typing import Optional
import typer
from rich.console import Console
import os
import sys
from rich.progress import Progress, SpinnerColumn, TextColumn

app = typer.Typer(
    name="tateyomi",
    help="電子書籍を縦書き（右から左）に変換するツール",
    no_args_is_help=True,
)
# Windows CP932環境向け: UnicodeEncodeErrorを防ぐ
_safe_encoding = sys.stdout.encoding or "utf-8"
console = Console(highlight=False, safe_box=True)


@app.command()
def convert(
    input_file: Path = typer.Argument(..., help="入力ファイル (.epub, .pdf, .txt)"),
    output_file: Path = typer.Argument(..., help="出力ファイル (.epub, .pdf)"),
    title: Optional[str] = typer.Option(None, "--title", "-t", help="書籍タイトルを上書き"),
    author: Optional[str] = typer.Option(None, "--author", "-a", help="著者名を上書き"),
    no_tcy: bool = typer.Option(False, "--no-tcy", help="縦中横（数字横組み）を無効化"),
    embed_font: bool = typer.Option(False, "--embed-font", help="F. Noto Serif CJKフォントを埋め込む"),
    font_dir: Optional[Path] = typer.Option(None, "--font-dir", help="F. 埋め込むフォントのディレクトリ"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="詳細ログを表示"),
) -> None:
    """電子書籍を縦書きフォーマットに変換する"""

    # 入力ファイル確認
    if not input_file.exists():
        console.print(f"[red]エラー: 入力ファイルが見つかりません: {input_file}[/red]")
        raise typer.Exit(1)

    in_ext = input_file.suffix.lower()
    out_ext = output_file.suffix.lower()

    if in_ext not in (".epub", ".pdf", ".txt", ".docx"):
        console.print(f"[red]エラー: 対応していない入力形式: {in_ext}[/red]")
        console.print("対応形式: .epub, .pdf, .txt, .docx")
        raise typer.Exit(1)

    if out_ext not in (".epub", ".pdf", ".html"):
        console.print(f"[red]エラー: 対応していない出力形式: {out_ext}[/red]")
        console.print("対応形式: .epub, .pdf, .html")
        raise typer.Exit(1)

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
        transient=not verbose,
    ) as progress:

        # ── 1. パース ──
        task = progress.add_task(f"[cyan]読み込み中: {input_file.name}", total=None)
        try:
            book = _parse(input_file, in_ext, verbose, progress)
        except Exception as e:
            console.print(f"[red]読み込みエラー: {e}[/red]")
            raise typer.Exit(1)
        progress.update(task, description=f"[green]読み込み完了: {len(book.chapters)}章")

        # メタデータ上書き
        if title:
            book.title = title
        if author:
            book.author = author

        # F. フォント埋め込み
        if embed_font or font_dir:
            from tateyomi.utils.fonts import embed_fonts_in_book
            embed_fonts_in_book(book, font_dir)
            if verbose:
                fd = getattr(book, "font_dir", None)
                if fd:
                    console.print(f"  フォントディレクトリ: {fd}")

        # ── 2. 変換 ──
        task2 = progress.add_task("[cyan]縦書き変換中...", total=None)
        from tateyomi.transform import text_transform, html_transform
        book = text_transform.transform(book, enable_tcy=not no_tcy)
        book = html_transform.transform(book)
        progress.update(task2, description="[green]変換完了")

        # ── 3. 出力 ──
        task3 = progress.add_task(f"[cyan]書き出し中: {output_file.name}", total=None)
        try:
            _render(book, output_file, out_ext)
        except Exception as e:
            console.print(f"[red]出力エラー: {e}[/red]")
            raise typer.Exit(1)
        progress.update(task3, description=f"[green]完了: {output_file}")

    size_kb = output_file.stat().st_size // 1024
    console.print(
        f"\n[bold green]OK 変換完了[/bold green] "
        f"{input_file.name} -> [bold]{output_file.name}[/bold] "
        f"({size_kb} KB)"
    )
    console.print(f"  タイトル : {book.title}")
    console.print(f"  著者     : {book.author or '(未設定)'}")
    console.print(f"  章数     : {len(book.chapters)}")
    console.print(f"  画像数   : {len(book.images)}")


def _parse(path: Path, ext: str, verbose: bool, progress):
    if ext == ".epub":
        from tateyomi.parsers.epub_parser import EpubParser
        parser = EpubParser()
    elif ext == ".pdf":
        from tateyomi.parsers.pdf_parser import PdfParser
        parser = PdfParser()
    elif ext == ".docx":
        from tateyomi.parsers.docx_parser import DocxParser
        parser = DocxParser()
    else:
        from tateyomi.parsers.txt_parser import TxtParser
        parser = TxtParser()
    return parser.parse(path)


def _render(book, output_path: Path, ext: str) -> None:
    if ext == ".epub":
        from tateyomi.renderers.epub3_renderer import render
        render(book, output_path)
    elif ext == ".html":
        from tateyomi.renderers.html_renderer import render
        render(book, output_path)
    else:
        # PDF: WeasyPrint を試みてGTKエラー時はHTMLフォールバック
        from tateyomi.renderers import pdf_renderer
        if not pdf_renderer.WEASYPRINT_AVAILABLE:
            # GTK未インストール → HTML自動フォールバック
            html_path = output_path.with_suffix(".html")
            from tateyomi.renderers.html_renderer import render as html_render
            html_render(book, html_path)
            raise RuntimeError(
                f"PDF出力にはGTK/Pangoが必要です。\n"
                f"代わりにHTMLを生成しました: {html_path.name}\n"
                f"Chromeで開いて [印刷] -> [PDFに保存] で縦書きPDFになります。\n"
                f"GTKインストール: https://doc.courtbouillon.org/weasyprint/stable/first_steps.html"
            )
        pdf_renderer.render(book, output_path)


@app.command()
def info(
    input_file: Path = typer.Argument(..., help="調査するファイル"),
) -> None:
    """入力ファイルのメタデータを表示する"""
    if not input_file.exists():
        console.print(f"[red]ファイルが見つかりません: {input_file}[/red]")
        raise typer.Exit(1)

    ext = input_file.suffix.lower()
    try:
        book = _parse(input_file, ext, False, None)
        console.print(f"\n[bold]ファイル情報: {input_file.name}[/bold]")
        console.print(f"  タイトル : {book.title}")
        console.print(f"  著者     : {book.author or '(未設定)'}")
        console.print(f"  言語     : {book.language}")
        console.print(f"  章数     : {len(book.chapters)}")
        console.print(f"  画像数   : {len(book.images)}")
        if book.chapters:
            console.print("\n  [bold]章一覧:[/bold]")
            for ch in book.chapters[:20]:
                console.print(f"    - {ch.chapter_id}: {ch.title}")
            if len(book.chapters) > 20:
                console.print(f"    ... 他 {len(book.chapters) - 20} 章")
    except Exception as e:
        console.print(f"[red]エラー: {e}[/red]")
        raise typer.Exit(1)


@app.command()
def batch(
    input_dir: Path = typer.Argument(..., help="入力ディレクトリ"),
    output_dir: Path = typer.Argument(..., help="出力ディレクトリ"),
    fmt: str = typer.Option("epub", "--format", "-f", help="出力形式: epub / html / pdf"),
    no_tcy: bool = typer.Option(False, "--no-tcy"),
    verbose: bool = typer.Option(False, "--verbose", "-v"),
) -> None:
    """ディレクトリ内の電子書籍を一括変換する"""
    if not input_dir.is_dir():
        console.print(f"[red]ディレクトリが見つかりません: {input_dir}[/red]")
        raise typer.Exit(1)

    out_ext = f".{fmt.lstrip('.')}"
    if out_ext not in (".epub", ".pdf", ".html"):
        console.print(f"[red]不正なフォーマット: {fmt}[/red]")
        raise typer.Exit(1)

    targets = [
        p for p in input_dir.iterdir()
        if p.suffix.lower() in (".epub", ".pdf", ".txt", ".docx")
    ]
    if not targets:
        console.print(f"[yellow]変換対象ファイルが見つかりません: {input_dir}[/yellow]")
        raise typer.Exit(0)

    output_dir.mkdir(parents=True, exist_ok=True)
    console.print(f"[bold]{len(targets)}件を変換します[/bold] -> {output_dir}")

    ok, ng = 0, 0
    for p in targets:
        out = output_dir / (p.stem + "_縦書き" + out_ext)
        try:
            book = _parse(p, p.suffix.lower(), verbose, None)
            from tateyomi.transform import text_transform, html_transform
            book = text_transform.transform(book, enable_tcy=not no_tcy)
            book = html_transform.transform(book)
            _render(book, out, out_ext)
            size_kb = out.stat().st_size // 1024
            console.print(f"  [green]OK[/green] {p.name} -> {out.name} ({size_kb}KB)")
            ok += 1
        except Exception as e:
            console.print(f"  [red]NG[/red] {p.name}: {e}")
            ng += 1

    console.print(f"\n完了: 成功={ok}, 失敗={ng}")


@app.command()
def check(
    epub_file: Path = typer.Argument(..., help="検証するEPUBファイル"),
    verbose: bool = typer.Option(False, "--verbose", "-v"),
) -> None:
    """C. EPUBファイルをepubcheckで検証する (KDP提出前確認)"""
    if not epub_file.exists():
        console.print(f"[red]ファイルが見つかりません: {epub_file}[/red]")
        raise typer.Exit(1)
    if epub_file.suffix.lower() != ".epub":
        console.print("[red]EPUBファイルを指定してください[/red]")
        raise typer.Exit(1)

    console.print(f"[cyan]検証中: {epub_file.name}[/cyan]")

    try:
        from epubcheck import EpubCheck
        result = EpubCheck(str(epub_file))

        if result.valid:
            console.print(f"[bold green]OK 検証合格[/bold green] {epub_file.name}")
            console.print(f"  EPUB バージョン : {result.version or '不明'}")
            console.print(f"  エラー数        : 0")
            console.print(f"  警告数          : {len(result.warnings) if result.warnings else 0}")
            if result.warnings and verbose:
                for w in result.warnings:
                    console.print(f"  [yellow]WARN[/yellow] {w}")
        else:
            console.print(f"[bold red]NG 検証失敗[/bold red] {epub_file.name}")
            errors = result.errors or []
            warnings = result.warnings or []
            console.print(f"  エラー数 : {len(errors)}")
            console.print(f"  警告数   : {len(warnings)}")
            for e in errors[:20]:
                console.print(f"  [red]ERROR[/red] {e}")
            if len(errors) > 20:
                console.print(f"  ... 他 {len(errors) - 20} 件")
            raise typer.Exit(1)

    except ImportError:
        console.print("[yellow]epubcheck パッケージが見つかりません[/yellow]")
        console.print("pip install epubcheck を実行してください")
        # フォールバック: ZIP構造チェック
        _quick_epub_check(epub_file)

    except Exception as e:
        err = str(e)
        # Java未インストール / 実行ファイル未発見 などを広くキャッチ
        java_errors = ("java", "jre", "jdk", "winError 2", "winerror 2",
                       "no such file", "not found", "指定されたファイル")
        if any(kw in err.lower() for kw in java_errors):
            console.print("[yellow]Javaが見つかりません。簡易チェックを実行します。[/yellow]")
            console.print("[dim]完全な検証には Java をインストールしてください。[/dim]")
            _quick_epub_check(epub_file)
        else:
            console.print(f"[red]検証エラー: {e}[/red]")
            raise typer.Exit(1)


def _quick_epub_check(epub_file: Path) -> None:
    """Java不要の簡易EPUBチェック"""
    import zipfile
    issues: list[str] = []
    ok_items: list[str] = []

    try:
        with zipfile.ZipFile(str(epub_file)) as zf:
            names = zf.namelist()

            # 必須ファイル確認
            checks = {
                "mimetype": "mimetype",
                "META-INF/container.xml": "container.xml",
                "OEBPS/content.opf": "content.opf",
                "OEBPS/nav.xhtml": "nav.xhtml",
                "OEBPS/toc.ncx": "toc.ncx",
            }
            for path, label in checks.items():
                if path in names:
                    ok_items.append(label)
                else:
                    issues.append(f"{label} が見つかりません")

            # mimetype が先頭かつ非圧縮か確認
            if names and names[0] == "mimetype":
                info = zf.getinfo("mimetype")
                if info.compress_type == 0:
                    ok_items.append("mimetype (非圧縮・先頭)")
                else:
                    issues.append("mimetype が圧縮されています")
            else:
                issues.append("mimetype が先頭にありません")

            # OPFでRTL確認
            try:
                opf = zf.read("OEBPS/content.opf").decode("utf-8")
                if 'page-progression-direction="rtl"' in opf:
                    ok_items.append("RTL page-progression-direction")
                else:
                    issues.append("page-progression-direction='rtl' が設定されていません")
                if "vertical-rl" in opf:
                    ok_items.append("primary-writing-mode: vertical-rl")
            except Exception:
                pass

            # CSS確認
            if "OEBPS/Styles/tateyomi.css" in names:
                ok_items.append("tateyomi.css")

    except zipfile.BadZipFile:
        console.print("[red]不正なEPUBファイル（ZIPとして開けません）[/red]")
        raise typer.Exit(1)

    console.print("\n[bold]簡易チェック結果:[/bold]")
    for item in ok_items:
        console.print(f"  [green]OK[/green] {item}")
    for issue in issues:
        console.print(f"  [red]NG[/red] {issue}")

    if issues:
        console.print(f"\n[yellow]{len(issues)}件の問題が見つかりました[/yellow]")
    else:
        console.print("\n[bold green]問題なし[/bold green] (簡易チェック)")


@app.command()
def font(
    download: bool = typer.Option(False, "--download", help="F. Noto Serif CJK JPをダウンロード"),
    list_cached: bool = typer.Option(False, "--list", help="キャッシュ済みフォントを表示"),
    cache_dir: bool = typer.Option(False, "--cache-dir", help="フォントキャッシュディレクトリを表示"),
) -> None:
    """F. フォント管理 (ダウンロード・確認)"""
    from tateyomi.utils.fonts import get_cached_fonts, download_fonts, _CACHE_DIR

    if cache_dir:
        console.print(str(_CACHE_DIR))
        return

    if list_cached:
        cached = get_cached_fonts()
        if cached:
            console.print("[bold]キャッシュ済みフォント:[/bold]")
            for name, path in cached.items():
                size_kb = path.stat().st_size // 1024
                console.print(f"  {name} ({size_kb} KB)")
        else:
            console.print("[yellow]キャッシュ済みフォントなし[/yellow]")
            console.print("tateyomi.bat font --download でダウンロードできます")
        return

    if download:
        console.print("[cyan]Noto Serif CJK JP をダウンロード中...[/cyan]")
        console.print(f"保存先: {_CACHE_DIR}")
        console.print("[yellow]注意: 各フォントは約20MBです。時間がかかる場合があります。[/yellow]")

        def on_progress(name, downloaded, total):
            if total > 0:
                pct = downloaded * 100 // total
                console.print(f"  {name}: {pct}% ({downloaded//1024}KB/{total//1024}KB)", end="\r")
            else:
                console.print(f"  {name}: ダウンロード中...", end="\r")

        result = download_fonts(progress_cb=on_progress)
        console.print()
        if result:
            console.print(f"[bold green]OK {len(result)}個のフォントをダウンロードしました[/bold green]")
            for name, path in result.items():
                size_kb = path.stat().st_size // 1024
                console.print(f"  {name} ({size_kb} KB)")
            console.print("\nフォント埋め込み使用例:")
            console.print("  tateyomi.bat convert input.epub output.epub --embed-font")
        else:
            console.print("[red]ダウンロードに失敗しました[/red]")
        return

    console.print("使用方法: tateyomi.bat font --download / --list / --cache-dir")


@app.command()
def gui() -> None:
    """GUIウィンドウを起動する"""
    from tateyomi.gui import main
    main()


if __name__ == "__main__":
    app()
