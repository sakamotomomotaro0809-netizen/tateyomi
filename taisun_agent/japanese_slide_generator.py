#!/usr/bin/env python3
"""
日本語スライド生成システム
- NanoBanana Proで背景画像を生成（テキストなし）
- Pillowで日本語テキストをオーバーレイ
- 品質チェック＆リファレンス修復システム
"""

import os
import subprocess
import sys
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import json

# 日本語フォント設定
JAPANESE_FONTS = [
    "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc",
    "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc",
    "/Library/Fonts/NotoSansJP-Bold.ttf",
    "/Library/Fonts/NotoSansJP-Regular.ttf",
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
]

def get_japanese_font(size=48, bold=False):
    """日本語フォントを取得"""
    font_paths = JAPANESE_FONTS if bold else JAPANESE_FONTS[1:]
    for font_path in font_paths:
        if os.path.exists(font_path):
            try:
                return ImageFont.truetype(font_path, size)
            except Exception:
                continue
    # フォールバック
    return ImageFont.load_default()


def add_text_overlay(image_path, output_path, texts):
    """
    画像に日本語テキストをオーバーレイ

    texts: list of dict with keys:
        - text: str - テキスト内容
        - position: tuple (x, y) or str ('center', 'top-center', 'bottom-center')
        - font_size: int - フォントサイズ
        - color: tuple (R, G, B) or (R, G, B, A) - テキスト色
        - stroke_color: tuple - 縁取り色（オプション）
        - stroke_width: int - 縁取り幅（オプション）
        - bold: bool - 太字（オプション）
        - center_x: bool - X座標を中央揃え（オプション）
    """
    img = Image.open(image_path).convert("RGBA")
    draw = ImageDraw.Draw(img)

    for text_config in texts:
        text = text_config.get("text", "")
        position = text_config.get("position", "center")
        font_size = text_config.get("font_size", 48)
        color = text_config.get("color", (255, 255, 255, 255))
        stroke_color = text_config.get("stroke_color", (0, 0, 0, 255))
        stroke_width = text_config.get("stroke_width", 2)
        bold = text_config.get("bold", False)
        center_x = text_config.get("center_x", False)

        font = get_japanese_font(font_size, bold)

        # テキストサイズを取得
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        # 位置計算
        if isinstance(position, str):
            if position == "center":
                x = (img.width - text_width) // 2
                y = (img.height - text_height) // 2
            elif position == "top-center":
                x = (img.width - text_width) // 2
                y = 50
            elif position == "bottom-center":
                x = (img.width - text_width) // 2
                y = img.height - text_height - 50
            elif position == "top-left":
                x, y = 50, 50
            elif position == "top-right":
                x = img.width - text_width - 50
                y = 50
            else:
                x, y = 50, 50
        else:
            x, y = position
            # center_xフラグがTrueの場合、X座標を中央揃え
            if center_x:
                x = (img.width - text_width) // 2

        # テキスト描画（縁取り付き）
        if stroke_width > 0:
            draw.text((x, y), text, font=font, fill=color,
                     stroke_width=stroke_width, stroke_fill=stroke_color)
        else:
            draw.text((x, y), text, font=font, fill=color)

    # RGBA to RGB変換（PNG以外の場合）
    if output_path.lower().endswith('.jpg') or output_path.lower().endswith('.jpeg'):
        img = img.convert("RGB")

    img.save(output_path)
    return output_path


def generate_background_image(prompt, output_path, max_retries=3):
    """NanoBanana Proで背景画像を生成（テキストなしプロンプト）"""
    skill_path = os.path.expanduser("~/.claude/skills/nanobanana-pro")

    for attempt in range(max_retries):
        try:
            result = subprocess.run(
                ["python3", "scripts/run.py", "image_generator.py",
                 "--prompt", prompt,
                 "--output", output_path],
                cwd=skill_path,
                capture_output=True,
                text=True,
                timeout=180
            )

            if os.path.exists(output_path):
                print(f"✓ 背景画像生成成功: {output_path}")
                return True
            else:
                print(f"✗ 試行 {attempt + 1}/{max_retries}: 画像生成失敗")

        except subprocess.TimeoutExpired:
            print(f"✗ 試行 {attempt + 1}/{max_retries}: タイムアウト")
        except Exception as e:
            print(f"✗ 試行 {attempt + 1}/{max_retries}: エラー - {e}")

    return False


def quality_check_image(image_path):
    """画像品質チェック"""
    try:
        img = Image.open(image_path)

        # 基本チェック
        checks = {
            "exists": os.path.exists(image_path),
            "readable": True,
            "width": img.width,
            "height": img.height,
            "min_width": img.width >= 800,
            "min_height": img.height >= 500,
            "aspect_ratio": round(img.width / img.height, 2),
        }

        # サイズチェック
        file_size = os.path.getsize(image_path)
        checks["file_size_kb"] = round(file_size / 1024, 2)
        checks["file_size_ok"] = file_size > 10000  # 10KB以上

        # 総合判定
        checks["passed"] = all([
            checks["exists"],
            checks["readable"],
            checks["min_width"],
            checks["min_height"],
            checks["file_size_ok"]
        ])

        return checks

    except Exception as e:
        return {
            "exists": os.path.exists(image_path),
            "readable": False,
            "error": str(e),
            "passed": False
        }


