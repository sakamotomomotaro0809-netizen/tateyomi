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
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn

# Windows CP932環境向け: 起動時に stdout/stderr を UTF-8 に切り替える
if sys.platform == "win32":
    import io
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
            sys.stderr.reconfigure(encoding="utf-8")
        except Exception:
            pass

app = typer.Typer(
    name="tateyomi",
    help="電子書籍を縦書き（右から左）に変換するツール",
    no_args_is_help=True,
)
console = Console(highlight=False, safe_box=True)


@app.command()
def convert(
    input_file: Path = typer.Argument(..., help="入力ファイル (.epub, .pdf, .txt)"),
    output_file: Path = typer.Argument(..., help="出力ファイル (.epub, .pdf)"),
    title: Optional[str] = typer.Option(None, "--title", "-t", help="書籍タイトルを上書き"),
    author: Optional[str] = typer.Option(None, "--author", "-a", help="著者名を上書き"),
    no_tcy: bool = typer.Option(False, "--no-tcy", help="縦中横（数字横組み）を無効化"),
    no_vertical_forms: bool = typer.Option(
        False, "--no-vertical-forms",
        help="約物を縦書き専用文字に置換しない（本文内検索が効くようにする）"),
    horizontal: bool = typer.Option(False, "--horizontal", "-H",
                                    help="横書き（左から右）で出力する。既定は縦書き"),
    embed_font: bool = typer.Option(False, "--embed-font", help="F. Noto Serif CJKフォントを埋め込む"),
    font_dir: Optional[Path] = typer.Option(None, "--font-dir", help="F. 埋め込むフォントのディレクトリ"),
    css: Optional[Path] = typer.Option(None, "--css", help="H. 追加CSSファイルのパス"),
    config_file: Optional[Path] = typer.Option(None, "--config", help="I. 設定ファイル (tateyomi.toml)"),
    font_size: Optional[str] = typer.Option(None, "--font-size", help="フォントサイズ (例: 1em, 14pt)"),
    line_height: Optional[float] = typer.Option(None, "--line-height", help="行間 (例: 1.8)"),
    gen_cover: bool = typer.Option(False, "--gen-cover", help="表紙画像を自動生成して追加する"),
    cover: Optional[Path] = typer.Option(None, "--cover", help="表紙に使う画像ファイル (.png/.jpg)"),
    split_level: int = typer.Option(1, "--split-level",
                                    help="Markdown入力を章分割する見出しレベル (1=# のみ, 2=## まで)"),
    auto_ruby: bool = typer.Option(False, "--auto-ruby", help="AX. 漢字にルビを自動付与 (fugashi/cutlet 必要)"),
    dry_run: bool = typer.Option(False, "--dry-run", help="変換せず書籍情報のみ表示する"),
    log_file: Optional[Path] = typer.Option(None, "--log-file", help="AZ. ログ出力先ファイル"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="詳細ログを表示"),
) -> None:
    """電子書籍を縦書き（既定）または横書き（--horizontal）に変換する"""

    # 入力ファイル確認
    if not input_file.exists():
        console.print(f"[red]エラー: 入力ファイルが見つかりません: {input_file}[/red]")
        raise typer.Exit(1)

    in_ext = input_file.suffix.lower()
    out_ext = output_file.suffix.lower()

    if in_ext not in (".epub", ".pdf", ".txt", ".docx", ".md", ".html", ".htm"):
        console.print(f"[red]エラー: 対応していない入力形式: {in_ext}[/red]")
        console.print("対応形式: .epub, .pdf, .txt, .docx, .md, .html, .htm")
        raise typer.Exit(1)

    if out_ext not in (".epub", ".pdf", ".html"):
        console.print(f"[red]エラー: 対応していない出力形式: {out_ext}[/red]")
        console.print("対応形式: .epub, .pdf, .html")
        raise typer.Exit(1)

    # I. 設定ファイル読み込み
    from tateyomi.settings import TateyomiConfig
    cfg = TateyomiConfig.load(config_file)

    # 横書きモード
    if horizontal:
        cfg.convert.horizontal = True

    # H. --css オプションで extra_css_file を上書き
    if css:
        cfg.convert.extra_css_file = str(css)

    # AM. --font-size / --line-height で layout 設定を上書き
    if font_size:
        cfg.layout.font_size = font_size
    if line_height is not None:
        cfg.layout.line_height = line_height

    # AZ. ログファイルセットアップ
    if log_file:
        from tateyomi.utils.logger import setup_log_file, log_convert_start
        setup_log_file(log_file)
        log_convert_start(input_file, output_file)

    # V. ドライラン: 変換せず情報表示して終了
    if dry_run:
        _dry_run(input_file, in_ext, cfg)
        return

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
        transient=not verbose,
    ) as progress:

        # ── 1. パース ──
        task = progress.add_task(f"[cyan]読み込み中: {input_file.name}", total=None)
        try:
            book = _parse(input_file, in_ext, verbose, progress, split_level=split_level)
        except Exception as e:
            from tateyomi.utils.error_messages import format_error
            console.print(f"[red]読み込みエラー: {format_error(e, verbose)}[/red]")
            raise typer.Exit(1)
        progress.update(task, description=f"[green]読み込み完了: {len(book.chapters)}章")

        # メタデータ上書き
        if title:
            book.title = title
        if author:
            book.author = author

        # UUID 永続化: 非 EPUB は毎回新 UUID になるのを防ぐ
        if in_ext != ".epub":
            from tateyomi.utils.uid_store import get_or_create_uid
            book.uid = get_or_create_uid(input_file)

        # F. フォント埋め込み
        if embed_font or font_dir or cfg.convert.embed_font:
            from tateyomi.utils.fonts import embed_fonts_in_book
            embed_fonts_in_book(book, font_dir)
            if verbose:
                fd = getattr(book, "font_dir", None)
                if fd:
                    console.print(f"  フォントディレクトリ: {fd}")

        # 表紙画像を指定ファイルから設定
        if cover:
            if not cover.exists():
                console.print(f"[red]エラー: 表紙画像が見つかりません: {cover}[/red]")
                raise typer.Exit(1)
            from tateyomi.utils.cover_gen import set_cover_from_file
            set_cover_from_file(book, cover)
            if verbose:
                console.print(f"  表紙画像を設定しました: {cover.name}")

        # AN. 表紙画像自動生成
        if gen_cover:
            from tateyomi.utils.cover_gen import add_cover_to_book
            add_cover_to_book(book)
            if verbose:
                console.print("  表紙画像を自動生成しました")

        # AX. ルビ自動付与
        if auto_ruby:
            from tateyomi.utils.auto_ruby import add_ruby_to_html, is_available
            if not is_available():
                console.print("[yellow]--auto-ruby: fugashi または cutlet が必要です。"
                              " pip install fugashi unidic-lite または pip install cutlet[/yellow]")
            else:
                for ch in book.chapters:
                    ch.html_content = add_ruby_to_html(ch.html_content)
                if verbose:
                    console.print("  ルビを自動付与しました")

        # K. 画像リサイズ
        if cfg.convert.resize_images:
            from tateyomi.utils.image_resize import resize_images_in_book
            resize_images_in_book(
                book,
                max_w=cfg.convert.image_max_width,
                max_h=cfg.convert.image_max_height,
            )

        # ── 2. 変換 ──
        n_chapters = len(book.chapters)
        mode_label = "横書き" if cfg.convert.horizontal else "縦書き"
        task2 = progress.add_task(f"[cyan]{mode_label}変換中...", total=n_chapters)

        def _on_chapter(current: int, total: int, ch_title: str) -> None:
            progress.update(
                task2,
                completed=current,
                description=f"[cyan]変換中 ({current}/{total}): {ch_title[:20]}",
            )

        from tateyomi.transform import text_transform, html_transform
        book = text_transform.transform(
            book,
            enable_tcy=not no_tcy and cfg.convert.enable_tcy,
            vertical_forms=not no_vertical_forms,
            normalize=cfg.convert.normalize_text,
            horizontal=cfg.convert.horizontal,
            progress_cb=_on_chapter,
        )
        book = html_transform.transform(book, horizontal=cfg.convert.horizontal)
        progress.update(task2, completed=n_chapters, description="[green]変換完了")

        # ── 3. 出力 ──
        task3 = progress.add_task(f"[cyan]書き出し中: {output_file.name}", total=None)
        try:
            _render(book, output_file, out_ext, cfg)
        except Exception as e:
            from tateyomi.utils.error_messages import format_error
            console.print(f"[red]出力エラー: {format_error(e, verbose)}[/red]")
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

    # AZ. ログ記録
    if log_file:
        from tateyomi.utils.logger import log_convert_done, teardown
        log_convert_done(output_file, size_kb, len(book.chapters))
        teardown()


