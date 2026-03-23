"""
エラーメッセージの日本語化
英語の技術的エラーメッセージをユーザーフレンドリーな日本語に変換する。
"""
from __future__ import annotations
import re

# (正規表現パターン, 日本語メッセージ) のリスト
_PATTERNS: list[tuple[str, str]] = [
    # ファイル系
    (r"[Nn]o such file or directory[:\s]*(.+)",
     "ファイルが見つかりません: \\1"),
    (r"[Pp]ermission denied[:\s]*(.+)",
     "ファイルへのアクセスが拒否されました: \\1"),
    (r"[Ff]ile not found[:\s]*(.+)",
     "ファイルが見つかりません: \\1"),
    (r"[Ii]s a directory[:\s]*(.+)",
     "ファイルではなくディレクトリが指定されました: \\1"),
    (r"[Ff]ile too large",
     "ファイルサイズが大きすぎます"),
    (r"[Dd]isk quota exceeded",
     "ディスク容量が不足しています"),
    (r"[Nn]o space left on device",
     "ディスクに空き容量がありません"),

    # EPUB 系
    (r"[Bb]ad zip.*file",
     "EPUBファイルが壊れているか、有効なZIPファイルではありません"),
    (r"[Ii]nvalid epub",
     "有効なEPUBファイルではありません"),
    (r"[Cc]ontainer\.xml.*not found",
     "EPUBのcontainer.xmlが見つかりません（壊れたEPUBファイルの可能性があります）"),
    (r"opf.*not found",
     "EPUBのcontent.opfが見つかりません"),
    (r"spine.*empty",
     "EPUBのspineが空です（章が含まれていません）"),

    # PDF 系
    (r"[Pp][Dd][Ff].*[Ee]ncrypt",
     "PDFファイルは暗号化されています（パスワード保護されたPDFは対応していません）"),
    (r"[Pp][Dd][Ff].*[Pp]assword",
     "PDFファイルにはパスワードが設定されています"),
    (r"[Pp][Dd][Ff][Mm]iner.*[Ee]rror",
     "PDFの解析に失敗しました（テキスト抽出できないPDFの可能性があります）"),
    (r"[Ss]can.*[Pp][Dd][Ff]",
     "スキャンPDF（画像PDF）はテキスト抽出に対応していません"),

    # エンコーディング系
    (r"[Uu]nicode.*[Ee]ncode.*[Ee]rror",
     "文字コードの変換に失敗しました（--verbose オプションで詳細を確認してください）"),
    (r"[Cc]odec.*can.*encode",
     "対応していない文字が含まれています"),
    (r"'(utf-?8|utf_8|cp932|shift.?jis)'.*codec",
     "文字コード '\\1' での変換に失敗しました"),

    # ネットワーク系
    (r"[Cc]onnection.*[Rr]efused",
     "接続が拒否されました（ネットワーク設定を確認してください）"),
    (r"[Tt]imeout",
     "接続タイムアウトが発生しました"),

    # メモリ系
    (r"[Mm]emory[Ee]rror|[Oo]ut of memory",
     "メモリ不足です（ファイルサイズを小さくするか、不要なアプリを閉じてください）"),

    # PIL/Pillow 系
    (r"[Cc]annot identify image file",
     "画像ファイルを認識できません（壊れた画像の可能性があります）"),
    (r"[Ii]mage.*[Tt]oo.*[Ll]arge",
     "画像サイズが大きすぎます"),

    # WeasyPrint/GTK 系
    (r"[Cc]annot load.*pango|[Gg][Tt][Kk].*not.*found|[Gg][Tt][Kk].*[Ee]rror",
     "GTK/Pangoが見つかりません（PDF出力にはGTKのインストールが必要です。代わりにHTMLファイルを生成できます）"),

    # Java/epubcheck 系
    (r"[Jj]ava.*not.*found|[Cc]annot.*find.*java",
     "Javaが見つかりません（epubcheck完全検証にはJavaのインストールが必要です）"),

    # 汎用
    (r"[Mm]odule.*not.*found.*'([^']+)'",
     "パッケージ '\\1' がインストールされていません（pip install \\1 を実行してください）"),
    (r"[Nn]o module named '([^']+)'",
     "パッケージ '\\1' がインストールされていません（pip install \\1 を実行してください）"),
]

_COMPILED = [(re.compile(pat, re.IGNORECASE), rep) for pat, rep in _PATTERNS]


def ja_error(exc: Exception) -> str:
    """例外を日本語のユーザーフレンドリーなメッセージに変換する"""
    msg = str(exc)
    for pattern, replacement in _COMPILED:
        m = pattern.search(msg)
        if m:
            try:
                return pattern.sub(replacement, msg, count=1)
            except re.error:
                return replacement
    return msg


def format_error(exc: Exception, verbose: bool = False) -> str:
    """CLIで表示するエラーメッセージを構築する"""
    ja = ja_error(exc)
    if verbose and ja != str(exc):
        return f"{ja}\n  [dim](詳細: {exc})[/dim]"
    return ja
