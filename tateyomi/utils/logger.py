"""
AZ. 変換ログファイル出力ユーティリティ
"""
from __future__ import annotations
import logging
from pathlib import Path
from datetime import datetime

_logger = logging.getLogger("tateyomi")
_file_handler: logging.FileHandler | None = None


def setup_log_file(log_path: Path) -> None:
    """ログファイルをセットアップする（CLI 起動時に呼ぶ）"""
    global _file_handler
    log_path.parent.mkdir(parents=True, exist_ok=True)
    _file_handler = logging.FileHandler(str(log_path), encoding="utf-8")
    _file_handler.setLevel(logging.DEBUG)
    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s",
                            datefmt="%Y-%m-%d %H:%M:%S")
    _file_handler.setFormatter(fmt)
    _logger.addHandler(_file_handler)
    _logger.setLevel(logging.DEBUG)
    _logger.info("tateyomi ログ開始")


def log_convert_start(input_path: Path, output_path: Path) -> None:
    _logger.info("変換開始: %s -> %s", input_path.name, output_path.name)


def log_convert_done(output_path: Path, size_kb: int, n_chapters: int) -> None:
    _logger.info("変換完了: %s (%d KB, %d章)", output_path.name, size_kb, n_chapters)


def log_convert_error(input_path: Path, error: Exception) -> None:
    _logger.error("変換失敗: %s: %s", input_path.name, error)


def log_info(msg: str) -> None:
    _logger.info(msg)


def teardown() -> None:
    """ログファイルハンドラを閉じる"""
    global _file_handler
    if _file_handler:
        _file_handler.flush()
        _file_handler.close()
        _logger.removeHandler(_file_handler)
        _file_handler = None
