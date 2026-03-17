"""
パーサー基底クラス
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from pathlib import Path
from tateyomi.config import ParsedBook


class BaseParser(ABC):
    @abstractmethod
    def parse(self, path: Path) -> ParsedBook:
        """ファイルを読み込み ParsedBook を返す"""
        ...