def _dry_run(input_file: Path, ext: str, cfg) -> None:
    """--dry-run: 変換せず書籍情報を表示"""
    console.print(f"[bold cyan][DRY RUN] {input_file.name}[/bold cyan]")
    try:
        book = _parse(input_file, ext, False, None)
    except Exception as e:
        console.print(f"[red]読み込みエラー: {e}[/red]")
        raise typer.Exit(1)

    size_kb = input_file.stat().st_size // 1024
    console.print(f"  ファイルサイズ : {size_kb:,} KB")
    console.print(f"  タイトル      : {book.title or '(未設定)'}")
    console.print(f"  著者          : {book.author or '(未設定)'}")
    console.print(f"  言語          : {book.language or 'ja'}")
    console.print(f"  章数          : {len(book.chapters)}")
    console.print(f"  画像数        : {len(book.images)}")
    if book.cover_image_href:
        console.print(f"  表紙画像      : {book.cover_image_href}")
    if book.chapters:
        console.print("\n  [bold]章一覧:[/bold]")
        for ch in book.chapters[:15]:
            console.print(f"    - {ch.title}")
        if len(book.chapters) > 15:
            console.print(f"    ... 他 {len(book.chapters) - 15} 章")
    console.print("\n  [bold]適用設定:[/bold]")
    console.print(f"    書字方向       : {'横書き' if cfg.convert.horizontal else '縦書き'}")
    console.print(f"    縦中横         : {cfg.convert.enable_tcy}")
    console.print(f"    テキスト正規化 : {cfg.convert.normalize_text}")
    console.print(f"    画像リサイズ   : {cfg.convert.resize_images}")
    console.print(f"    フォントサイズ : {cfg.layout.font_size}")
    console.print(f"    行間           : {cfg.layout.line_height}")
    console.print("\n[yellow]--dry-run: 出力ファイルは生成されていません[/yellow]")


