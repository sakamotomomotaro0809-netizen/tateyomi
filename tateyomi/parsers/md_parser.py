"""
Markdownパーサー
Markdown (.md) を ParsedBook に変換する。
依存: 標準ライブラリのみ（markdown パッケージがあれば利用、なければ簡易パーサーを使用）
"""
from __future__ import annotations
import re
import uuid
from pathlib import Path

from tateyomi.config import ParsedBook, Chapter, ImageItem
from tateyomi.parsers.base import BaseParser


# ── 画像 ![alt](path) ────────────────────────────────────────────────
#
# 2026-08-24: それまで md からの画像は**黙って消えていた**。
#   ![alt](path) が [text](url) のリンク規則に食われ、本文には "!" と alt だけが
#   残っていた。しかも変換後の表示は「画像数 1」（表紙のぶん）と出るので、
#   入ったつもりで気づけない。docx と epub のパーサーには画像対応があるのに、
#   md だけ無かった。集客マンガを本の冒頭に入れようとして判明した。
#
# 生の <img> を書いても通らない（HTMLはエスケープされる）ので、ここで対応する。

IMG_MD = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")
IMG_TOKEN = "\x00IMG{}\x00"          # 本文には出ない文字で囲む
_EXT_MEDIA = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp",
}


def _extract_images(raw: str, base_dir: Path) -> tuple[str, list[ImageItem], list[str]]:
    """![alt](path) を拾い、本文をプレースホルダに置き換える。

    画像ファイルは Markdown からの相対パスで探す。見つからないものは
    **落とさずに例外にする**。黙って消えるのが今回の元凶だったため、
    「入っているつもりで入っていない」状態を二度と作らない。
    戻り値: (置き換え後のテキスト, ImageItem のリスト, alt のリスト)
    """
    images: list[ImageItem] = []
    alts: list[str] = []
    missing: list[str] = []

    def repl(m: re.Match) -> str:
        alt, src = m.group(1), m.group(2).strip()
        if re.match(r"https?://", src):
            # 外部URLの画像はEPUBに同梱できない（読者の端末は通信しない）
            missing.append(f"{src} (外部URLはEPUBに入れられません)")
            return m.group(0)
        p = (base_dir / src).resolve()
        if not p.is_file():
            missing.append(f"{src} (見つかりません: {p})")
            return m.group(0)
        ext = p.suffix.lower()
        media = _EXT_MEDIA.get(ext)
        if not media:
            missing.append(f"{src} (対応していない形式: {ext})")
            return m.group(0)
        idx = len(images) + 1
        href = f"Images/md_img{idx:03d}{ext}"
        images.append(ImageItem(
            item_id=f"md-img-{idx:03d}",
            href=href,
            media_type=media,
            data=p.read_bytes(),
        ))
        alts.append(alt)
        return IMG_TOKEN.format(idx)

    out = IMG_MD.sub(repl, raw)
    if missing:
        raise FileNotFoundError(
            "Markdown の画像を読み込めませんでした:\n  " + "\n  ".join(missing)
            + "\nパスは Markdown ファイルからの相対で書いてください。"
        )
    return out, images, alts


def _tokens_to_img(html: str, images: list[ImageItem], alts: list[str]) -> str:
    """プレースホルダを <img> に戻す。エスケープ後に行うこと。"""
    def repl(m: re.Match) -> str:
        i = int(m.group(1)) - 1
        if i < 0 or i >= len(images):
            return ""
        alt = _escape_html(alts[i]) if i < len(alts) else ""
        return f'<img src="../{images[i].href}" alt="{alt}" />'
    return re.sub(r"\x00IMG(\d+)\x00", repl, html)


