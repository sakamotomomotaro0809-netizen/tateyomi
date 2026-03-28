#!/usr/bin/env python3
"""
日本語スライド生成システム v2
- 下部20%にテロップ用余白を追加
- フォントを太く、縁取りを強化
- 文字を目立たせるデザイン
"""

import os
import subprocess
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

# 日本語フォント設定（太字優先）
JAPANESE_FONTS_BOLD = [
    "/System/Library/Fonts/ヒラギノ角ゴシック W8.ttc",
    "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc",
    "/Library/Fonts/NotoSansJP-Black.ttf",
    "/Library/Fonts/NotoSansJP-Bold.ttf",
]

JAPANESE_FONTS_REGULAR = [
    "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc",
    "/System/Library/Fonts/ヒラギノ角ゴシック W4.ttc",
    "/Library/Fonts/NotoSansJP-Medium.ttf",
]


def get_japanese_font(size=48, bold=True):
    """日本語フォントを取得（デフォルト太字）"""
    font_list = JAPANESE_FONTS_BOLD if bold else JAPANESE_FONTS_REGULAR
    for font_path in font_list:
        if os.path.exists(font_path):
            try:
                return ImageFont.truetype(font_path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def add_telop_area(image_path, output_path, telop_ratio=0.20, bg_color=(20, 25, 40, 240)):
    """
    画像の下部にテロップ用の余白を追加

    telop_ratio: 下部余白の割合（0.20 = 20%）
    bg_color: 背景色 (R, G, B, A)
    """
    img = Image.open(image_path).convert("RGBA")
    orig_width, orig_height = img.size

    # 新しい画像サイズ（下部に余白追加）
    telop_height = int(orig_height * telop_ratio / (1 - telop_ratio))
    new_height = orig_height + telop_height

    # 新しいキャンバスを作成
    new_img = Image.new("RGBA", (orig_width, new_height), bg_color)

    # 元画像を上部に貼り付け
    new_img.paste(img, (0, 0))

    # グラデーション効果（画像とテロップの境界を滑らかに）
    gradient_height = 30
    for i in range(gradient_height):
        alpha = int(255 * (i / gradient_height))
        y = orig_height - gradient_height + i
        for x in range(orig_width):
            r, g, b, a = new_img.getpixel((x, y))
            blend_r = int(r * (1 - i/gradient_height) + bg_color[0] * (i/gradient_height))
            blend_g = int(g * (1 - i/gradient_height) + bg_color[1] * (i/gradient_height))
            blend_b = int(b * (1 - i/gradient_height) + bg_color[2] * (i/gradient_height))
            new_img.putpixel((x, y), (blend_r, blend_g, blend_b, 255))

    new_img.save(output_path)
    return output_path, orig_height, new_height


def add_text_with_strong_outline(draw, text, x, y, font, text_color, outline_color, outline_width=4):
    """強い縁取り付きテキストを描画"""
    # 縁取りを複数回描画して太くする
    for ox in range(-outline_width, outline_width + 1):
        for oy in range(-outline_width, outline_width + 1):
            if ox != 0 or oy != 0:
                draw.text((x + ox, y + oy), text, font=font, fill=outline_color)

    # メインテキスト
    draw.text((x, y), text, font=font, fill=text_color)


def create_slide_with_telop(bg_image_path, output_path, title_texts, telop_text):
    """
    テロップ付きスライドを作成

    title_texts: 画像上に表示するタイトル等のテキスト設定リスト
    telop_text: 下部テロップに表示するテキスト
    """
    # 1. テロップ用余白を追加
    temp_path = output_path.replace(".png", "_temp.png")
    add_telop_area(bg_image_path, temp_path, telop_ratio=0.20, bg_color=(15, 20, 35, 255))

    # 2. 画像を開く
    img = Image.open(temp_path).convert("RGBA")
    draw = ImageDraw.Draw(img)
    width, height = img.size

    # 元画像の高さ（テロップエリアの開始位置）
    original_height = int(height * 0.833)  # 1 / 1.20
    telop_area_start = original_height
    telop_area_height = height - original_height

    # 3. タイトルテキストを描画（画像エリア内）
    for config in title_texts:
        text = config.get("text", "")
        position = config.get("position", "top-center")
        font_size = config.get("font_size", 56)
        text_color = config.get("color", (255, 255, 255, 255))
        outline_color = config.get("outline_color", (0, 0, 0, 255))
        outline_width = config.get("outline_width", 5)

        font = get_japanese_font(font_size, bold=True)

        # テキストサイズ計算
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        # 位置計算（画像エリア内）
        if isinstance(position, str):
            if position == "center":
                x = (width - text_width) // 2
                y = (original_height - text_height) // 2
            elif position == "top-center":
                x = (width - text_width) // 2
                y = 40
            elif position == "mid-center":
                x = (width - text_width) // 2
                y = (original_height - text_height) // 2
            else:
                x, y = 50, 50
        else:
            x, y = position
            if config.get("center_x"):
                x = (width - text_width) // 2

        # 強い縁取り付きで描画
        add_text_with_strong_outline(draw, text, x, y, font, text_color, outline_color, outline_width)

    # 4. テロップテキストを描画（下部エリア）
    if telop_text:
        # テロップが画面幅に収まるようにフォントサイズを自動調整
        max_telop_width = width - 60  # 左右30pxマージン
        telop_font_size = 32

        while telop_font_size >= 18:
            telop_font = get_japanese_font(telop_font_size, bold=True)
            bbox = draw.textbbox((0, 0), telop_text, font=telop_font)
            telop_width = bbox[2] - bbox[0]
            if telop_width <= max_telop_width:
                break
            telop_font_size -= 2

        telop_height_px = bbox[3] - bbox[1]
        telop_x = (width - telop_width) // 2
        telop_y = telop_area_start + (telop_area_height - telop_height_px) // 2

        # 白テキスト + 黒縁取り
        add_text_with_strong_outline(
            draw, telop_text, telop_x, telop_y,
            telop_font,
            text_color=(255, 255, 255, 255),
            outline_color=(0, 0, 0, 255),
            outline_width=3
        )

    # 5. 保存
    img.save(output_path)

    # 一時ファイル削除
    if os.path.exists(temp_path):
        os.remove(temp_path)

    return output_path


# スライド設定 v2（テロップ対応）
SLIDE_CONFIGS_V2 = [
    {
        "name": "slide1_cover_v2",
        "bg_image": "slide1_cover_bg.png",
        "title_texts": [
            {
                "text": "TAISUN Agent",
                "position": "top-center",
                "font_size": 72,
                "color": (255, 220, 50, 255),
                "outline_color": (0, 0, 80, 255),
                "outline_width": 6
            },
            {
                "text": "完全ガイド",
                "position": (0, 130),
                "center_x": True,
                "font_size": 64,
                "color": (255, 255, 255, 255),
                "outline_color": (0, 0, 80, 255),
                "outline_width": 5
            },
        ],
        "telop": "68スキル × 85エージェント × 227MCPツール × 13層防御システム"
    },
    {
        "name": "slide2_toc_v2",
        "bg_image": "slide2_toc_bg.png",
        "title_texts": [
            {
                "text": "このガイドで学べること",
                "position": "top-center",
                "font_size": 56,
                "color": (255, 255, 255, 255),
                "outline_color": (30, 60, 120, 255),
                "outline_width": 5
            },
        ],
        "telop": "✓ インストール方法  ✓ 主要機能  ✓ 業種別活用事例  ✓ 13層防御システム"
    },
    {
        "name": "slide3_what_is_v2",
        "bg_image": "slide3_what_is_bg.png",
        "title_texts": [
            {
                "text": "TAISUN Agentとは？",
                "position": "top-center",
                "font_size": 60,
                "color": (255, 255, 255, 255),
                "outline_color": (80, 0, 120, 255),
                "outline_width": 6
            },
        ],
        "telop": "Claude Codeを超強化するオールインワン拡張パック"
    },
    {
        "name": "slide4_before_after_v2",
        "bg_image": "slide4_before_after_bg.png",
        "title_texts": [
            {
                "text": "導入前",
                "position": (120, 30),
                "font_size": 52,
                "color": (180, 180, 180, 255),
                "outline_color": (0, 0, 0, 255),
                "outline_width": 5
            },
            {
                "text": "導入後",
                "position": (620, 30),
                "font_size": 52,
                "color": (255, 200, 50, 255),
                "outline_color": (0, 0, 0, 255),
                "outline_width": 5
            },
        ],
        "telop": "TAISUN Agent導入で作業時間80%削減！生産性が劇的に向上"
    },
    {
        "name": "slide5_numbers_v2",
        "bg_image": "slide5_numbers_bg.png",
        "title_texts": [
            {
                "text": "数字で見るTAISUN",
                "position": "top-center",
                "font_size": 60,
                "color": (255, 220, 50, 255),
                "outline_color": (0, 20, 60, 255),
                "outline_width": 6
            },
        ],
        "telop": "68スキル ｜ 85エージェント ｜ 227MCPツール ｜ 13層防御"
    }
]


def main():
    """メイン処理"""
    input_dir = os.path.expanduser("~/Desktop/開発2026/taisun_agent2026/slides_jp")
    output_dir = os.path.expanduser("~/Desktop/開発2026/taisun_agent2026/slides_jp_v2")
    os.makedirs(output_dir, exist_ok=True)

    print("=" * 60)
    print("日本語スライド生成システム v2")
    print("- 下部20%テロップエリア追加")
    print("- 太字フォント + 強縁取り")
    print("=" * 60)

    for config in SLIDE_CONFIGS_V2:
        name = config["name"]
        bg_image = os.path.join(input_dir, config["bg_image"])
        output_path = os.path.join(output_dir, f"{name}.png")

        print(f"\n処理中: {name}")

        if not os.path.exists(bg_image):
            print(f"  ✗ 背景画像が見つかりません: {bg_image}")
            continue

        try:
            create_slide_with_telop(
                bg_image,
                output_path,
                config["title_texts"],
                config["telop"]
            )
            print(f"  ✓ 保存: {output_path}")
        except Exception as e:
            print(f"  ✗ エラー: {e}")

    print("\n" + "=" * 60)
    print("完了！")
    print(f"出力先: {output_dir}")


if __name__ == "__main__":
    main()
