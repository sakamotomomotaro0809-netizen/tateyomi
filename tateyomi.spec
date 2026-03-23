# -*- mode: python ; coding: utf-8 -*-
"""
tateyomi PyInstaller spec
Windows/macOS/Linux 単一実行ファイルを生成する

ビルド方法:
    pip install pyinstaller
    pyinstaller tateyomi.spec

生成物:
    dist/tateyomi.exe  (Windows)
    dist/tateyomi      (macOS / Linux)
"""
from pathlib import Path

# プロジェクトルート
ROOT = Path(SPECPATH)
PKG  = ROOT / "tateyomi"

block_cipher = None

a = Analysis(
    [str(PKG / "cli.py")],
    pathex=[str(ROOT)],
    binaries=[],
    datas=[
        # CSS アセット
        (str(PKG / "assets" / "*.css"), "tateyomi/assets"),
    ],
    hiddenimports=[
        # パーサー / レンダラーは動的 import なので明示
        "tateyomi.parsers.epub_parser",
        "tateyomi.parsers.pdf_parser",
        "tateyomi.parsers.txt_parser",
        "tateyomi.parsers.docx_parser",
        "tateyomi.renderers.epub3_renderer",
        "tateyomi.renderers.pdf_renderer",
        "tateyomi.renderers.html_renderer",
        "tateyomi.transform.text_transform",
        "tateyomi.transform.html_transform",
        "tateyomi.utils.aozora",
        "tateyomi.utils.encoding",
        "tateyomi.utils.fonts",
        "tateyomi.utils.char_table",
        "tateyomi.utils.image_resize",
        "tateyomi.utils.normalize",
        "tateyomi.settings",
        "tateyomi.gui",
        # 依存ライブラリ
        "ebooklib",
        "pdfplumber",
        "pypdf",
        "docx",
        "chardet",
        "lxml",
        "lxml.etree",
        "bs4",
        "PIL",
        "PIL.Image",
        "rich",
        "typer",
        "tomllib",
        "tomli",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        "weasyprint",  # GTK依存のため除外（HTML出力でフォールバック）
        "tkinter",     # GUI版は別 spec で管理
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="tateyomi",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # CLI ツールなのでコンソール表示
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=str(PKG / "assets" / "tateyomi.ico"),
)