def generate_slide_with_japanese(slide_config, output_dir):
    """
    日本語スライドを生成

    slide_config: dict with keys:
        - name: str - スライド名（ファイル名用）
        - background_prompt: str - 背景画像生成プロンプト（テキストなし）
        - texts: list - テキストオーバーレイ設定
    """
    name = slide_config["name"]
    background_prompt = slide_config["background_prompt"]
    texts = slide_config.get("texts", [])

    # パス設定
    bg_path = os.path.join(output_dir, f"{name}_bg.png")
    final_path = os.path.join(output_dir, f"{name}.png")

    print(f"\n{'='*50}")
    print(f"スライド生成: {name}")
    print(f"{'='*50}")

    # 1. 背景画像生成
    print("1. 背景画像を生成中...")
    if not generate_background_image(background_prompt, bg_path):
        print(f"✗ 背景画像生成失敗: {name}")
        return None

    # 2. 品質チェック
    print("2. 品質チェック中...")
    quality = quality_check_image(bg_path)
    if not quality["passed"]:
        print(f"✗ 品質チェック失敗: {quality}")
        return None
    print(f"✓ 品質チェック通過: {quality['width']}x{quality['height']}, {quality['file_size_kb']}KB")

    # 3. テキストオーバーレイ
    print("3. 日本語テキストをオーバーレイ中...")
    if texts:
        add_text_overlay(bg_path, final_path, texts)
        print(f"✓ テキストオーバーレイ完了")
    else:
        # テキストなしの場合はそのままコピー
        import shutil
        shutil.copy(bg_path, final_path)

    # 4. 最終品質チェック
    print("4. 最終品質チェック中...")
    final_quality = quality_check_image(final_path)
    if not final_quality["passed"]:
        print(f"✗ 最終品質チェック失敗: {final_quality}")
        return None

    print(f"✓ スライド生成完了: {final_path}")
    return final_path


