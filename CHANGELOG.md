# Changelog

All notable changes to tateyomi are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added

#### 新コマンド
- `tateyomi preview` — 変換後 HTML をブラウザで即時プレビュー（`--browser` でブラウザ指定）
- `tateyomi plugins` — 登録済みプラグイン（パーサー/レンダラー/変換フック）一覧を表示
- `tateyomi split` — EPUB をチャプター単位に分割して複数の EPUB ファイルを生成
- `tateyomi meta` — EPUB のメタデータ（タイトル・著者・言語）を編集
- `tateyomi version` — バージョンと依存ライブラリ情報を表示
- `tateyomi config` — 設定ファイル管理コマンド（`--init` / `--show`）

#### `convert` コマンド新オプション
- `--dry-run` — 変換せず書籍情報のみ表示
- `--font-size` — フォントサイズを直接指定（例: `1.1em`, `14pt`）
- `--line-height` — 行間を直接指定（例: `2.0`）
- `--gen-cover` — タイトル・著者名から表紙画像を自動生成（Pillow で描画）
- `--auto-ruby` — 漢字にルビを自動付与（`fugashi` または `cutlet` が必要）
- `--log-file` — 変換ログをファイルに出力

#### `batch` コマンド新オプション
- `--workers N` — `concurrent.futures.ProcessPoolExecutor` による並列変換
- `--log-file` — バッチ変換ログをファイルに出力

#### 新入力フォーマット
- `.md` (Markdown) — 見出し/リスト/コードブロック/太字/斜体対応、h1 で章分割
- `.html` / `.htm` — HTML ファイル直接入力、BeautifulSoup で本文抽出

#### EPUB3 品質向上
- `nav.xhtml` の landmarks 拡充: frontmatter/bodymatter/backmatter を自動判定して登録
- `epub:type="page-list"` nav を追加（バリデーター通過に必要）
- チャプタータイトルから `epub:type` を自動推定して `<section>` に設定
- `toc.ncx` で h2 見出しをネスト構造の navPoint として展開、`dtb:depth` を自動設定
- 表紙ページ spine に `properties="page-spread-center"` を追加

#### GUI 強化
- 入力フォーマット対応拡張: `.md` / `.html` / `.htm` をドロップ・選択可能
- 「表紙画像を自動生成」チェックボックス追加
- リアルタイム進捗バー: indeterminate（読み込み中）→ determinate（章ごと更新）に切り替え
- 進捗ラベルに現在の変換章タイトルを表示
- エラーメッセージを日本語化（`ja_error()` 経由で表示）

#### インフラ・ツール
- `scripts/bump_version.py` — `patch/minor/major` でバージョンを更新し CHANGELOG を自動更新
- `scripts/publish.sh` / `scripts/publish.bat` — TestPyPI/本番 PyPI 公開スクリプト
- `scripts/benchmark.py` — パース/変換/レンダリング各ステップの時間計測（`--size`/`--repeat`/`--format`）
- `Dockerfile` + `docker-compose.yml` — WeasyPrint/GTK/Noto CJK フォント込みの CLI コンテナ
- `installer/tateyomi-setup.iss` — Inno Setup 6 Windows インストーラースクリプト
- `pyproject.toml`: `dynamic = ["version"]` に変更、バージョン単一ソース化（`tateyomi/__init__.py`）
- `pyproject.toml`: `[tool.ruff]` / `[tool.mypy]` / `[tool.pytest.ini_options]` 設定追加
- CI (`test.yml`): カバレッジレポート (`coverage.xml` / `htmlcov/`) をアーティファクトとして保存
- CI lint ジョブに `mypy` を追加

#### プラグインシステム
- `tateyomi/plugins.py` — `importlib.metadata` entry_points でカスタムパーサー/レンダラー/変換フックを登録可能
- `register_parser()` / `register_renderer()` / `register_transform_hook()` によるプログラム的登録 API

