"""
I. 設定ファイル管理 (tateyomi.toml)
プロジェクトルートまたはホームディレクトリの設定を読み込む
"""
from __future__ import annotations
import sys
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional

if sys.version_info >= (3, 11):
    import tomllib
else:
    try:
        import tomli as tomllib  # type: ignore
    except ImportError:
        tomllib = None  # type: ignore

# 設定ファイル検索順
_CONFIG_NAMES = ["tateyomi.toml", ".tateyomi.toml"]
_GLOBAL_CONFIG = Path.home() / ".tateyomi" / "config.toml"


@dataclass
class LayoutSettings:
    """G. 版面設定"""
    line_height: float = 1.8          # 行間
    font_size: str = "1em"            # 基本フォントサイズ
    margin_block: str = "15mm"        # 上下余白（縦書きの左右）
    margin_inline: str = "20mm"       # 左右余白（縦書きの上下）
    chars_hint: int = 0               # 一行の目安字数 (0=自動)
    page_size: str = "A5"             # ページサイズ (PDF用)


@dataclass
class ConvertSettings:
    """変換設定"""
    enable_tcy: bool = True           # 縦中横
    embed_font: bool = False          # フォント埋め込み
    font_dir: str = ""                # フォントディレクトリ
    extra_css: str = ""               # H. 追加CSS文字列
    extra_css_file: str = ""          # H. 追加CSSファイルパス
    normalize_text: bool = True       # N. テキスト正規化
    resize_images: bool = True        # K. 画像リサイズ
    image_max_width: int = 1650       # K. Kindle推奨幅
    image_max_height: int = 2550      # K. Kindle推奨高さ


@dataclass
class TateyomiConfig:
    layout: LayoutSettings = field(default_factory=LayoutSettings)
    convert: ConvertSettings = field(default_factory=ConvertSettings)

    @classmethod
    def load(cls, config_path: Optional[Path] = None) -> "TateyomiConfig":
        """設定ファイルを読み込む。なければデフォルト値を返す"""
        path = config_path or _find_config()
        if path is None:
            return cls()

        if tomllib is None:
            return cls()

        try:
            with open(path, "rb") as f:
                data = tomllib.load(f)
        except Exception:
            return cls()

        layout_data = data.get("layout", {})
        convert_data = data.get("convert", {})

        layout = LayoutSettings(**{
            k: v for k, v in layout_data.items()
            if k in LayoutSettings.__dataclass_fields__
        })
        convert = ConvertSettings(**{
            k: v for k, v in convert_data.items()
            if k in ConvertSettings.__dataclass_fields__
        })
        return cls(layout=layout, convert=convert)

    def save(self, path: Path) -> None:
        """設定をTOMLファイルに書き出す"""
        path.parent.mkdir(parents=True, exist_ok=True)
        lines = ["# tateyomi 設定ファイル\n",
                 "# tateyomi.bat config --init で生成されます\n\n"]

        lines.append("[layout]\n")
        lines.append(f'line_height    = {self.layout.line_height}    # 行間\n')
        lines.append(f'font_size      = "{self.layout.font_size}"    # 基本フォントサイズ\n')
        lines.append(f'margin_block   = "{self.layout.margin_block}"  # 上下余白\n')
        lines.append(f'margin_inline  = "{self.layout.margin_inline}" # 左右余白\n')
        lines.append(f'page_size      = "{self.layout.page_size}"    # ページサイズ (A4/A5/B6)\n')
        lines.append(f'chars_hint     = {self.layout.chars_hint}     # 一行の目安字数 (0=自動)\n')

        lines.append("\n[convert]\n")
        lines.append(f'enable_tcy     = {str(self.convert.enable_tcy).lower()}  # 縦中横\n')
        lines.append(f'embed_font     = {str(self.convert.embed_font).lower()}  # フォント埋め込み\n')
        lines.append(f'normalize_text = {str(self.convert.normalize_text).lower()}  # テキスト正規化\n')
        lines.append(f'resize_images  = {str(self.convert.resize_images).lower()}   # 画像リサイズ\n')
        lines.append(f'image_max_width  = {self.convert.image_max_width}   # Kindle推奨幅\n')
        lines.append(f'image_max_height = {self.convert.image_max_height}  # Kindle推奨高さ\n')
        lines.append(f'# extra_css_file = "custom.css"  # 追加CSSファイル\n')
        lines.append(f'# font_dir       = ""            # フォントディレクトリ\n')

        path.write_text("".join(lines), encoding="utf-8")


def _find_config() -> Optional[Path]:
    """カレントディレクトリから親方向に設定ファイルを探す"""
    cwd = Path.cwd()
    for d in [cwd, *cwd.parents]:
        for name in _CONFIG_NAMES:
            p = d / name
            if p.exists():
                return p
    if _GLOBAL_CONFIG.exists():
        return _GLOBAL_CONFIG
    return None
