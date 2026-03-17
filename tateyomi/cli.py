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
    verbose: bool = typer.Option(False, "--verbose", "-v", help="詳細ログを表示"),
) -> None:
    """電子書籍を縦書きフォーマットに変換する"""

    # 入力ファイル確認
    if not input_file.exists():
        console.print(f"[red]エラー: 入力ファイルが見つかりません: {input_file}[/red]")
        raise typer.Exit(1)

    in_ext = input_file.suffix.lower()
    out_ext = output_file.suffix.lower()

    if in_ext not in (".epub", ".pdf", ".txt"):
        console.print(f"[red]エラー: 対応していない入力形式: {in_ext}[/red]")
        console.print("対応形式: .epub, .pdf, .txt")
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
        if p.suffix.lower() in (".epub", ".pdf", ".txt")
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
def gui() -> None:
    """GUIウィンドウを起動する"""
    from tateyomi.gui import main
    main()


if __name__ == "__main__":
    app()