#### ユーティリティ
- `tateyomi/utils/auto_ruby.py` — `fugashi`/`cutlet` によるルビ自動付与
- `tateyomi/utils/cover_gen.py` — Pillow でタイトル/著者を描画した 1600×2560px 表紙画像を生成
- `tateyomi/utils/error_messages.py` — 英語エラーメッセージを日本語に変換
- `tateyomi/utils/logger.py` — `logging` ベースの変換ログファイル出力
- `tateyomi/parsers/md_parser.py` — 標準ライブラリのみの簡易 Markdown パーサー
- `tateyomi/parsers/html_parser.py` — HTML ファイル直接入力パーサー

### Changed
- `tateyomi check` コマンド: ファイルサイズ・画像数・表紙画像・タイトル著者を表示
- `tateyomi info` コマンド: UID・入力形式・画像合計サイズ・大きい画像の警告を追加
- `tateyomi batch`: `.md` / `.html` / `.htm` を変換対象に追加
- `convert` コマンド: 入力形式に `.md` / `.html` / `.htm` を追加
- EPUB → EPUB 変換: 元の横書き CSS リンク・`<style>` ブロックを自動除去し縦書き CSS を注入
- EPUB チャプター HTML: `kindle-overrides.css` / `custom.css` のリンクを自動注入
- `text_transform.transform()` に `progress_cb` コールバックを追加（章ごとの進捗通知）
- `.docx` パーサー: 箇条書き（`<ul>`/`<ol>`）・表（`<table>`）に対応
- 青空文庫パーサー: 割注 `［＃割注］...［＃割注終わり］` → `<span class="warichu">` に変換
- PDF 複数カラム: 日本語右から左の読み順に合わせてカラム順を逆転
- EPUB 内の画像 `src` パスをファイル名ベースで正規化
- `tateyomi-gui.bat`: `pythonw` 優先起動（コンソールウィンドウを開かない）
- `kindle-overrides.css`: html/body への `!important` 縦書き強制、`.tcy` / `ruby` / `em` / `.warichu` / `img` / `table` のスタイル拡充

### Fixed
- `apply_vertical_chars` が `href="..."` などタグ属性内の約物を変換してしまうバグ
- EPUB 変換後にチャプター HTML が `kindle-overrides.css` を参照しないバグ
- EPUB → EPUB 変換後に元の横書き CSS が縦書き CSS より優先されるバグ
- 「第5章　解説」のようなタイトルが backmatter と誤判定されるバグ

---

## [0.1.0] — 2026-01-01

### Added
- 初回リリース
- EPUB2/3, PDF, TXT (青空文庫), DOCX 入力対応
- EPUB3 (Kindle KDP 対応), PDF (WeasyPrint), HTML 出力対応
- 縦書き CSS (`writing-mode: vertical-rl`) + `page-progression-direction="rtl"`
- 青空文庫形式自動検出・ルビ（`<ruby>`）変換・注記除去
- 縦中横（`text-combine-upright: all`）自動処理
- 約物の縦書き Unicode フォーム変換
- 文字コード自動検出（UTF-8 / Shift-JIS / EUC-JP）
- Noto Serif CJK JP フォント埋め込み対応
- `tateyomi check` — EPUB 検証（epubcheck / 簡易チェック）
- `tateyomi info` — ファイル情報表示
- `tateyomi batch` — 一括変換
- `tateyomi font` — フォント管理
- `tateyomi gui` — tkinter GUI
- `tateyomi.toml` 設定ファイル対応
- 画像自動リサイズ（Kindle 推奨 1650×2550px）
- テキスト正規化（NFC、半角カタカナ→全角、連続スペース・改行圧縮）
- カスタム CSS 追加オプション（`--css` / `extra_css_file`）
- 版面設定（フォントサイズ・行間・余白）の CSS 変数注入
- Windows バッチランチャー (`tateyomi.bat`, `tateyomi-gui.bat`)
- テスト 71 件（parsers / renderers / aozora / settings / normalize / image_resize）
