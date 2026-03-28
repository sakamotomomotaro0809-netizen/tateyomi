#!/usr/bin/env python3
"""
10枚のスライドを生成
"""

import os
import subprocess
from slide_configs_10 import BG_PROMPTS, SLIDE_CONFIGS_10
from japanese_slide_generator_v2 import create_slide_with_telop

def generate_background(name, prompt, output_dir):
    """NanoBanana Proで背景画像を生成"""
    skill_path = os.path.expanduser("~/.claude/skills/nanobanana-pro")
    output_path = os.path.join(output_dir, f"{name}_bg.png")

    print(f"  背景生成中: {name}")

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
        print(f"  ✓ 背景完了: {output_path}")
        return output_path
    else:
        print(f"  ✗ 背景失敗: {name}")
        return None

def main():
    output_dir = os.path.expanduser("~/Desktop/開発2026/taisun_agent2026/slides_jp_v2")
    os.makedirs(output_dir, exist_ok=True)

    print("=" * 60)
    print("10枚のスライド生成開始")
    print("=" * 60)

    # 1. 背景画像を生成
    print("\n[Phase 1] 背景画像生成")
    bg_results = {}
    for name, prompt in BG_PROMPTS.items():
        print(f"\n{name}:")
        bg_path = generate_background(name, prompt, output_dir)
        bg_results[name] = bg_path

    # 2. テキストオーバーレイ
    print("\n" + "=" * 60)
    print("[Phase 2] テキストオーバーレイ")

    for config in SLIDE_CONFIGS_10:
        name = config["name"]
        bg_path = bg_results.get(name)

        if not bg_path or not os.path.exists(bg_path):
            print(f"  ✗ スキップ: {name} (背景なし)")
            continue

        output_path = os.path.join(output_dir, f"{name}.png")

        try:
            create_slide_with_telop(
                bg_path,
                output_path,
                config["title_texts"],
                config["telop"]
            )
            print(f"  ✓ 完了: {name}")
        except Exception as e:
            print(f"  ✗ エラー: {name} - {e}")

    print("\n" + "=" * 60)
    print("完了！")
    print(f"出力先: {output_dir}")

if __name__ == "__main__":
    main()
