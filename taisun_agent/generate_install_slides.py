#!/usr/bin/env python3
"""
インストール手順スライドを生成
"""

import os
import subprocess
from install_slides_config import INSTALL_BG_PROMPTS, INSTALL_SLIDES_MAC, INSTALL_SLIDES_WIN
from japanese_slide_generator_v2 import create_slide_with_telop

def generate_background(name, prompt, output_dir):
    """NanoBanana Proで背景画像を生成"""
    skill_path = os.path.expanduser("~/.claude/skills/nanobanana-pro")
    output_path = os.path.join(output_dir, f"{name}_bg.png")

    print(f"  背景生成中: {name}")

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
            print(f"  ✓ 背景完了")
            return output_path
        else:
            print(f"  ✗ 背景失敗")
            return None
    except Exception as e:
        print(f"  ✗ エラー: {e}")
        return None

def generate_slides(slides_config, bg_prompts, output_dir, prefix=""):
    """スライドを生成"""
    results = []

    for config in slides_config:
        name = config["name"]
        print(f"\n[{prefix}{name}]")

        # 背景画像生成
        prompt = bg_prompts.get(name, "")
        if not prompt:
            print(f"  ✗ プロンプトなし")
            continue

        bg_path = generate_background(name, prompt, output_dir)
        if not bg_path:
            continue

        # テキストオーバーレイ
        output_path = os.path.join(output_dir, f"{name}.png")
        try:
            create_slide_with_telop(
                bg_path,
                output_path,
                config["title_texts"],
                config["telop"]
            )
            print(f"  ✓ スライド完了: {output_path}")
            results.append(output_path)
        except Exception as e:
            print(f"  ✗ オーバーレイエラー: {e}")

    return results

def main():
    output_dir = os.path.expanduser("~/Desktop/開発2026/taisun_agent2026/slides_install")
    os.makedirs(output_dir, exist_ok=True)

    print("=" * 60)
    print("インストール手順スライド生成")
    print("=" * 60)

    # Mac編を生成
    print("\n" + "=" * 60)
    print("【Mac編】6枚")
    print("=" * 60)
    mac_results = generate_slides(INSTALL_SLIDES_MAC, INSTALL_BG_PROMPTS, output_dir, "Mac ")

    print("\n" + "=" * 60)
    print(f"生成完了: Mac編 {len(mac_results)}/6 枚")
    print(f"出力先: {output_dir}")
    print("=" * 60)

if __name__ == "__main__":
    main()
