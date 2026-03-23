# -*- mode: python ; coding: utf-8 -*-
"""
tateyomi-gui PyInstaller spec
ダブルクリック起動用 GUI 実行ファイル（コンソールなし）

ビルド方法:
    pyinstaller tateyomi-gui.spec

生成物:
    dist/tateyomi-gui.exe  (Windows)
    dist/tateyomi-gui      (macOS / Linux)
"""
from pathlib import Path

ROOT = Path(SPECPATH)
PKG  = ROOT / "tateyomi"

block_cipher = None

a = Analysis(
    [str(PKG / "gui.py")],
    pathex=[str(ROOT)],
    binaries=[],
    datas=[
        (str(PKG / "assets" / "*.css"), "tateyomi/assets"),
    ],
    hiddenimports=[
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
        "tkinter",
        "tkinter.ttk",
        "tkinter.filedialog",
        "tkinter.scrolledtext",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["weasyprint"],
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
    name="tateyomi-gui",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,   # ウィンドウアプリ: コンソール非表示
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=str(PKG / "assets" / "tateyomi.ico"),
)
