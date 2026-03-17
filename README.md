# tateyomi — 電子書籍縦書き変換ツール

EPUB・PDF・Word・テキストファイルを日本語伝統の縦書き（右から左）に変換し、
Kindle KDP で出版可能な EPUB3 を生成するツールです。

---

## 特徴

- **EPUB / PDF / Word (.docx) / テキスト**を入力として受け付け
- **EPUB3 (Kindle KDP対応) / PDF / HTML**を出力
- 縦書き CSS (`writing-mode: vertical-rl`) + `page-progression-direction="rtl"`
- **青空文庫形式**自動検出・ルビ（`<ruby>`）変換・注記除去
- **縦中横**（数字・英数字を横組みで表示）自動処理
- 約物の縦書きUnicodeフォーム変換（`、` `。` `「` `」` など）
- **文字コード自動検出**（UTF-8 / Shift-JIS / EUC-JP 対応）
- **Noto Serif CJK JPフォント埋め込み**対応
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
            weasyprint Pillow pydantic typer rich \
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
  INPUT    入力ファイル (.epub / .pdf / .txt / .docx)
  OUTPUT   出力ファイル (.epub / .pdf / .html)

オプション:
  --title TEXT       タイトルを上書き
  --author TEXT      著者名を上書き
  --no-tcy           縦中横（数字横組み）を無効化
  --embed-font       Noto Serif CJKフォントを埋め込む
  --font-dir PATH    埋め込むフォントのディレクトリ
  --verbose          詳細ログを表示
```

**例:**

```bash
# TXT（青空文庫形式）→ EPUB
tateyomi convert kokoro.txt kokoro_tate.epub --title "こころ" --author "夏目漱石"

# EPUB → EPUB（フォント埋め込み）
tateyomi convert input.epub output.epub --embed-font

# EPUB → HTML（PDF用フォールバック）
tateyomi convert input.epub output.html
```

### `batch` — 一括変換

```bash
tateyomi batch 入力フォルダ/ 出力フォルダ/ --format epub
```

`入力フォルダ` 内の `.epub` `.pdf` `.txt` `.docx` を全件変換します。

### `check` — EPUB検証（KDP提出前確認）

```bash
tateyomi check output.epub
tateyomi check output.epub --verbose  # 警告も表示
```

Java がインストールされている場合は **epubcheck** による完全検証、
ない場合は構造チェック（RTL設定・CSS・必須ファイル）を実行します。

### `info` — ファイル情報

```bash
tateyomi info input.epub
```

タイトル・著者・章数・画像数・章一覧を表示します。

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

### `gui` — GUIウィンドウ

```bash
tateyomi gui
# または tateyomi-gui.pyw をダブルクリック
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
   https://www.amazon.co.jp/gp/feature.html?ie=UTF8&docId=3077738029

4. **KDP (Kindle Direct Publishing)** にアップロード
   https://kdp.amazon.co.jp/

---

## 青空文庫ファイルの変換

青空文庫の `.txt` ファイルは Shift-JIS エンコードが多いですが、
tateyomi は**自動検出**して変換します。

```bash
# Shift-JIS の青空文庫テキストをそのまま指定できます
tateyomi convert kokoro_sjis.txt kokoro_tate.epub --title "こころ" --author "夏目漱石"
```

青空文庫記法は自動変換されます:
| 元の記法 | 変換後 |
|---|---|
| `私《わたくし》は` | `<ruby>私<rt>わたくし</rt></ruby>は` |
| `｜夏目漱石《なつめそうせき》` | `<ruby>夏目漱石<rt>なつめそうせき</rt></ruby>` |
| `上　先生と私［＃「...」は大見出し］` | `<h1>上　先生と私</h1>` |
| `［＃「...」に傍点］` | `<em>...</em>` |
| `※外字注記` | （削除） |

---

## プロジェクト構成

```
tateyomi/
├── tateyomi/
│   ├── cli.py                # CLIエントリポイント
│   ├── gui.py                # tkinter GUIウィンドウ
│   ├── config.py             # データモデル (ParsedBook, Chapter, ImageItem)
│   ├── parsers/
│   │   ├── epub_parser.py    # EPUB2/3 パーサー
│   │   ├── pdf_parser.py     # PDF パーサー（複数カラム対応）
│   │   ├── txt_parser.py     # テキスト / 青空文庫パーサー
│   │   └── docx_parser.py    # Word (.docx) パーサー
│   ├── transform/
│   │   ├── text_transform.py # 約物変換・縦中横処理
│   │   └── html_transform.py # writing-mode CSS注入
│   ├── renderers/
│   │   ├── epub3_renderer.py # EPUB3 出力（Kindle KDP対応）
│   │   ├── pdf_renderer.py   # PDF 出力（WeasyPrint）
│   │   └── html_renderer.py  # HTML 出力（base64画像埋め込み）
│   ├── utils/
│   │   ├── aozora.py         # 青空文庫形式プリプロセッサ
│   │   ├── encoding.py       # 文字コード自動検出
│   │   ├── fonts.py          # フォントダウンロード・埋め込み
│   │   ├── char_table.py     # 縦書き約物変換テーブル
│   │   └── image_handler.py  # 画像正規化
│   └── assets/
│       ├── tateyomi.css      # 縦書きCSS（Kindle対応）
│       └── kindle-overrides.css
├── tests/                    # テストスイート（32件）
├── tateyomi.bat              # Windows CLIランチャー
├── tateyomi-gui.bat          # Windows GUIランチャー
└── tateyomi-gui.pyw          # ダブルクリック起動スクリプト
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
| `.epub` | EPUB2 / EPUB3 対応、画像・ルビ保持 |
| `.pdf` | テキスト抽出（スキャンPDF非対応）、複数カラム検出 |
| `.txt` | UTF-8 / Shift-JIS / EUC-JP 自動検出、青空文庫形式対応 |
| `.docx` | Word 2007以降、見出しスタイル・画像対応 |

| 出力 | 備考 |
|---|---|
| `.epub` | EPUB3、Kindle KDP対応 |
| `.pdf` | WeasyPrint 使用（GTK/Pango必要） |
| `.html` | 単一HTML、ブラウザ印刷でPDF化可能 |

---

## ライセンス

MIT License
