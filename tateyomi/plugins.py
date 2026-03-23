"""
BA. プラグインシステム
外部パッケージが tateyomi のパーサー・レンダラー・トランスフォームを追加できる仕組み。

プラグインパッケージは pyproject.toml の entry_points で登録する:

  [project.entry-points."tateyomi.parsers"]
  myformat = "mypkg.parser:MyParser"

  [project.entry-points."tateyomi.renderers"]
  myformat = "mypkg.renderer:render"

  [project.entry-points."tateyomi.transforms"]
  myhook = "mypkg.transform:transform_hook"

登録後は自動的に tateyomi が利用する。
"""
from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from tateyomi.parsers.base import BaseParser

# ── パーサープラグイン ──────────────────────────────────────────────────

_parser_registry: dict[str, type] = {}
_renderer_registry: dict[str, object] = {}
_transform_hooks: list[object] = []


def _load_entry_points(group: str) -> dict[str, object]:
    """importlib.metadata でエントリポイントをロードする"""
    result: dict[str, object] = {}
    try:
        from importlib.metadata import entry_points
        eps = entry_points(group=group)
        for ep in eps:
            try:
                result[ep.name] = ep.load()
            except Exception as e:
                import warnings
                warnings.warn(f"プラグイン '{ep.name}' のロードに失敗しました: {e}")
    except Exception:
        pass
    return result


def get_parser_plugins() -> dict[str, type]:
    """
    拡張子 → パーサークラスのマップを返す。
    例: {".myext": MyParser}
    """
    if not _parser_registry:
        loaded = _load_entry_points("tateyomi.parsers")
        _parser_registry.update(loaded)
    return dict(_parser_registry)


def get_renderer_plugins() -> dict[str, object]:
    """
    拡張子 → render 関数のマップを返す。
    例: {".myout": my_render_func}
    """
    if not _renderer_registry:
        loaded = _load_entry_points("tateyomi.renderers")
        _renderer_registry.update(loaded)
    return dict(_renderer_registry)


def get_transform_hooks() -> list[object]:
    """
    変換フック関数のリストを返す。
    各フックは transform(book: ParsedBook) -> ParsedBook シグネチャを持つ。
    """
    if not _transform_hooks:
        loaded = _load_entry_points("tateyomi.transforms")
        _transform_hooks.extend(loaded.values())
    return list(_transform_hooks)


def register_parser(ext: str, parser_class: type) -> None:
    """プログラム的にパーサーを登録する（テスト・動的登録用）"""
    _parser_registry[ext.lower()] = parser_class


def register_renderer(ext: str, render_fn: object) -> None:
    """プログラム的にレンダラーを登録する"""
    _renderer_registry[ext.lower()] = render_fn


def register_transform_hook(fn: object) -> None:
    """プログラム的に変換フックを登録する"""
    _transform_hooks.append(fn)


def clear_registry() -> None:
    """テスト用: レジストリをクリア"""
    _parser_registry.clear()
    _renderer_registry.clear()
    _transform_hooks.clear()


def list_plugins() -> dict[str, list[str]]:
    """登録済みプラグインの一覧を返す"""
    return {
        "parsers": list(get_parser_plugins().keys()),
        "renderers": list(get_renderer_plugins().keys()),
        "transforms": [getattr(fn, "__name__", str(fn)) for fn in get_transform_hooks()],
    }