# スライド設定
SLIDE_CONFIGS = [
    {
        "name": "slide1_cover",
        "background_prompt": "anime style illustration, epic futuristic AI technology scene, female AI assistant character with blue and gold armor standing confidently, digital shields and holographic displays floating around her, cyber city skyline background, professional blue and gold color scheme, no text, high quality, 16:9 aspect ratio",
        "texts": [
            {
                "text": "TAISUN Agent",
                "position": "top-center",
                "font_size": 72,
                "color": (255, 215, 0, 255),  # ゴールド
                "stroke_color": (0, 0, 80, 255),
                "stroke_width": 4,
                "bold": True
            },
            {
                "text": "完全ガイド",
                "position": (0, 140),
                "center_x": True,  # X座標を中央揃え
                "font_size": 56,
                "color": (255, 255, 255, 255),
                "stroke_color": (0, 0, 80, 255),
                "stroke_width": 3,
                "bold": True
            },
            {
                "text": "68スキル × 85エージェント × 227ツール",
                "position": "bottom-center",
                "font_size": 32,
                "color": (200, 220, 255, 255),
                "stroke_color": (0, 0, 60, 255),
                "stroke_width": 2
            }
        ]
    },
    {
        "name": "slide2_toc",
        "background_prompt": "anime style illustration, cute AI assistant robot character in classroom setting, pointing at a floating holographic checklist board, soft pastel blue and white colors, educational atmosphere, bright and clean design, no text, high quality",
        "texts": [
            {
                "text": "このガイドで学べること",
                "position": "top-center",
                "font_size": 56,
                "color": (30, 80, 140, 255),
                "stroke_color": (255, 255, 255, 255),
                "stroke_width": 3,
                "bold": True
            },
            {
                "text": "✓ インストール方法（Mac/Windows）",
                "position": (100, 180),
                "font_size": 32,
                "color": (40, 60, 100, 255),
                "stroke_width": 0
            },
            {
                "text": "✓ 主要機能と使い方",
                "position": (100, 230),
                "font_size": 32,
                "color": (40, 60, 100, 255),
                "stroke_width": 0
            },
            {
                "text": "✓ 業種別活用事例（15業種）",
                "position": (100, 280),
                "font_size": 32,
                "color": (40, 60, 100, 255),
                "stroke_width": 0
            },
            {
                "text": "✓ 13層防御システム",
                "position": (100, 330),
                "font_size": 32,
                "color": (40, 60, 100, 255),
                "stroke_width": 0
            }
        ]
    },
    {
        "name": "slide3_what_is",
        "background_prompt": "anime style illustration, friendly robot character with multiple mechanical arms holding various tools representing skills and abilities, futuristic digital ecosystem visualization with interconnected nodes, purple and cyan gradient background, no text, high quality",
        "texts": [
            {
                "text": "TAISUN Agentとは？",
                "position": "top-center",
                "font_size": 56,
                "color": (255, 255, 255, 255),
                "stroke_color": (80, 0, 120, 255),
                "stroke_width": 4,
                "bold": True
            },
            {
                "text": "Claude Codeを超強化する",
                "position": (50, 400),
                "font_size": 36,
                "color": (220, 240, 255, 255),
                "stroke_color": (40, 0, 80, 255),
                "stroke_width": 2
            },
            {
                "text": "オールインワン拡張パック",
                "position": (50, 450),
                "font_size": 36,
                "color": (220, 240, 255, 255),
                "stroke_color": (40, 0, 80, 255),
                "stroke_width": 2
            }
        ]
    },
    {
        "name": "slide4_before_after",
        "background_prompt": "anime style illustration, split screen comparison, left side shows tired stressed office worker surrounded by messy papers in gray monotone colors, right side shows same character happy and relaxed with cute AI robot assistant helping organize work in warm bright colors, dramatic transformation visualization, no text, high quality",
        "texts": [
            {
                "text": "導入前",
                "position": (150, 30),
                "font_size": 48,
                "color": (100, 100, 100, 255),
                "stroke_color": (255, 255, 255, 255),
                "stroke_width": 3,
                "bold": True
            },
            {
                "text": "導入後",
                "position": (650, 30),
                "font_size": 48,
                "color": (255, 150, 50, 255),
                "stroke_color": (255, 255, 255, 255),
                "stroke_width": 3,
                "bold": True
            },
            {
                "text": "作業時間 80%削減",
                "position": "bottom-center",
                "font_size": 40,
                "color": (0, 180, 100, 255),
                "stroke_color": (255, 255, 255, 255),
                "stroke_width": 3,
                "bold": True
            }
        ]
    },
    {
        "name": "slide5_numbers",
        "background_prompt": "anime style illustration, cute AI mascot character presenting impressive statistics showcase, floating 3D golden number blocks and achievement badges, golden sparkles and celebration effects, dark blue background with neon accents, impressive infographic style, no text, high quality",
        "texts": [
            {
                "text": "数字で見るTAISUN",
                "position": "top-center",
                "font_size": 56,
                "color": (255, 215, 0, 255),
                "stroke_color": (0, 30, 80, 255),
                "stroke_width": 4,
                "bold": True
            },
            {
                "text": "68",
                "position": (80, 180),
                "font_size": 72,
                "color": (255, 200, 50, 255),
                "stroke_color": (0, 0, 60, 255),
                "stroke_width": 3,
                "bold": True
            },
            {
                "text": "スキル",
                "position": (80, 260),
                "font_size": 32,
                "color": (200, 220, 255, 255),
                "stroke_width": 0
            },
            {
                "text": "85",
                "position": (280, 180),
                "font_size": 72,
                "color": (100, 200, 255, 255),
                "stroke_color": (0, 0, 60, 255),
                "stroke_width": 3,
                "bold": True
            },
            {
                "text": "エージェント",
                "position": (250, 260),
                "font_size": 32,
                "color": (200, 220, 255, 255),
                "stroke_width": 0
            },
            {
                "text": "227",
                "position": (480, 180),
                "font_size": 72,
                "color": (150, 255, 150, 255),
                "stroke_color": (0, 0, 60, 255),
                "stroke_width": 3,
                "bold": True
            },
            {
                "text": "MCPツール",
                "position": (470, 260),
                "font_size": 32,
                "color": (200, 220, 255, 255),
                "stroke_width": 0
            },
            {
                "text": "13",
                "position": (700, 180),
                "font_size": 72,
                "color": (255, 100, 150, 255),
                "stroke_color": (0, 0, 60, 255),
                "stroke_width": 3,
                "bold": True
            },
            {
                "text": "防御レイヤー",
                "position": (670, 260),
                "font_size": 32,
                "color": (200, 220, 255, 255),
                "stroke_width": 0
            }
        ]
    }
]


def main():
    """メイン処理"""
    output_dir = os.path.expanduser("~/Desktop/開発2026/taisun_agent2026/slides_jp")
    os.makedirs(output_dir, exist_ok=True)

    print("=" * 60)
    print("日本語スライド生成システム")
    print("=" * 60)
    print(f"出力先: {output_dir}")
    print(f"生成スライド数: {len(SLIDE_CONFIGS)}")
    print()

    results = []
    for i, config in enumerate(SLIDE_CONFIGS, 1):
        print(f"\n[{i}/{len(SLIDE_CONFIGS)}] {config['name']}")

        # テキスト位置の調整（center系の場合）
        for text in config.get("texts", []):
            if text.get("position") == (0, 140):  # 特殊ケース：タイトル下
                # 画像幅に基づいて中央揃え（後で調整）
                pass

        result = generate_slide_with_japanese(config, output_dir)
        results.append({
            "name": config["name"],
            "success": result is not None,
            "path": result
        })

    # 結果サマリー
    print("\n" + "=" * 60)
    print("生成結果サマリー")
    print("=" * 60)

    success_count = sum(1 for r in results if r["success"])
    print(f"成功: {success_count}/{len(results)}")

    for r in results:
        status = "✓" if r["success"] else "✗"
        print(f"  {status} {r['name']}")

    return results


if __name__ == "__main__":
    main()
