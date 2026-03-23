#!/usr/bin/env python3
"""
BD. ベンチマーク — 変換時間計測スクリプト

使い方:
  python scripts/benchmark.py                        # デモテキストで計測
  python scripts/benchmark.py input.epub             # 実ファイルで計測
  python scripts/benchmark.py input.epub --repeat 5  # 5回繰り返して平均
  python scripts/benchmark.py --size large           # 大きなテストデータ (10万字)
"""
from __future__ import annotations
import sys
import time
import tempfile
import argparse
from pathlib import Path


def _generate_test_text(size: str = "medium") -> str:
    """テスト用テキストを生成する"""
    sizes = {"small": 100, "medium": 1000, "large": 10000, "xlarge": 50000}
    n_paragraphs = sizes.get(size, 1000)

    lines = ["ベンチマークテスト書籍\n著者名\n"]
    chapter_interval = max(n_paragraphs // 10, 1)
    for i in range(n_paragraphs):
        if i % chapter_interval == 0:
            ch_num = i // chapter_interval + 1
            lines.append(f"\n第{ch_num}章\n\n")
        lines.append(
            f"これはベンチマーク用のテスト文章です。段落{i + 1}。"
            f"日本語テキストの縦書き変換速度を計測します。"
            f"漢字ひらがなカタカナ混じりの文章です。12345 ABC。\n"
        )
    return "".join(lines)


def benchmark_convert(input_path: Path, output_ext: str = ".epub",
                      repeat: int = 3, verbose: bool = False) -> dict:
    """変換ベンチマークを実行して結果を返す"""
    from tateyomi.parsers.txt_parser import TxtParser
    from tateyomi.parsers.epub_parser import EpubParser
    from tateyomi.transform import text_transform, html_transform
    from tateyomi.renderers.epub3_renderer import render as epub_render
    from tateyomi.renderers.html_renderer import render as html_render

    ext = input_path.suffix.lower()

    times_parse: list[float] = []
    times_transform: list[float] = []
    times_render: list[float] = []
    n_chapters = 0

    for run in range(repeat):
        # パース
        t0 = time.perf_counter()
        if ext == ".epub":
            book = EpubParser().parse(input_path)
        else:
            book = TxtParser().parse(input_path)
        t1 = time.perf_counter()
        times_parse.append(t1 - t0)
        n_chapters = len(book.chapters)

        # 変換
        t0 = time.perf_counter()
        book = text_transform.transform(book, enable_tcy=True, normalize=True)
        book = html_transform.transform(book)
        t1 = time.perf_counter()
        times_transform.append(t1 - t0)

        # レンダリング
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / f"out{output_ext}"
            t0 = time.perf_counter()
            if output_ext == ".epub":
                epub_render(book, out)
            else:
                html_render(book, out)
            t1 = time.perf_counter()
            times_render.append(t1 - t0)
            out_size = out.stat().st_size if out.exists() else 0

        if verbose:
            total = times_parse[-1] + times_transform[-1] + times_render[-1]
            print(f"  Run {run + 1}/{repeat}: {total:.3f}s "
                  f"(parse={times_parse[-1]:.3f}s, "
                  f"transform={times_transform[-1]:.3f}s, "
                  f"render={times_render[-1]:.3f}s)")

    def avg(lst):
        return sum(lst) / len(lst)

    return {
        "input": input_path.name,
        "output_ext": output_ext,
        "n_chapters": n_chapters,
        "input_size_kb": input_path.stat().st_size // 1024,
        "output_size_kb": out_size // 1024,
        "repeat": repeat,
        "parse_avg": avg(times_parse),
        "transform_avg": avg(times_transform),
        "render_avg": avg(times_render),
        "total_avg": avg(times_parse) + avg(times_transform) + avg(times_render),
        "parse_min": min(times_parse),
        "total_min": min(t1 + t2 + t3 for t1, t2, t3 in
                         zip(times_parse, times_transform, times_render)),
    }


def print_results(r: dict) -> None:
    print(f"\n{'='*55}")
    print(f"  ベンチマーク結果: {r['input']}")
    print(f"{'='*55}")
    print(f"  入力サイズ    : {r['input_size_kb']:,} KB")
    print(f"  出力サイズ    : {r['output_size_kb']:,} KB  ({r['output_ext']})")
    print(f"  章数          : {r['n_chapters']}")
    print(f"  繰り返し回数  : {r['repeat']}")
    print(f"")
    print(f"  ┌{'─'*35}┬{'─'*10}┐")
    print(f"  │ ステップ                          │ 平均(s)  │")
    print(f"  ├{'─'*35}┼{'─'*10}┤")
    print(f"  │ パース                            │ {r['parse_avg']:>8.3f} │")
    print(f"  │ 変換 (縦中横・約物・正規化)       │ {r['transform_avg']:>8.3f} │")
    print(f"  │ レンダリング                      │ {r['render_avg']:>8.3f} │")
    print(f"  ├{'─'*35}┼{'─'*10}┤")
    print(f"  │ 合計 (平均)                       │ {r['total_avg']:>8.3f} │")
    print(f"  │ 合計 (最速)                       │ {r['total_min']:>8.3f} │")
    print(f"  └{'─'*35}┴{'─'*10}┘")
    if r['n_chapters'] > 0:
        per_ch = r['total_avg'] / r['n_chapters']
        print(f"\n  1章あたり平均 : {per_ch*1000:.1f} ms")
    print()


def main() -> None:
    parser = argparse.ArgumentParser(description="tateyomi ベンチマーク")
    parser.add_argument("input", nargs="?", help="入力ファイル (省略時はデモテキストを使用)")
    parser.add_argument("--repeat", "-r", type=int, default=3, help="繰り返し回数 (デフォルト: 3)")
    parser.add_argument("--size", choices=["small", "medium", "large", "xlarge"],
                        default="medium", help="デモテキストのサイズ")
    parser.add_argument("--format", "-f", choices=["epub", "html"],
                        default="epub", help="出力形式")
    parser.add_argument("--verbose", "-v", action="store_true", help="各ランの詳細を表示")
    args = parser.parse_args()

    if args.input:
        input_path = Path(args.input)
        if not input_path.exists():
            print(f"エラー: ファイルが見つかりません: {input_path}", file=sys.stderr)
            sys.exit(1)
    else:
        # デモテキスト生成
        print(f"デモテキストを生成中 (size={args.size})...")
        demo_text = _generate_test_text(args.size)
        f = tempfile.NamedTemporaryFile(
            suffix=".txt", mode="w", encoding="utf-8", delete=False
        )
        f.write(demo_text)
        f.close()
        input_path = Path(f.name)
        print(f"  生成完了: {len(demo_text):,} 文字, {input_path.stat().st_size // 1024} KB")

    try:
        print(f"\n計測中 (repeat={args.repeat})...")
        results = benchmark_convert(
            input_path,
            output_ext=f".{args.format}",
            repeat=args.repeat,
            verbose=args.verbose,
        )
        print_results(results)
    finally:
        if not args.input:
            input_path.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
