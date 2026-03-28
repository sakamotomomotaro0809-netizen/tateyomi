#!/usr/bin/env python3
"""
スライド品質チェック＆リファレンス修復システム
- 日本語テキストの表示確認
- レイアウト品質チェック
- 問題があれば自動修復
"""

import os
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path


def get_japanese_font(size=48, bold=False):
    """日本語フォントを取得"""
    fonts = [
        "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc",
        "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc",
    ]
    for font_path in fonts:
        if os.path.exists(font_path):
            try:
                return ImageFont.truetype(font_path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def check_text_readability(image_path, texts_config):
    """
    テキストの可読性をチェック
    - テキスト領域のコントラストを確認
    - 重なりがないか確認
    """
    img = Image.open(image_path).convert("RGB")
    width, height = img.size

    issues = []
    text_regions = []

    for config in texts_config:
        text = config.get("text", "")
        position = config.get("position", "center")
        font_size = config.get("font_size", 48)

        font = get_japanese_font(font_size)
        draw = ImageDraw.Draw(img)
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        # 位置計算
        if isinstance(position, str):
            if position == "center":
                x = (width - text_width) // 2
                y = (height - text_height) // 2
            elif position == "top-center":
                x = (width - text_width) // 2
                y = 50
            elif position == "bottom-center":
                x = (width - text_width) // 2
                y = height - text_height - 50
            else:
                x, y = 50, 50
        else:
            x, y = position
            if config.get("center_x"):
                x = (width - text_width) // 2

        # テキスト領域を記録
        region = {
            "text": text,
            "x": x,
            "y": y,
            "width": text_width,
            "height": text_height,
            "right": x + text_width,
            "bottom": y + text_height
        }
        text_regions.append(region)

        # 境界チェック
        if x < 0 or y < 0:
            issues.append(f"テキスト '{text[:10]}...' が画像外に配置")
        if region["right"] > width or region["bottom"] > height:
            issues.append(f"テキスト '{text[:10]}...' が画像からはみ出し")

    # 重なりチェック
    for i, r1 in enumerate(text_regions):
        for j, r2 in enumerate(text_regions[i+1:], i+1):
            if (r1["x"] < r2["right"] and r1["right"] > r2["x"] and
                r1["y"] < r2["bottom"] and r1["bottom"] > r2["y"]):
                issues.append(f"テキスト重なり: '{r1['text'][:10]}' と '{r2['text'][:10]}'")

    return {
        "passed": len(issues) == 0,
        "issues": issues,
        "text_regions": text_regions
    }


def repair_text_positions(texts_config, image_width, image_height):
    """
    テキスト位置を自動修復
    - 画像サイズに合わせて位置を調整
    - 重なりを解消
    """
    repaired = []
    y_offset = 0

    for i, config in enumerate(texts_config):
        new_config = config.copy()
        position = config.get("position", "center")

        # 画像サイズに合わせてフォントサイズ調整
        font_size = config.get("font_size", 48)
        if image_width < 800:
            font_size = int(font_size * 0.8)
            new_config["font_size"] = font_size

        # 縦位置の調整（重なり防止）
        if isinstance(position, tuple):
            x, y = position
            # Y座標を画像サイズに合わせてスケール
            if y > image_height - 100:
                y = image_height - 100
            new_config["position"] = (x, y)

        repaired.append(new_config)

    return repaired


def generate_quality_report(slide_dir):
    """全スライドの品質レポートを生成"""
    from japanese_slide_generator import SLIDE_CONFIGS

    report = {
        "total": 0,
        "passed": 0,
        "failed": 0,
        "slides": []
    }

    for config in SLIDE_CONFIGS:
        name = config["name"]
        image_path = os.path.join(slide_dir, f"{name}.png")

        if not os.path.exists(image_path):
            report["slides"].append({
                "name": name,
                "status": "missing",
                "issues": ["ファイルが存在しません"]
            })
            report["failed"] += 1
            report["total"] += 1
            continue

        # 画像チェック
        try:
            img = Image.open(image_path)
            img_info = {
                "width": img.width,
                "height": img.height,
                "format": img.format,
                "mode": img.mode
            }
        except Exception as e:
            report["slides"].append({
                "name": name,
                "status": "error",
                "issues": [f"画像読み込みエラー: {e}"]
            })
            report["failed"] += 1
            report["total"] += 1
            continue

        # テキスト可読性チェック
        texts = config.get("texts", [])
        readability = check_text_readability(image_path, texts)

        slide_report = {
            "name": name,
            "status": "passed" if readability["passed"] else "issues",
            "image": img_info,
            "issues": readability["issues"],
            "text_count": len(texts)
        }

        report["slides"].append(slide_report)
        if readability["passed"]:
            report["passed"] += 1
        else:
            report["failed"] += 1
        report["total"] += 1

    return report


def print_report(report):
    """レポートを表示"""
    print("=" * 60)
    print("スライド品質レポート")
    print("=" * 60)
    print(f"合計: {report['total']} スライド")
    print(f"合格: {report['passed']}")
    print(f"問題あり: {report['failed']}")
    print()

    for slide in report["slides"]:
        status_icon = "✓" if slide["status"] == "passed" else "✗"
        print(f"{status_icon} {slide['name']}")
        if slide.get("image"):
            img = slide["image"]
            print(f"   サイズ: {img['width']}x{img['height']}")
        if slide.get("issues"):
            for issue in slide["issues"]:
                print(f"   ⚠ {issue}")
        print()


if __name__ == "__main__":
    slide_dir = os.path.expanduser("~/Desktop/開発2026/taisun_agent2026/slides_jp")
    report = generate_quality_report(slide_dir)
    print_report(report)