def _escape_html(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


# ── 簡易 Markdown → HTML 変換 ─────────────────────────────────────────

def _inline(text: str) -> str:
    """インライン要素変換: **bold**, *italic*, `code`, [link](url), ![alt](画像)"""
    # ![alt](path) は、この関数より前に _extract_images() が
    # プレースホルダ（IMG_TOKEN）へ置き換えている。ここでは何もしない。
    # ★ リンク規則より前に処理しないと ![alt](path) の [alt](path) 部分だけが
    #   食われて、"!" + alt だけが本文に残り、画像は黙って消える。実際にそうなっていた。
    # `code`
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    # **bold** / __bold__
    text = re.sub(r"\*\*(.+?)\*\*|__(.+?)__", lambda m: f"<strong>{m.group(1) or m.group(2)}</strong>", text)
    # *italic* / _italic_
    text = re.sub(r"\*(.+?)\*|_(.+?)_", lambda m: f"<em>{m.group(1) or m.group(2)}</em>", text)
    # [text](url) → http(s) は <a> にする。それ以外は従来どおりテキストだけ残す。
    #
    # 2026-08-20: 以前はURLを捨てていた（「EPUB内でURLは意味をなさない」という前提）。
    #   実際には Kindle はハイパーリンクに対応していて、この前提のせいで巻末CTAの
    #   導線が切れていた。本にはURLが文字として載るだけになり、スマホで読んでいる
    #   読者が手で打ち込む必要があった。集客を目的にした本ではここが致命傷になる。
    def _link(m):
        label, url = m.group(1), m.group(2)
        if re.match(r"https?://", url):
            return f'<a href="{url}">{label}</a>'
        return label

    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", _link, text)
    # 素のURL（行にそのまま書かれたもの）もリンクにする。原稿にMarkdown記法を
    # 強制すると、PDFから起こした原稿では抜けやすいため、こちらでも拾う。
    #   全角括弧や句読点はURLの一部ではないので終端として扱う。これを入れないと
    #   「…https://example.com/（続き）」のような行でカッコまで飲み込む。
    text = re.sub(
        r'(?<!href=")(?<!>)(https?://[^\s<>"（）「」『』、。・…！？]+?)([.,;:!?)\]】』」）]*)(?=$|[\s（「『、。・…！？])',
        lambda m: f'<a href="{m.group(1)}">{m.group(1)}</a>{m.group(2)}',
        text,
    )
    return text


class _Block:
    def __init__(self, kind: str, content: str, level: int = 0):
        self.kind = kind      # heading / p / ul / ol / pre / hr / blank
        self.content = content
        self.level = level    # heading level (1-6)


def _parse_md(text: str) -> tuple[str, str, list[_Block]]:
    """Markdown テキストを title / author / blocks に分解する"""
    lines = text.splitlines()
    blocks: list[_Block] = []
    title = ""
    author = ""

    i = 0
    in_code = False
    code_lines: list[str] = []
    ul_items: list[str] = []
    ol_items: list[str] = []
    para_lines: list[str] = []

    def flush_ul():
        nonlocal ul_items
        if ul_items:
            items_html = "".join(f"<li>{_inline(_escape_html(li))}</li>" for li in ul_items)
            blocks.append(_Block("ul", f"<ul>{items_html}</ul>"))
            ul_items = []

    def flush_p():
        """連続する行を1段落にまとめる。行末2スペースは <br/>（原稿の改行）"""
        nonlocal para_lines
        if not para_lines:
            return
        parts: list[str] = []
        for n, raw_line in enumerate(para_lines):
            hard_break = raw_line.endswith("  ")
            parts.append(_inline(_escape_html(raw_line.strip())))
            if n < len(para_lines) - 1:
                parts.append("<br/>" if hard_break else "")
        blocks.append(_Block("p", "<p>" + "".join(parts) + "</p>"))
        para_lines = []

    def flush_ol():
        nonlocal ol_items
        if ol_items:
            items_html = "".join(f"<li>{_inline(_escape_html(li))}</li>" for li in ol_items)
            blocks.append(_Block("ol", f"<ol>{items_html}</ol>"))
            ol_items = []

    while i < len(lines):
        line = lines[i]

        # fenced code block
        if line.startswith("```") or line.startswith("~~~"):
            if in_code:
                flush_p(); flush_ul(); flush_ol()
                code_html = _escape_html("\n".join(code_lines))
                blocks.append(_Block("pre", f"<pre><code>{code_html}</code></pre>"))
                code_lines = []
                in_code = False
            else:
                flush_p(); flush_ul(); flush_ol()
                in_code = True
            i += 1
            continue

        if in_code:
            code_lines.append(line)
            i += 1
            continue

        # setext heading (= or -)
        if i + 1 < len(lines):
            next_line = lines[i + 1]
            if re.fullmatch(r"=+", next_line.strip()) and line.strip():
                flush_p(); flush_ul(); flush_ol()
                heading_text = _inline(_escape_html(line.strip()))
                if not title:
                    title = line.strip()
                blocks.append(_Block("heading", f"<h1>{heading_text}</h1>", level=1))
                i += 2
                continue
            if re.fullmatch(r"-+", next_line.strip()) and line.strip() and not line.startswith("-"):
                flush_p(); flush_ul(); flush_ol()
                heading_text = _inline(_escape_html(line.strip()))
                blocks.append(_Block("heading", f"<h2>{heading_text}</h2>", level=2))
                i += 2
                continue

        # ATX heading
        m = re.match(r"^(#{1,6})\s+(.*)", line)
        if m:
            flush_p(); flush_ul(); flush_ol()
            level = len(m.group(1))
            heading_text = _inline(_escape_html(m.group(2).rstrip("#").strip()))
            if level == 1 and not title:
                title = m.group(2).rstrip("#").strip()
            blocks.append(_Block("heading", f"<h{level}>{heading_text}</h{level}>", level=level))
            i += 1
            continue

        # horizontal rule
        if re.fullmatch(r"[-*_]{3,}", line.strip()):
            flush_p(); flush_ul(); flush_ol()
            blocks.append(_Block("hr", "<hr/>"))
            i += 1
            continue

        # unordered list
        m = re.match(r"^[-*+]\s+(.*)", line)
        if m:
            flush_p(); flush_ol()
            ul_items.append(m.group(1))
            i += 1
            continue

        # ordered list
        m = re.match(r"^\d+\.\s+(.*)", line)
        if m:
            flush_p(); flush_ul()
            ol_items.append(m.group(1))
            i += 1
            continue

        # blockquote → <blockquote>
        m = re.match(r"^>\s?(.*)", line)
        if m:
            flush_p(); flush_ul(); flush_ol()
            blocks.append(_Block("p", f"<blockquote>{_inline(_escape_html(m.group(1)))}</blockquote>"))
            i += 1
            continue

        # blank line
        if not line.strip():
            flush_p(); flush_ul(); flush_ol()
            blocks.append(_Block("blank", ""))
            i += 1
            continue

        # paragraph（連続行は flush_p でまとめる）
        flush_ul(); flush_ol()
        para_lines.append(line)
        i += 1

    flush_p()
    flush_ul()
    flush_ol()
    if in_code and code_lines:
        blocks.append(_Block("pre", f"<pre><code>{_escape_html(chr(10).join(code_lines))}</code></pre>"))

    return title, author, blocks


def _blocks_to_chapter(idx: int, title: str, blocks: list[_Block]) -> Chapter:
    chapter_id = f"chapter{idx + 1:03d}"
    html_parts = [b.content for b in blocks if b.kind != "blank" and b.content]
    body_html = "\n    ".join(html_parts)
    title_escaped = _escape_html(title)

    html = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:epub="http://www.idpf.org/2007/ops"
      xml:lang="ja" lang="ja">
<head>
  <meta charset="UTF-8"/>
  <title>{title_escaped}</title>
  <link rel="stylesheet" href="../Styles/tateyomi.css"/>
  <link rel="stylesheet" href="../Styles/kindle-overrides.css"/>
</head>
<body epub:type="bodymatter">
  <section epub:type="chapter" class="chapter-break">
    {body_html}
  </section>
</body>
</html>"""
    return Chapter(chapter_id=chapter_id, title=title, html_content=html)


class MdParser(BaseParser):
    def __init__(self, split_level: int = 1):
        # split_level 以下の見出しで章を分割する（1 = h1 のみ）
        self.split_level = max(1, min(6, int(split_level)))

    def parse(self, path: Path) -> ParsedBook:
        from tateyomi.utils.encoding import read_text_auto
        raw, _ = read_text_auto(path)

        # ![alt](path) を先に取り出す。リンク規則に食われる前に処理する必要がある。
        raw, images, alts = _extract_images(raw, path.parent)

        title, author, blocks = _parse_md(raw)
        if not title:
            title = path.stem

        # split_level 以下の見出しを章区切りとして分割
        chapters: list[Chapter] = []
        current_title = title
        current_blocks: list[_Block] = []

        for block in blocks:
            if block.kind == "heading" and block.level <= self.split_level:
                if current_blocks:
                    chapters.append(_blocks_to_chapter(len(chapters), current_title, current_blocks))
                # タグを除去してテキストだけを章タイトルとして使う
                current_title = re.sub(r"<[^>]+>", "", block.content)
                current_blocks = [block]
            else:
                current_blocks.append(block)

        if current_blocks or not chapters:
            chapters.append(_blocks_to_chapter(len(chapters), current_title, current_blocks))

        # プレースホルダを <img> に戻し、その章がどの画像を使ったかを記録する。
        for ch in chapters:
            if "\x00IMG" not in ch.html_content:
                continue
            used = [int(n) for n in re.findall(r"\x00IMG(\d+)\x00", ch.html_content)]
            ch.html_content = _tokens_to_img(ch.html_content, images, alts)
            ch.image_refs = [images[i - 1].href for i in used if 0 < i <= len(images)]

        return ParsedBook(
            title=title,
            author=author,
            language="ja",
            uid=str(uuid.uuid4()),
            chapters=chapters,
            images=images,
            source_format="md",
        )
