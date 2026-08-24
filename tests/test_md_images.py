# -*- coding: utf-8 -*-
"""Markdown の画像 ![alt](path) が本当に EPUB に入るか。

2026-08-24 まで、md からの画像は**黙って消えていた**。
![alt](path) が [text](url) のリンク規則に食われ、本文には "!" と alt だけが残る。
変換後の表示は「画像数 1」（表紙のぶん）と出るので、入ったつもりで気づけない。

集客マンガを本の冒頭に入れようとして判明した。ここが緩むと同じ事故が戻る。
"""
import struct
import tempfile
import zlib
from pathlib import Path

import pytest

from tateyomi.parsers.md_parser import MdParser


def _png_bytes(w: int = 4, h: int = 4) -> bytes:
    """依存を増やさずに、正しい PNG を1枚作る"""
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    raw = b"".join(b"\x00" + b"\xff\x00\x00" * w for _ in range(h))
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
            + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


@pytest.fixture
def book_dir():
    with tempfile.TemporaryDirectory() as d:
        base = Path(d)
        (base / "img").mkdir()
        (base / "img" / "p1.png").write_bytes(_png_bytes())
        (base / "img" / "p2.png").write_bytes(_png_bytes())
        yield base


def _parse(base: Path, md: str):
    p = base / "book.md"
    p.write_text(md, encoding="utf-8")
    return MdParser().parse(p)


def test_画像がEPUBに同梱される(book_dir):
    book = _parse(book_dir, "# まえがき\n\n![1ページ目](img/p1.png)\n\n![2ページ目](img/p2.png)\n")
    assert len(book.images) == 2, "2枚とも拾えていない"
    assert all(img.data.startswith(b"\x89PNG") for img in book.images)
    assert all(img.media_type == "image/png" for img in book.images)


def test_本文がimgタグになる(book_dir):
    book = _parse(book_dir, "# まえがき\n\n![1ページ目](img/p1.png)\n")
    html = book.chapters[0].html_content
    assert "<img" in html
    assert 'alt="1ページ目"' in html
    # これが事故の形。"!" と alt だけが残っていた
    assert "!1ページ目" not in html


def test_章が使った画像を記録する(book_dir):
    book = _parse(book_dir, "# まえがき\n\n![a](img/p1.png)\n\n# 第1章\n\n本文\n")
    assert len(book.chapters[0].image_refs) == 1
    assert book.chapters[1].image_refs == []


def test_見つからない画像は黙って落とさず止まる(book_dir):
    # 黙って消えるのが元凶だった。「入っているつもりで入っていない」を作らない
    with pytest.raises(FileNotFoundError) as e:
        _parse(book_dir, "# まえがき\n\n![ない](img/nope.png)\n")
    assert "nope.png" in str(e.value)


def test_外部URLの画像も止まる(book_dir):
    # 読者の端末は通信しないので、EPUBに入れられない
    with pytest.raises(FileNotFoundError) as e:
        _parse(book_dir, "# まえがき\n\n![外](https://example.com/a.png)\n")
    assert "外部URL" in str(e.value)


def test_通常のリンクは今までどおり(book_dir):
    book = _parse(book_dir, "# 章\n\n[こちら](https://example.com/x) をどうぞ\n")
    html = book.chapters[0].html_content
    assert '<a href="https://example.com/x">こちら</a>' in html


def test_画像を使わない原稿は何も変わらない(book_dir):
    book = _parse(book_dir, "# 章\n\n**太字**と普通の文。\n")
    assert book.images == []
    assert "<strong>太字</strong>" in book.chapters[0].html_content