def _parse(path: Path, ext: str, verbose: bool, progress, split_level: int = 1):
    if ext == ".epub":
        from tateyomi.parsers.epub_parser import EpubParser
        parser = EpubParser()
    elif ext == ".pdf":
        from tateyomi.parsers.pdf_parser import PdfParser
        parser = PdfParser()
    elif ext == ".docx":
        from tateyomi.parsers.docx_parser import DocxParser
        parser = DocxParser()
    elif ext == ".md":
        from tateyomi.parsers.md_parser import MdParser
        parser = MdParser(split_level=split_level)
    elif ext in (".html", ".htm"):
        from tateyomi.parsers.html_parser import HtmlParser
        parser = HtmlParser()
    else:
        from tateyomi.parsers.txt_parser import TxtParser
        parser = TxtParser()
    return parser.parse(path)


def _render(book, output_path: Path, ext: str, config=None) -> None:
    if ext == ".epub":
        from tateyomi.renderers.epub3_renderer import render
        render(book, output_path, config=config)
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
        size_kb = input_file.stat().st_size // 1024
        console.print(f"\n[bold]ファイル情報: {input_file.name}[/bold]")
        console.print(f"  ファイルサイズ : {size_kb:,} KB")
        console.print(f"  タイトル      : {book.title or '(未設定)'}")
        console.print(f"  著者          : {book.author or '(未設定)'}")
        console.print(f"  言語          : {book.language or 'ja'}")
        console.print(f"  UID           : {book.uid or '(なし)'}")
        console.print(f"  入力形式      : {book.source_format or ext.lstrip('.')}")
        console.print(f"  章数          : {len(book.chapters)}")
        console.print(f"  画像数        : {len(book.images)}")

        # 表紙画像
        if book.cover_image_href:
            console.print(f"  表紙画像      : {book.cover_image_href}")
        else:
            console.print(f"  表紙画像      : (なし)")

        # 画像サイズ統計
        if book.images:
            total_img_kb = sum(len(img.data) for img in book.images) // 1024
            console.print(f"  画像合計サイズ: {total_img_kb:,} KB")
            large = [img for img in book.images if len(img.data) > 5 * 1024 * 1024]
            if large:
                console.print(f"  [yellow]大きい画像 {len(large)} 件 (各5MB超 — リサイズ推奨)[/yellow]")

        if book.chapters:
            console.print("\n  [bold]章一覧:[/bold]")
            for ch in book.chapters[:20]:
                console.print(f"    - {ch.chapter_id}: {ch.title}")
            if len(book.chapters) > 20:
                console.print(f"    ... 他 {len(book.chapters) - 20} 章")
    except Exception as e:
        console.print(f"[red]エラー: {e}[/red]")
        raise typer.Exit(1)


def _batch_convert_one(args: tuple) -> tuple[str, str, int | None]:
    """BB. 並列バッチ用ワーカー関数（pickle可能な独立関数）"""
    p_str, out_str, out_ext, no_tcy, cfg_dict = args
    p = Path(p_str)
    out = Path(out_str)
    try:
        from tateyomi.settings import TateyomiConfig
        cfg = TateyomiConfig()
        # 最低限の設定を復元
        cfg.convert.enable_tcy = cfg_dict.get("enable_tcy", True)
        cfg.convert.normalize_text = cfg_dict.get("normalize_text", False)
        cfg.convert.resize_images = cfg_dict.get("resize_images", True)
        cfg.convert.image_max_width = cfg_dict.get("image_max_width", 1650)
        cfg.convert.image_max_height = cfg_dict.get("image_max_height", 2550)

        from tateyomi.cli import _parse, _render
        book = _parse(p, p.suffix.lower(), False, None)
        if cfg.convert.resize_images:
            from tateyomi.utils.image_resize import resize_images_in_book
            resize_images_in_book(book, cfg.convert.image_max_width, cfg.convert.image_max_height)
        from tateyomi.transform import text_transform, html_transform
        book = text_transform.transform(
            book,
            enable_tcy=not no_tcy and cfg.convert.enable_tcy,
            normalize=cfg.convert.normalize_text,
        )
        book = html_transform.transform(book)
        _render(book, out, out_ext, cfg)
        size_kb = out.stat().st_size // 1024
        return ("ok", p.name, size_kb)
    except Exception as e:
        return ("ng", p.name, None)


