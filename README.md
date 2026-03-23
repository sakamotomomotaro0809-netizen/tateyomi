# tateyomi — 電子書籍縦書き変換ツール

EPUB・PDF・Word・テキストファイルを日本語伝統の縦書き（右から左）に変換し、
Kindle KDP で出版可能な EPUB3 を生成するツールです。

---

## 特徴

- **EPUB / PDF / Word (.docx) / Markdown / HTML / テキスト**を入力として受け付け
- **EPUB3 (Kindle KDP対応) / PDF / HTML**を出力
- 縦書き CSS (`writing-mode: vertical-rl`) + `page-progression-direction="rtl"`
- **青空文庫形式**自動検出・ルビ（`<ruby>`）変換・注記除去・割注対応
- **縦中横**（数字・英数字を横組みで表示）自動処理
- 約物の縦書きUnicodeフォーム変換（`、` `。` `「` `」` など）
- **文字コード自動検出**（UTF-8 / Shift-JIS / EUC-JP 対応）
- **Noto Serif CJK JPフォント埋め込み**対応
- **画像自動リサイズ**（Kindle推奨 1650×2550px）
- **テキスト正規化**（NFC・半角カタカナ→全角・連続スペース圧縮）
- **表紙画像自動生成**（`--gen-cover`、Pillowでタイトル・著者名を描画）
- **`--font-size` / `--line-height`** CLI直接指定
- **カスタムCSS**追加 / **版面設定**（フォントサイズ・行間・余白）
- **EPUB分割** (`tateyomi split`) / **メタデータ編集** (`tateyomi meta`)
- EPUBチェック (`tateyomi check`) による KDP提出前検証
- GUI（tkinter）・CLI・バッチ処理に対応

---

## インストール

```bash
git clone https://github.com/yourname/tateyomi.git
cd tateyomi
python -m pip install -e .
```

### 依存ライブラリ

```bash
pip install ebooklib lxml beautifulsoup4 pdfplumber pypdf \
            weasyprint Pillow typer rich \
            python-docx chardet
```

> **PDF出力**には WeasyPrint の GTK/Pango が必要です（Windowsは別途インストール）。
> GTKなしの場合は自動的にHTMLフォールバックが生成されます。

---

## 使い方

### Windows（ダブルクリック起動）

`tateyomi-gui.pyw` をダブルクリックでGUIが起動します。

### Windows コマンドライン

```bat
tateyomi.bat convert 入力.epub 出力.epub
tateyomi.bat convert 入力.txt  出力.epub --title "書名" --author "著者名"
tateyomi.bat convert 原稿.docx 縦書き.epub
tateyomi.bat convert 原稿.md   縦書き.epub
tateyomi.bat preview 入力.epub
```

### macOS / Linux

```bash
python -m tateyomi.cli convert input.epub output.epub
```

---

## コマンド一覧

### `convert` — 変換

```
tateyomi convert INPUT OUTPUT [OPTIONS]

引数:
  INPUT    入力ファイル (.epub / .pdf / .txt / .docx / .md / .html)
  OUTPUT   出力ファイル (.epub / .pdf / .html)

オプション:
  --title TEXT       タイトルを上書き
  --author TEXT      著者名を上書き
  --no-tcy           縦中横（数字横組み）を無効化
  --embed-font       Noto Serif CJKフォントを埋め込む
  --font-dir PATH    埋め込むフォントのディレクトリ
  --css PATH         追加CSSファイルのパス
  --config PATH      設定ファイル (tateyomi.toml)
  --font-size TEXT   フォントサイズ (例: 1.1em, 14pt)
  --line-height NUM  行間 (例: 2.0)
  --gen-cover        表紙画像を自動生成（Pillowで描画）
  --auto-ruby        漢字にルビを自動付与（fugashi/cutlet 必要）
  --log-file PATH    変換ログをファイルに出力
  --dry-run          変換せず書籍情報のみ表示
  --verbose          詳細ログを表示
```

**例:**

```bash
# TXT（青空文庫形式）→ EPUB
tateyomi convert kokoro.txt kokoro_tate.epub --title "こころ" --author "夏目漱石"

# Markdown → EPUB
tateyomi convert 原稿.md 縦書き.epub

# EPUB → EPUB（フォント埋め込み + 表紙自動生成）
tateyomi convert input.epub output.epub --embed-font --gen-cover

# EPUB → HTML（ブラウザ印刷でPDF化可能）
tateyomi convert input.epub output.html

# フォントサイズ・行間を直接指定
tateyomi convert input.epub output.epub --font-size 1.1em --line-height 2.0

# 変換前に書籍情報を確認
tateyomi convert input.epub output.epub --dry-run

# ルビ自動付与（要 fugashi または cutlet）
tateyomi convert input.epub output.epub --auto-ruby

# 変換ログを残す
tateyomi convert input.epub output.epub --log-file convert.log
```

