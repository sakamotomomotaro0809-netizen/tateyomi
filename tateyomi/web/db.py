"""
SQLite によるユーザー・変換履歴管理
"""
from __future__ import annotations
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

import os
_DB_PATH = Path(os.environ.get("DB_PATH", str(Path(__file__).parent.parent.parent / "tateyomi_web.db")))


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(_DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_db() as conn:
        # deleted_at カラムの追加（既存DBへのマイグレーション）
        cols = [r[1] for r in conn.execute("PRAGMA table_info(conversions)").fetchall()]
        if cols and "deleted_at" not in cols:
            conn.execute("ALTER TABLE conversions ADD COLUMN deleted_at TEXT DEFAULT NULL")
        if cols and "chapters_dir" not in cols:
            conn.execute("ALTER TABLE conversions ADD COLUMN chapters_dir TEXT DEFAULT NULL")
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id       TEXT PRIMARY KEY,
                email    TEXT UNIQUE NOT NULL,
                name     TEXT,
                picture  TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS conversions (
                id            TEXT PRIMARY KEY,
                user_id       TEXT NOT NULL,
                original_name TEXT,
                output_name   TEXT,
                status        TEXT DEFAULT 'pending',
                error_msg     TEXT,
                file_path     TEXT,
                chapters_dir  TEXT DEFAULT NULL,
                created_at    TEXT DEFAULT (datetime('now')),
                deleted_at    TEXT DEFAULT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
            -- 既存DBへのマイグレーション（カラムがなければ追加）
            PRAGMA table_info(conversions);
        """)


def upsert_user(google_id: str, email: str, name: str, picture: str) -> dict:
    with get_db() as conn:
        conn.execute(
            """INSERT INTO users (id, email, name, picture)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
                 email=excluded.email,
                 name=excluded.name,
                 picture=excluded.picture""",
            (google_id, email, name, picture),
        )
    return {"id": google_id, "email": email, "name": name, "picture": picture}


def get_user(user_id: str) -> dict | None:
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE id = ?", (user_id,)
        ).fetchone()
    return dict(row) if row else None


def create_conversion(user_id: str, original_name: str, output_name: str) -> str:
    conv_id = str(uuid.uuid4())
    with get_db() as conn:
        conn.execute(
            """INSERT INTO conversions (id, user_id, original_name, output_name)
               VALUES (?, ?, ?, ?)""",
            (conv_id, user_id, original_name, output_name),
        )
    return conv_id


def update_conversion(
    conv_id: str,
    status: str,
    file_path: str | None = None,
    error_msg: str | None = None,
    chapters_dir: str | None = None,
) -> None:
    with get_db() as conn:
        conn.execute(
            """UPDATE conversions
               SET status=?, file_path=?, error_msg=?, chapters_dir=?
               WHERE id=?""",
            (status, file_path, error_msg, chapters_dir, conv_id),
        )


def get_user_conversions(user_id: str, limit: int = 20, include_deleted: bool = False) -> list[dict]:
    with get_db() as conn:
        if include_deleted:
            rows = conn.execute(
                """SELECT * FROM conversions
                   WHERE user_id = ? AND deleted_at IS NOT NULL
                   ORDER BY deleted_at DESC LIMIT ?""",
                (user_id, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT * FROM conversions
                   WHERE user_id = ? AND deleted_at IS NULL
                   ORDER BY created_at DESC LIMIT ?""",
                (user_id, limit),
            ).fetchall()
    return [dict(r) for r in rows]


def trash_conversion(conv_id: str) -> None:
    with get_db() as conn:
        conn.execute(
            "UPDATE conversions SET deleted_at = datetime('now') WHERE id = ?",
            (conv_id,),
        )


def restore_conversion(conv_id: str) -> None:
    with get_db() as conn:
        conn.execute(
            "UPDATE conversions SET deleted_at = NULL WHERE id = ?",
            (conv_id,),
        )


def delete_conversion_permanent(conv_id: str) -> str | None:
    """完全削除。削除前にファイルパスを返す。"""
    with get_db() as conn:
        row = conn.execute("SELECT file_path FROM conversions WHERE id = ?", (conv_id,)).fetchone()
        file_path = dict(row)["file_path"] if row else None
        conn.execute("DELETE FROM conversions WHERE id = ?", (conv_id,))
    return file_path


def get_conversion(conv_id: str) -> dict | None:
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM conversions WHERE id = ?", (conv_id,)
        ).fetchone()
    return dict(row) if row else None
