@echo off
rem tateyomi — 電子書籍縦書き変換ツール ランチャー (Windows)
rem
rem ─── コマンド一覧 ──────────────────────────────────────────────────
rem   tateyomi convert  入力ファイル 出力ファイル [オプション]
rem   tateyomi preview  入力ファイル [--browser chrome]
rem   tateyomi info     input.epub
rem   tateyomi check    output.epub [--verbose]
rem   tateyomi meta     book.epub --title "新タイトル" --author "著者名"
rem   tateyomi split    book.epub 出力フォルダ/ [--prefix part]
rem   tateyomi batch    入力フォルダ/ 出力フォルダ/ [--format epub] [--workers 4]
rem   tateyomi config   [--init] [--show]
rem   tateyomi font     [--download] [--list] [--cache-dir]
rem   tateyomi plugins
rem   tateyomi gui
rem   tateyomi version
rem
rem ─── 変換例 ────────────────────────────────────────────────────────
rem   tateyomi convert 原稿.txt    縦書き.epub  --title "こころ" --author "夏目漱石"
rem   tateyomi convert input.epub  output.epub  --embed-font
rem   tateyomi convert input.epub  output.epub  --gen-cover
rem   tateyomi convert input.epub  output.html
rem   tateyomi convert 原稿.md     縦書き.epub
rem   tateyomi convert page.html   縦書き.epub
rem   tateyomi convert input.epub  output.epub  --font-size 1.1em --line-height 2.0
rem   tateyomi convert input.epub  output.epub  --css custom.css --dry-run
rem   tateyomi convert input.epub  output.epub  --auto-ruby
rem   tateyomi convert input.epub  output.epub  --log-file convert.log
rem
rem ─── プレビュー例 ──────────────────────────────────────────────────
rem   tateyomi preview 原稿.txt
rem   tateyomi preview input.epub --browser chrome
rem
rem ─── バッチ変換（並列）────────────────────────────────────────────
rem   tateyomi batch 入力フォルダ/ 出力フォルダ/ --workers 4
rem
rem ─── プラグイン確認 ────────────────────────────────────────────────
rem   tateyomi plugins
rem
rem 詳しいオプションは各コマンドに --help を付けて確認:
rem   tateyomi convert --help
rem   tateyomi batch --help

set PYTHONIOENCODING=utf-8
python -m tateyomi.cli %*