@app.command()
def batch(
    input_dir: Path = typer.Argument(..., help="入力ディレクトリ"),
    output_dir: Path = typer.Argument(..., help="出力ディレクトリ"),
    fmt: str = typer.Option("epub", "--format", "-f", help="出力形式: epub / html / pdf"),
    no_tcy: bool = typer.Option(False, "--no-tcy"),
    workers: int = typer.Option(1, "--workers", "-w", help="BB. 並列ワーカー数 (デフォルト=1)"),
    log_file: Optional[Path] = typer.Option(None, "--log-file", help="AZ. ログ出力先ファイル"),
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
        if p.suffix.lower() in (".epub", ".pdf", ".txt", ".docx", ".md", ".html", ".htm")
    ]
    if not targets:
        console.print(f"[yellow]変換対象ファイルが見つかりません: {input_dir}[/yellow]")
        raise typer.Exit(0)

    output_dir.mkdir(parents=True, exist_ok=True)
    console.print(f"[bold]{len(targets)}件を変換します[/bold] -> {output_dir}"
                  + (f" (並列 {workers} ワーカー)" if workers > 1 else ""))

    from tateyomi.settings import TateyomiConfig
    cfg = TateyomiConfig.load()

    # AZ. ログ
    if log_file:
        from tateyomi.utils.logger import setup_log_file, log_info
        setup_log_file(log_file)
        log_info(f"バッチ変換開始: {input_dir} -> {output_dir} ({len(targets)}件)")

    cfg_dict = {
        "enable_tcy": cfg.convert.enable_tcy,
        "normalize_text": cfg.convert.normalize_text,
        "resize_images": cfg.convert.resize_images,
        "image_max_width": cfg.convert.image_max_width,
        "image_max_height": cfg.convert.image_max_height,
    }

    task_args = [
        (str(p), str(output_dir / (p.stem + "_縦書き" + out_ext)), out_ext, no_tcy, cfg_dict)
        for p in targets
    ]

    ok, ng = 0, 0

    if workers > 1:
        # BB. 並列処理
        import concurrent.futures
        with concurrent.futures.ProcessPoolExecutor(max_workers=workers) as executor:
            futures = {executor.submit(_batch_convert_one, a): a for a in task_args}
            for fut in concurrent.futures.as_completed(futures):
                status, name, size_kb = fut.result()
                if status == "ok":
                    console.print(f"  [green]OK[/green] {name} ({size_kb}KB)")
                    ok += 1
                else:
                    console.print(f"  [red]NG[/red] {name}")
                    ng += 1
    else:
        # シングルスレッド
        for args in task_args:
            status, name, size_kb = _batch_convert_one(args)
            if status == "ok":
                console.print(f"  [green]OK[/green] {name} ({size_kb}KB)")
                ok += 1
            else:
                console.print(f"  [red]NG[/red] {name}")
                ng += 1

    console.print(f"\n完了: 成功={ok}, 失敗={ng}")

    if log_file:
        from tateyomi.utils.logger import log_info, teardown
        log_info(f"バッチ変換完了: 成功={ok}, 失敗={ng}")
        teardown()


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

    # ファイルサイズ確認（epubcheck の有無に関わらず表示）
    size_kb = epub_file.stat().st_size // 1024
    size_label = f"{size_kb:,} KB"
    if size_kb > 650_000:
        console.print(f"[red]ファイルサイズ: {size_label}  ← KDP上限(650 MB)超過[/red]")
    elif size_kb > 500_000:
        console.print(f"[yellow]ファイルサイズ: {size_label}  ← KDP上限(650 MB)に近づいています[/yellow]")
    else:
        console.print(f"  ファイルサイズ: {size_label}")

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
    warn_items: list[str] = []

    try:
        with zipfile.ZipFile(str(epub_file)) as zf:
            names = zf.namelist()

            # ファイルサイズ
            total_kb = epub_file.stat().st_size // 1024
            console.print(f"  ファイルサイズ : {total_kb:,} KB")
            if total_kb > 650_000:
                warn_items.append(f"ファイルサイズが大きすぎます ({total_kb:,} KB > 650 MB KDP上限)")

            # 必須ファイル確認
            required = {
                "mimetype": "mimetype",
                "META-INF/container.xml": "container.xml",
                "OEBPS/content.opf": "content.opf",
                "OEBPS/nav.xhtml": "nav.xhtml",
                "OEBPS/toc.ncx": "toc.ncx",
            }
            for path, label in required.items():
                if path in names:
                    ok_items.append(label)
                else:
                    issues.append(f"{label} が見つかりません")

            # mimetype が先頭かつ非圧縮か確認
            if names and names[0] == "mimetype":
                info_mt = zf.getinfo("mimetype")
                if info_mt.compress_type == 0:
                    ok_items.append("mimetype (非圧縮・先頭)")
                else:
                    issues.append("mimetype が圧縮されています")
            else:
                issues.append("mimetype が先頭にありません")

            # OPF 解析
            try:
                opf = zf.read("OEBPS/content.opf").decode("utf-8")
                # 縦書き(vertical-rl/rtl) と 横書き(horizontal-tb/ltr) の整合を見る
                is_horizontal = "horizontal-tb" in opf
                want_dir = "ltr" if is_horizontal else "rtl"
                want_mode = "horizontal-tb" if is_horizontal else "vertical-rl"
                if f'page-progression-direction="{want_dir}"' in opf:
                    ok_items.append(f"page-progression-direction: {want_dir}")
                else:
                    issues.append(
                        f"page-progression-direction='{want_dir}' が設定されていません")
                if want_mode in opf:
                    ok_items.append(f"primary-writing-mode: {want_mode}")
                else:
                    warn_items.append(f"primary-writing-mode: {want_mode} が見つかりません")

                # タイトル・著者確認
                import re as _re
                title_m = _re.search(r"<dc:title>([^<]+)</dc:title>", opf)
                author_m = _re.search(r"<dc:creator>([^<]+)</dc:creator>", opf)
                if title_m:
                    ok_items.append(f"タイトル: {title_m.group(1)}")
                else:
                    warn_items.append("dc:title が未設定です")
                if author_m and author_m.group(1).strip():
                    ok_items.append(f"著者: {author_m.group(1)}")
                else:
                    warn_items.append("dc:creator が未設定です")

                # 表紙画像確認
                if 'properties="cover-image"' in opf:
                    ok_items.append("表紙画像 (cover-image)")
                else:
                    warn_items.append("表紙画像が設定されていません（KDP推奨）")

            except Exception:
                pass

            # CSS確認
            if "OEBPS/Styles/tateyomi.css" in names:
                ok_items.append("tateyomi.css")
            if "OEBPS/Styles/kindle-overrides.css" in names:
                ok_items.append("kindle-overrides.css")

            # 画像統計
            images = [n for n in names if n.startswith("OEBPS/Images/") or
                      any(n.endswith(e) for e in (".jpg", ".jpeg", ".png", ".gif", ".svg"))]
            if images:
                ok_items.append(f"画像 {len(images)} 件")
                # 大きすぎる画像チェック
                large = []
                for img_name in images:
                    try:
                        img_kb = len(zf.read(img_name)) // 1024
                        if img_kb > 5000:
                            large.append(f"{img_name} ({img_kb} KB)")
                    except Exception:
                        pass
                if large:
                    for l in large:
                        warn_items.append(f"大きい画像: {l} (KDP は 5MB 推奨)")

            # チャプター数 + alt属性チェック
            chapters = [n for n in names if n.startswith("OEBPS/Text/") and n.endswith(".xhtml")]
            ok_items.append(f"チャプター {len(chapters)} 件")

            missing_alt = 0
            import re as _re2
            for ch_name in chapters:
                try:
                    ch_html = zf.read(ch_name).decode("utf-8", errors="replace")
                    for img_tag in _re2.findall(r"<img\b[^>]*/?>", ch_html, _re2.IGNORECASE):
                        if "alt=" not in img_tag.lower():
                            missing_alt += 1
                except Exception:
                    pass
            if missing_alt:
                warn_items.append(
                    f"alt属性のない画像が {missing_alt} 件 (アクセシビリティ: WCAG 1.1.1)"
                )

    except zipfile.BadZipFile:
        console.print("[red]不正なEPUBファイル（ZIPとして開けません）[/red]")
        raise typer.Exit(1)

    console.print("\n[bold]簡易チェック結果:[/bold]")
    for item in ok_items:
        console.print(f"  [green]OK[/green]   {item}")
    for item in warn_items:
        console.print(f"  [yellow]WARN[/yellow] {item}")
    for item in issues:
        console.print(f"  [red]NG[/red]   {item}")

    if issues:
        console.print(f"\n[bold red]{len(issues)}件のエラーが見つかりました[/bold red]")
        if warn_items:
            console.print(f"[yellow]{len(warn_items)}件の警告があります[/yellow]")
    elif warn_items:
        console.print(f"\n[yellow]エラーなし・{len(warn_items)}件の警告 (簡易チェック)[/yellow]")
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


