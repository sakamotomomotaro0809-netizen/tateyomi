"""
HTML変換: writing-mode CSS注入・lang属性付与・XHTML正規化
"""
from __future__ import annotations
from lxml import etree
from tateyomi.config import ParsedBook

XHTML_NS = "http://www.w3.org/1999/xhtml"
EPUB_NS = "http://www.idpf.org/2007/ops"

WRITING_MODE_STYLE = (
    "writing-mode:vertical-rl;"
    "-webkit-writing-mode:vertical-rl;"
    "-epub-writing-mode:vertical-rl;"
    "text-orientation:mixed;"
)


def transform(book: ParsedBook) -> ParsedBook:
    """全チャプターHTMLに縦書き属性を付与し、XHTML3として整合させる"""
    for chapter in book.chapters:
        chapter.html_content = _process_html(chapter.html_content)
    return book


def _process_html(html: str) -> str:
    try:
        parser = etree.XMLParser(
            recover=True,
            remove_blank_text=False,
            resolve_entities=False,
        )
        # DOCTYPE を除去してからパース（lxmlはDOCTYPEに敏感）
        html_clean = _strip_doctype(html)
        root = etree.fromstring(html_clean.encode("utf-8"), parser)
    except Exception:
        # パース失敗時は元のHTMLをそのまま返す
        return html

    # <html> 要素に lang/xml:lang が無ければ付与
    _ensure_attr(root, "lang", "ja")
    _ensure_attr(root, "{http://www.w3.org/XML/1998/namespace}lang", "ja")

    # <body> に writing-mode インラインスタイルを付与（CSSが効かない環境のフォールバック）
    body = root.find(f".//{{{XHTML_NS}}}body")
    if body is None:
        body = root.find(".//body")
    if body is not None:
        existing = body.get("style", "")
        if "writing-mode" not in existing:
            body.set("style", (existing + ";" + WRITING_MODE_STYLE).lstrip(";"))

    # alt属性のない <img> に alt="" を付与（アクセシビリティ必須）
    _ensure_img_alt(root)

    # encoding="UTF-8" でバイト列として取得し、XML宣言を含める
    raw: bytes = etree.tostring(
        root,
        xml_declaration=True,
        encoding="UTF-8",
        method="xml",
        pretty_print=False,
    )
    result = raw.decode("utf-8")

    # DOCTYPE宣言を挿入
    doctype = '<!DOCTYPE html>\n'
    if result.startswith("<?xml"):
        idx = result.index("?>") + 2
        result = result[:idx] + "\n" + doctype + result[idx:]
    else:
        result = doctype + result

    return result


def _ensure_img_alt(root: etree._Element) -> None:
    """alt属性のない <img> 要素に alt="" を設定する（WCAG 1.1.1 / EPUB Accessibility 要件）"""
    for ns in (XHTML_NS, ""):
        tag = f"{{{ns}}}img" if ns else "img"
        for img in root.iter(tag):
            if img.get("alt") is None:
                img.set("alt", "")


def _ensure_attr(elem: etree._Element, attr: str, value: str) -> None:
    if not elem.get(attr):
        elem.set(attr, value)


def _strip_doctype(html: str) -> str:
    """<!DOCTYPE ...> を除去してXMLパースを安定させる"""
    import re
    return re.sub(r"<!DOCTYPE[^>]*>", "", html, flags=re.IGNORECASE)
