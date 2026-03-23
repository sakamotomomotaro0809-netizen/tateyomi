"""
青空文庫テキスト形式プリプロセッサ
- ルビ記号 《》 / ｜ → <ruby> HTML変換
- ［＃...］ 注記 → 見出し / 傍点 / 無視 に変換
- メタデータブロック（冒頭説明部）除去
- 文字コード正規化
"""
from __future__ import annotations
import re

# ─── ルビ変換 ────────────────────────────────────────────
# パターン1: ｜漢字《ルビ》
_RUBY_PIPE = re.compile(r"｜([^《\n]+)《([^》]+)》")
# パターン2: 漢字列《ルビ》（｜なし：直前の漢字連続にルビ付与）
_RUBY_AUTO = re.compile(r"([\u4e00-\u9fff\u3400-\u4dbf々〆〇ヶ]+)《([^》]+)》")


def _ruby_to_html(text: str) -> str:
    text = _RUBY_PIPE.sub(r"<ruby>\1<rt>\2</rt></ruby>", text)
    text = _RUBY_AUTO.sub(r"<ruby>\1<rt>\2</rt></ruby>", text)
    return text


# ─── 青空注記 ［＃...］ ────────────────────────────────────
# 大見出し・中見出し・小見出し検出（全角数字も対応: [0-9０-９]+）
_DIGIT = r"[0-9０-９]+"
_HEADING_BIG = re.compile(rf"(?:［＃{_DIGIT}字下げ］)?(.+?)(?:［＃「.+?」は大見出し］)")
_HEADING_MID = re.compile(rf"(?:［＃{_DIGIT}字下げ］)?(.+?)(?:［＃「.+?」は中見出し］)")
_HEADING_SML = re.compile(rf"(?:［＃{_DIGIT}字下げ］)?(.+?)(?:［＃「.+?」は小見出し］)")
# 字下げ単体（全角数字も対応）
_INDENT = re.compile(rf"［＃{_DIGIT}字下げ］")
# 傍点（後処理: em タグ）
_BOUTEN_START = re.compile(r"［＃「([^」]+)」に傍点］")
# 割注 → <span class="warichu">
_WARICHU = re.compile(r"［＃割注］(.+?)［＃割注終わり］", re.DOTALL)
# 青空文庫スタイルの注記: （注：内容） → インライン脚注
_INLINE_NOTE = re.compile(r"（注：([^）]+)）")
# その他の注記・外字をすべて除去
_ANNOTATION = re.compile(r"［＃[^\]]*］")
# ※ 外字記号
_GAIJI = re.compile(r"※[^　\n]*")


def _process_annotations(line: str) -> tuple[str, str]:
    """
    1行を受け取り (html_line, heading_level) を返す。
    heading_level: "" / "h1" / "h2" / "h3"
    """
    # 大見出し
    m = _HEADING_BIG.search(line)
    if m:
        title = m.group(1).strip()
        return _ruby_to_html(_clean(title)), "h1"

    m = _HEADING_MID.search(line)
    if m:
        title = m.group(1).strip()
        return _ruby_to_html(_clean(title)), "h2"

    m = _HEADING_SML.search(line)
    if m:
        title = m.group(1).strip()
        return _ruby_to_html(_clean(title)), "h3"

    # 割注 → <span class="warichu">
    line = _WARICHU.sub(r'<span class="warichu">\1</span>', line)

    # 青空注記（注：内容）→ インライン脚注
    line = _INLINE_NOTE.sub(
        r'<span class="fn-inline" role="doc-footnote">（注：\1）</span>', line
    )

    # 傍点 → <em>
    line = _BOUTEN_START.sub(r"<em>\1</em>", line)

    # 字下げ → text-indent スタイルで再現（HTML変換時に使用）
    line = _INDENT.sub("", line)

    # その他注記・外字を除去
    line = _ANNOTATION.sub("", line)
    line = _GAIJI.sub("", line)

    return _ruby_to_html(line), ""


def _clean(text: str) -> str:
    """残存する記号を除去"""
    text = _ANNOTATION.sub("", text)
    text = _GAIJI.sub("", text)
    return text.strip()


# ─── メタデータブロック除去 ───────────────────────────────

_META_END_PATTERNS = [
    re.compile(r"^-{5,}"),
    re.compile(r"底本："),
    re.compile(r"入力："),
    re.compile(r"校正："),
    re.compile(r"^\d{4}（"),  # 年号行
    re.compile(r"^【テキスト中"),
]


def strip_aozora_meta(lines: list[str]) -> tuple[str, str, list[str]]:
    """
    青空文庫テキストのメタデータ部を除去し、
    (title, author, 本文行リスト) を返す
    """
    title = ""
    author = ""
    body_start = 0

    # 冒頭からタイトル・著者を抽出（最初の実質的な行2行）
    real_lines = [l.rstrip() for l in lines]
    content_lines = [l for l in real_lines if l.strip()]

    if content_lines:
        title = content_lines[0].strip()
    if len(content_lines) > 1:
        author_candidate = content_lines[1].strip()
        # 著者行は「○○著」「○○ 作」「○○訳」のような短い行
        if len(author_candidate) < 30 and "著" not in author_candidate[:1]:
            author = author_candidate

    # 最後の区切り線以降（底本情報）を除去
    last_separator = -1
    for i, line in enumerate(real_lines):
        if re.match(r"^-{5,}", line.strip()):
            last_separator = i

    if last_separator > 0:
        # 最初の区切り線より後を本文とする
        # (末尾20行以内の区切り線は末尾情報除去で対応するためここでは無条件に使用)
        body_lines = real_lines[last_separator + 1:]
    else:
        body_lines = real_lines

    # 末尾の底本情報を除去
    end_cut = len(body_lines)
    for i in range(len(body_lines) - 1, max(0, len(body_lines) - 50), -1):
        line = body_lines[i].strip()
        for pat in _META_END_PATTERNS:
            if pat.search(line):
                end_cut = i
                break

    body_lines = body_lines[:end_cut]

    return title, author, body_lines


# ─── メインの変換関数 ─────────────────────────────────────

class AozoraBlock:
    """変換後のブロック単位"""
    def __init__(self, kind: str, content: str):
        self.kind = kind      # "h1" / "h2" / "h3" / "p"
        self.content = content


def parse_aozora(text: str) -> tuple[str, str, list[AozoraBlock]]:
    """
    青空文庫テキストを解析し (title, author, blocks) を返す
    """
    # 割注（複数行にまたがる場合）を前処理
    text = _WARICHU.sub(r'<span class="warichu">\1</span>', text)
    lines = text.splitlines()
    title, author, body_lines = strip_aozora_meta(lines)

    blocks: list[AozoraBlock] = []
    pending_para: list[str] = []

    def flush_para():
        if pending_para:
            content = "<br/>".join(l for l in pending_para if l)
            if content.strip():
                blocks.append(AozoraBlock("p", content))
            pending_para.clear()

    for line in body_lines:
        stripped = line.rstrip()

        if stripped == "":
            flush_para()
            continue

        html_line, heading = _process_annotations(stripped)
        html_line = html_line.strip()

        if not html_line:
            continue

        if heading:
            flush_para()
            blocks.append(AozoraBlock(heading, html_line))
        else:
            pending_para.append(html_line)

    flush_para()
    return title, author, blocks