@app.command("config")
def config_cmd(
    init: bool = typer.Option(False, "--init", help="I. tateyomi.toml をカレントディレクトリに生成"),
    show: bool = typer.Option(False, "--show", help="I. 現在の設定を表示"),
    config_file: Optional[Path] = typer.Option(None, "--config", help="設定ファイルのパス"),
) -> None:
    """I. 設定ファイル (tateyomi.toml) の管理"""
    from tateyomi.settings import TateyomiConfig

    if init:
        out = config_file or Path("tateyomi.toml")
        if out.exists():
            console.print(f"[yellow]既存ファイルを上書きします: {out}[/yellow]")
        cfg = TateyomiConfig()
        cfg.save(out)
        console.print(f"[bold green]OK[/bold green] 設定ファイルを生成しました: {out}")
        console.print("  エディタで編集してフォントサイズ・余白などをカスタマイズできます。")
        return

    cfg = TateyomiConfig.load(config_file)
    console.print("[bold]現在の設定:[/bold]")
    console.print("\n[bold cyan][layout][/bold cyan]")
    console.print(f"  line_height    = {cfg.layout.line_height}")
    console.print(f"  font_size      = {cfg.layout.font_size!r}")
    console.print(f"  margin_block   = {cfg.layout.margin_block!r}")
    console.print(f"  margin_inline  = {cfg.layout.margin_inline!r}")
    console.print(f"  chars_hint     = {cfg.layout.chars_hint}")
    console.print(f"  page_size      = {cfg.layout.page_size!r}")
    console.print("\n[bold cyan][convert][/bold cyan]")
    console.print(f"  enable_tcy     = {cfg.convert.enable_tcy}")
    console.print(f"  embed_font     = {cfg.convert.embed_font}")
    console.print(f"  normalize_text = {cfg.convert.normalize_text}")
    console.print(f"  resize_images  = {cfg.convert.resize_images}")
    console.print(f"  image_max_width  = {cfg.convert.image_max_width}")
    console.print(f"  image_max_height = {cfg.convert.image_max_height}")
    if cfg.convert.extra_css:
        console.print(f"  extra_css      = (インライン CSS あり)")
    if cfg.convert.extra_css_file:
        console.print(f"  extra_css_file = {cfg.convert.extra_css_file!r}")


