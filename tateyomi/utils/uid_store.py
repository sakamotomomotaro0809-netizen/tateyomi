"""
UUID 永続化ユーティリティ
非 EPUB 入力では変換のたびに新 UUID が生成されて KDP の書籍同一性が壊れる問題を解決する。
入力ファイルと同じディレクトリに <stem>.tateyomi-uid サイドカーファイルを置いて UUID を記憶する。
"""
from __future__ import annotations
import uuid
from pathlib import Path


def get_or_create_uid(input_path: Path) -> str:
    """
    入力ファイルに紐付いた UUID を返す。
    - サイドカーファイル <stem>.tateyomi-uid が存在すればその値を返す
    - 存在しなければ新規 UUID を生成してサイドカーに書き込んで返す
    - サイドカーへの書き込みに失敗しても変換は続行する（読み取り専用ディレクトリ対策）
    """
    sidecar = input_path.parent / (input_path.stem + ".tateyomi-uid")
    if sidecar.exists():
        uid = sidecar.read_text(encoding="utf-8").strip()
        if uid:
            return uid
    uid = str(uuid.uuid4())
    try:
        sidecar.write_text(uid, encoding="utf-8")
    except Exception:
        pass
    return uid


def read_uid(input_path: Path) -> str | None:
    """サイドカーが存在すれば UUID を返す。存在しなければ None。"""
    sidecar = input_path.parent / (input_path.stem + ".tateyomi-uid")
    if sidecar.exists():
        uid = sidecar.read_text(encoding="utf-8").strip()
        return uid or None
    return None