### `info` — ファイル情報

```bash
tateyomi info input.epub
```

タイトル・著者・章数・画像数・表紙画像・画像合計サイズなどを表示します。

### `check` — EPUB検証（KDP提出前確認）

```bash
tateyomi check output.epub
tateyomi check output.epub --verbose  # 警告も表示
```

Java がインストールされている場合は **epubcheck** による完全検証、
ない場合は構造チェック（RTL設定・CSS・必須ファイル・画像サイズ）を実行します。

### `meta` — メタデータ編集

```bash
# タイトルと著者を変更（上書き）
tateyomi meta book.epub --title "新しいタイトル" --author "著者名"

# 別ファイルに保存
tateyomi meta book.epub --title "新タイトル" --output book_updated.epub

# 言語コードを変更
tateyomi meta book.epub --lang en
```

### `split` — EPUB分割

```bash
# チャプター単位に分割
tateyomi split book.epub output/

# プレフィックスを指定
tateyomi split book.epub output/ --prefix part
# → output/part_001.epub, part_002.epub, ...
```

### `config` — 設定管理

```bash
# tateyomi.toml をカレントディレクトリに生成
tateyomi config --init

# 現在の設定を表示
tateyomi config --show
```

### `preview` — ブラウザプレビュー

```bash
# 変換後HTMLをデフォルトブラウザで即時プレビュー
tateyomi preview input.epub

# ブラウザを指定
tateyomi preview input.epub --browser chrome
tateyomi preview 原稿.md    --browser firefox
```

### `batch` — 一括変換

```bash
tateyomi batch 入力フォルダ/ 出力フォルダ/ --format epub

# 並列変換（4ワーカー）
tateyomi batch 入力フォルダ/ 出力フォルダ/ --workers 4

# ログ出力付き
tateyomi batch 入力フォルダ/ 出力フォルダ/ --log-file batch.log
```

`入力フォルダ` 内の `.epub` `.pdf` `.txt` `.docx` `.md` `.html` を全件変換します。

### `font` — フォント管理

```bash
# Noto Serif CJK JP をダウンロード（約40MB）
tateyomi font --download

# キャッシュ済みフォントを確認
tateyomi font --list

# キャッシュディレクトリを表示
tateyomi font --cache-dir
```

フォントをダウンロード後、`convert --embed-font` で埋め込めます。

### `plugins` — プラグイン一覧

```bash
tateyomi plugins
```

外部パッケージで追加したパーサー/レンダラー/変換フックを表示します。
プラグインは `pyproject.toml` の `entry_points` で登録できます。

```toml
[project.entry-points."tateyomi.parsers"]
myformat = "mypkg.parser:MyParser"
```

### `gui` — GUIウィンドウ

```bash
tateyomi gui
# または tateyomi-gui.pyw をダブルクリック
```

---

## 設定ファイル (tateyomi.toml)

```bash
# 設定ファイルを生成
tateyomi config --init
```

生成された `tateyomi.toml` を編集して版面・変換設定をカスタマイズできます。

```toml
[layout]
line_height    = 1.8    # 行間
font_size      = "1em"  # 基本フォントサイズ
margin_block   = "15mm" # 上下余白
margin_inline  = "20mm" # 左右余白
chars_hint     = 0      # 一行の目安字数 (0=自動)

[convert]
enable_tcy     = true   # 縦中横
normalize_text = true   # テキスト正規化
resize_images  = true   # 画像リサイズ
# extra_css_file = "custom.css"   # 追加CSSファイル
# font_dir       = ""             # フォントディレクトリ
```

---

## Kindle KDP での出版手順

1. 変換を実行:
   ```bash
   tateyomi convert 原稿.epub 縦書き.epub --embed-font
   ```

2. 検証:
   ```bash
   tateyomi check 縦書き.epub
   ```

3. **Kindle Previewer 3** で表示確認

4. **KDP (Kindle Direct Publishing)** にアップロード

---

## 青空文庫ファイルの変換

青空文庫の `.txt` ファイルは Shift-JIS エンコードが多いですが、
tateyomi は**自動検出**して変換します。

```bash
tateyomi convert kokoro_sjis.txt kokoro_tate.epub --title "こころ" --author "夏目漱石"
```

青空文庫記法は自動変換されます:

| 元の記法 | 変換後 |
|---|---|
| `私《わたくし》は` | `<ruby>私<rt>わたくし</rt></ruby>は` |
| `｜夏目漱石《なつめそうせき》` | `<ruby>夏目漱石<rt>なつめそうせき</rt></ruby>` |
| `上　先生と私［＃「...」は大見出し］` | `<h1>上　先生と私</h1>` |
| `［＃「...」に傍点］` | `<em>...</em>` |
| `［＃割注］注釈内容［＃割注終わり］` | `<span class="warichu">注釈内容</span>` |
| `※外字注記` | （削除） |

---

## プロジェクト構成

```
tateyomi/
├── tateyomi/
│   ├── cli.py                # CLIエントリポイント (9コマンド)
│   ├── gui.py                # tkinter GUIウィンドウ（詳細設定ダイアログ付き）
│   ├── config.py             # データモデル (ParsedBook, Chapter, ImageItem)
│   ├── settings.py           # 設定ファイル管理 (tateyomi.toml)
│   ├── parsers/
│   │   ├── epub_parser.py    # EPUB2/3 パーサー（CSS除去・画像パス正規化）
│   │   ├── pdf_parser.py     # PDF パーサー（複数カラム右→左対応）
│   │   ├── txt_parser.py     # テキスト / 青空文庫パーサー
│   │   └── docx_parser.py    # Word (.docx) パーサー（リスト・表対応）
│   ├── transform/
│   │   ├── text_transform.py # 約物変換・縦中横・テキスト正規化
│   │   └── html_transform.py # writing-mode CSS注入
│   ├── renderers/
│   │   ├── epub3_renderer.py # EPUB3 出力（Kindle KDP対応・CSS自動注入）
│   │   ├── pdf_renderer.py   # PDF 出力（WeasyPrint）
│   │   └── html_renderer.py  # HTML 出力（base64画像埋め込み）
│   ├── utils/
│   │   ├── aozora.py         # 青空文庫形式プリプロセッサ（割注対応）
│   │   ├── encoding.py       # 文字コード自動検出
│   │   ├── fonts.py          # フォントダウンロード・埋め込み
│   │   ├── char_table.py     # 縦書き約物変換テーブル（タグセーフ）
│   │   ├── image_handler.py  # 画像正規化
│   │   ├── image_resize.py   # Kindle推奨サイズへの自動リサイズ
│   │   └── normalize.py      # テキスト正規化（NFC・半角→全角）
│   └── assets/
│       ├── tateyomi.css      # 縦書きCSS（Kindle対応・傍点・割注）
│       └── kindle-overrides.css
├── tests/                    # テストスイート（130件以上）
├── .github/workflows/test.yml # GitHub Actions CI
├── tateyomi.spec             # PyInstaller CLI spec
├── tateyomi-gui.spec         # PyInstaller GUI spec
├── build-exe.bat             # exe ビルドスクリプト
├── tateyomi.bat              # Windows CLIランチャー
├── tateyomi-gui.bat          # Windows GUIランチャー
├── tateyomi-gui.pyw          # ダブルクリック起動スクリプト
└── CHANGELOG.md
```

---

## 技術仕様

### EPUB3 縦書き設定

```css
/* tateyomi.css */
html, body {
  writing-mode: vertical-rl;
  -webkit-writing-mode: vertical-rl;
  -epub-writing-mode: vertical-rl;
  text-orientation: mixed;
}
```

```xml
<!-- content.opf -->
<spine toc="ncx" page-progression-direction="rtl">
  <itemref idref="chapter001" linear="yes"/>
</spine>
<meta property="primary-writing-mode">vertical-rl</meta>
```

### 対応フォーマット

| 入力 | 備考 |
|---|---|
| `.epub` | EPUB2 / EPUB3 対応、画像・ルビ保持、元CSS除去 |
| `.pdf` | テキスト抽出（スキャンPDF非対応）、複数カラム右→左対応 |
| `.txt` | UTF-8 / Shift-JIS / EUC-JP 自動検出、青空文庫形式対応 |
| `.docx` | Word 2007以降、見出し・箇条書き・番号付きリスト・表対応 |
| `.md` | Markdownパーサー、見出し/リスト/コードブロック/太字/斜体対応 |
| `.html` / `.htm` | HTML直接入力、BeautifulSoupで本文抽出 |

| 出力 | 備考 |
|---|---|
| `.epub` | EPUB3、Kindle KDP対応 |
| `.pdf` | WeasyPrint 使用（GTK/Pango必要） |
| `.html` | 単一HTML、ブラウザ印刷でPDF化可能 |

---

## ライセンス

MIT License