@app.command()
def meta(
    epub_file: Path = typer.Argument(..., help="メタデータを編集するEPUBファイル"),
    title: Optional[str] = typer.Option(None, "--title", "-t", help="タイトルを変更"),
    author: Optional[str] = typer.Option(None, "--author", "-a", help="著者名を変更"),
    language: Optional[str] = typer.Option(None, "--lang", help="言語コードを変更 (例: ja, en)"),
    output: Optional[Path] = typer.Option(None, "--output", "-o", help="出力先 (省略時は上書き)"),
) -> None:
    """EPUBのメタデータ（タイトル・著者）を編集する"""
    if not epub_file.exists():
        console.print(f"[red]ファイルが見つかりません: {epub_file}[/red]")
        raise typer.Exit(1)
    if epub_file.suffix.lower() != ".epub":
        console.print("[red]EPUBファイルを指定してください[/red]")
        raise typer.Exit(1)
    if not any([title, author, language]):
        console.print("[yellow]変更するメタデータを指定してください (--title / --author / --lang)[/yellow]")
        raise typer.Exit(1)

    import zipfile, shutil, re, tempfile

    out_path = output or epub_file
    # 元ファイルを一時ファイルにコピーして処理
    with tempfile.NamedTemporaryFile(suffix=".epub", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    shutil.copy2(epub_file, tmp_path)

    try:
        # OPF を書き換え
        with zipfile.ZipFile(str(tmp_path), "r") as zin:
            names = zin.namelist()
            opf_path = next((n for n in names if n.endswith(".opf")), None)
            if not opf_path:
                console.print("[red]content.opf が見つかりません[/red]")
                raise typer.Exit(1)
            opf = zin.read(opf_path).decode("utf-8")
            all_files = {n: zin.read(n) for n in names}

        if title:
            opf = re.sub(r"<dc:title>[^<]*</dc:title>",
                         f"<dc:title>{title}</dc:title>", opf)
        if author:
            if "<dc:creator>" in opf:
                opf = re.sub(r"<dc:creator[^>]*>[^<]*</dc:creator>",
                             f"<dc:creator>{author}</dc:creator>", opf)
            else:
                opf = opf.replace("</metadata>",
                                  f"  <dc:creator>{author}</dc:creator>\n  </metadata>")
        if language:
            opf = re.sub(r"<dc:language>[^<]*</dc:language>",
                         f"<dc:language>{language}</dc:language>", opf)

        all_files[opf_path] = opf.encode("utf-8")

        # 新しい ZIP を書き出す
        final_path = tmp_path.with_suffix(".out.epub")
        with zipfile.ZipFile(str(final_path), "w", zipfile.ZIP_DEFLATED) as zout:
            # mimetype は非圧縮・先頭
            zi = zipfile.ZipInfo("mimetype")
            zi.compress_type = zipfile.ZIP_STORED
            zout.writestr(zi, "application/epub+zip")
            for name, data in all_files.items():
                if name == "mimetype":
                    continue
                zout.writestr(name, data)

        shutil.move(str(final_path), str(out_path))
        tmp_path.unlink(missing_ok=True)

        console.print(f"[bold green]OK メタデータを更新しました[/bold green]: {out_path.name}")
        if title:   console.print(f"  タイトル : {title}")
        if author:  console.print(f"  著者     : {author}")
        if language: console.print(f"  言語     : {language}")

    except SystemExit:
        raise
    except Exception as e:
        tmp_path.unlink(missing_ok=True)
        console.print(f"[red]エラー: {e}[/red]")
        raise typer.Exit(1)


@app.command()
def split(
    epub_file: Path = typer.Argument(..., help="分割するEPUBファイル"),
    output_dir: Path = typer.Argument(..., help="出力ディレクトリ"),
    prefix: str = typer.Option("chapter", "--prefix", "-p", help="出力ファイル名のプレフィックス"),
    verbose: bool = typer.Option(False, "--verbose", "-v"),
) -> None:
    """EPUBをチャプター単位に分割して複数のEPUBファイルを生成する"""
    if not epub_file.exists():
        console.print(f"[red]ファイルが見つかりません: {epub_file}[/red]")
        raise typer.Exit(1)
    if epub_file.suffix.lower() != ".epub":
        console.print("[red]EPUBファイルを指定してください[/red]")
        raise typer.Exit(1)

    output_dir.mkdir(parents=True, exist_ok=True)

    try:
        from tateyomi.parsers.epub_parser import EpubParser
        book = EpubParser().parse(epub_file)
    except Exception as e:
        console.print(f"[red]読み込みエラー: {e}[/red]")
        raise typer.Exit(1)

    if not book.chapters:
        console.print("[yellow]チャプターが見つかりませんでした[/yellow]")
        raise typer.Exit(1)

    console.print(f"[bold]{len(book.chapters)}章を分割します[/bold] -> {output_dir}")

    from tateyomi.config import ParsedBook
    from tateyomi.renderers.epub3_renderer import render as epub_render
    from tateyomi.settings import TateyomiConfig
    cfg = TateyomiConfig.load()

    ok = 0
    for i, chapter in enumerate(book.chapters):
        out_name = f"{prefix}_{i + 1:03d}.epub"
        out_path = output_dir / out_name

        # 1章だけを持つ ParsedBook を生成
        single = ParsedBook(
            title=chapter.title or f"{book.title} ({i + 1})",
            author=book.author,
            language=book.language,
            uid="",
            chapters=[chapter],
            images=book.images,  # 全画像を共有（参照されないものは無駄だが安全側）
            source_format=book.source_format,
            cover_image_href=book.cover_image_href,
        )
        try:
            epub_render(single, out_path, config=cfg)
            size_kb = out_path.stat().st_size // 1024
            console.print(f"  [green]OK[/green] {out_name} ({size_kb} KB) — {chapter.title}")
            ok += 1
        except Exception as e:
            console.print(f"  [red]NG[/red] {out_name}: {e}")

    console.print(f"\n[bold green]完了: {ok}/{len(book.chapters)} 章を分割しました[/bold green]")
    console.print(f"  出力先: {output_dir}")


@app.command()
def version() -> None:
    """tateyomi のバージョンと環境情報を表示する"""
    import sys
    import platform
    from tateyomi import __version__

    console.print(f"[bold]tateyomi[/bold] {__version__}")
    console.print(f"  Python  : {sys.version.split()[0]}")
    console.print(f"  OS      : {platform.system()} {platform.release()}")

    # 主要依存ライブラリのバージョン
    deps = [
        ("ebooklib", "ebooklib"),
        ("PIL",      "PIL"),
        ("pdfplumber","pdfplumber"),
        ("lxml",     "lxml"),
        ("typer",    "typer"),
        ("rich",     "rich"),
    ]
    console.print("  依存ライブラリ:")
    for label, mod in deps:
        try:
            m = __import__(mod)
            ver = getattr(m, "__version__", "?")
            console.print(f"    {label:<12}: {ver}")
        except ImportError:
            console.print(f"    {label:<12}: [red]未インストール[/red]")

    # WeasyPrint (オプション)
    try:
        import weasyprint
        console.print(f"    {'weasyprint':<12}: {weasyprint.__version__} (PDF出力利用可)")
    except Exception:
        console.print(f"    {'weasyprint':<12}: [yellow]無効 (PDF出力不可)[/yellow]")


@app.command()
def preview(
    input_file: Path = typer.Argument(..., help="プレビューする電子書籍ファイル"),
    title: Optional[str] = typer.Option(None, "--title", "-t"),
    author: Optional[str] = typer.Option(None, "--author", "-a"),
    no_tcy: bool = typer.Option(False, "--no-tcy"),
    config_file: Optional[Path] = typer.Option(None, "--config"),
    browser: Optional[str] = typer.Option(None, "--browser", help="ブラウザ指定 (例: chrome, firefox)"),
) -> None:
    """AY. 変換後HTMLをブラウザで即時プレビューする"""
    if not input_file.exists():
        console.print(f"[red]ファイルが見つかりません: {input_file}[/red]")
        raise typer.Exit(1)

    import tempfile
    import webbrowser

    from tateyomi.settings import TateyomiConfig
    cfg = TateyomiConfig.load(config_file)
    in_ext = input_file.suffix.lower()

    console.print(f"[cyan]読み込み中: {input_file.name}[/cyan]")
    try:
        book = _parse(input_file, in_ext, False, None)
    except Exception as e:
        from tateyomi.utils.error_messages import format_error
        console.print(f"[red]読み込みエラー: {format_error(e)}[/red]")
        raise typer.Exit(1)

    if title:
        book.title = title
    if author:
        book.author = author

    from tateyomi.transform import text_transform, html_transform
    book = text_transform.transform(book, enable_tcy=not no_tcy and cfg.convert.enable_tcy)
    book = html_transform.transform(book)

    # 一時HTMLファイルに書き出してブラウザで開く
    tmp = tempfile.NamedTemporaryFile(
        suffix=".html", prefix="tateyomi_preview_", delete=False, mode="w", encoding="utf-8"
    )
    tmp_path = Path(tmp.name)
    tmp.close()

    from tateyomi.renderers.html_renderer import render as html_render
    html_render(book, tmp_path)

    console.print(f"[green]プレビューファイル生成: {tmp_path}[/green]")
    console.print("[dim](ブラウザを閉じた後もファイルは残ります。不要なら削除してください)[/dim]")

    if browser:
        try:
            ctrl = webbrowser.get(browser)
            ctrl.open(tmp_path.as_uri())
        except webbrowser.Error:
            console.print(f"[yellow]ブラウザ '{browser}' が見つかりません。デフォルトで開きます[/yellow]")
            webbrowser.open(tmp_path.as_uri())
    else:
        webbrowser.open(tmp_path.as_uri())

    console.print(f"[bold green]ブラウザでプレビューを開きました[/bold green]")


@app.command()
def plugins() -> None:
    """BA. 登録済みプラグイン一覧を表示する"""
    from tateyomi.plugins import list_plugins
    info = list_plugins()

    console.print("[bold]登録済みプラグイン[/bold]")

    console.print("\n[bold cyan]パーサープラグイン:[/bold cyan]")
    if info["parsers"]:
        for name in info["parsers"]:
            console.print(f"  {name}")
    else:
        console.print("  (なし)")

    console.print("\n[bold cyan]レンダラープラグイン:[/bold cyan]")
    if info["renderers"]:
        for name in info["renderers"]:
            console.print(f"  {name}")
    else:
        console.print("  (なし)")

    console.print("\n[bold cyan]変換フック:[/bold cyan]")
    if info["transforms"]:
        for name in info["transforms"]:
            console.print(f"  {name}")
    else:
        console.print("  (なし)")

    console.print("\n[dim]プラグインは pyproject.toml の entry_points で登録できます。[/dim]")
    console.print("[dim]詳細: tateyomi/plugins.py のドキュメントを参照[/dim]")


@app.command()
def web(
    host: str = typer.Option("0.0.0.0", "--host", help="バインドホスト"),
    port: int = typer.Option(8000, "--port", "-p", help="ポート番号"),
    reload: bool = typer.Option(False, "--reload", help="開発用オートリロード"),
) -> None:
    """Web サーバーを起動する (Google ログイン対応会員制サービス)"""
    try:
        import uvicorn
    except ImportError:
        console.print("[red]uvicorn がインストールされていません[/red]")
        console.print("pip install uvicorn[standard] を実行してください")
        raise typer.Exit(1)

    import os
    if not os.environ.get("GOOGLE_CLIENT_ID"):
        console.print("[yellow]警告: GOOGLE_CLIENT_ID が未設定です。[/yellow]")
        console.print("[dim].env ファイルに GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET を設定してください。[/dim]")
    if not os.environ.get("SECRET_KEY"):
        console.print("[yellow]警告: SECRET_KEY が未設定です。本番環境では必ず設定してください。[/yellow]")

    console.print(f"[cyan]tateyomi Web を起動中: http://{host}:{port}[/cyan]")
    uvicorn.run(
        "tateyomi.web.app:app",
        host=host,
        port=port,
        reload=reload,
    )


if __name__ == "__main__":
    app()
