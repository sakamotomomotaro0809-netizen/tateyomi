"""
共通データモデル定義
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ImageItem:
    item_id: str
    href: str           # EPUB内相対パス or "Images/page{n}_img{m}.png"
    media_type: str     # e.g. "image/jpeg"
    data: bytes


@dataclass
class Chapter:
    chapter_id: str     # e.g. "chapter001"
    title: str
    html_content: str   # XHTML文字列
    image_refs: list[str] = field(default_factory=list)  # href参照


@dataclass
class ParsedBook:
    title: str
    author: str
    language: str = "ja"
    uid: str = ""
    chapters: list[Chapter] = field(default_factory=list)
    images: list[ImageItem] = field(default_factory=list)
    source_format: str = ""
    cover_image_href: Optional[str] = None
