#!/usr/bin/env python3
"""
TAISUN Agent 完全ガイド - スライド生成スクリプト
1枚ずつ丁寧に生成、5枚ごとにチェック
"""

import os
import subprocess
from japanese_slide_generator_v2 import create_slide_with_telop

OUTPUT_DIR = os.path.expanduser("~/Desktop/開発2026/taisun_agent2026/slides_full_guide")

def generate_single_slide(config):
    """1枚のスライドを生成"""
    num = config["num"]
    name = config["name"]
    bg_prompt = config["bg_prompt"]
    title_texts = config["title_texts"]
    telop = config["telop"]

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    bg_path = os.path.join(OUTPUT_DIR, f"{name}_bg.png")
    final_path = os.path.join(OUTPUT_DIR, f"{name}.png")

    print(f"\n{'='*60}")
    print(f"スライド {num}: {name}")
    print(f"{'='*60}")

    # 1. 背景画像生成
    print("1. 背景画像を生成中...")
    skill_path = os.path.expanduser("~/.claude/skills/nanobanana-pro")

    try:
        result = subprocess.run(
            ["python3", "scripts/run.py", "image_generator.py",
             "--prompt", bg_prompt,
             "--output", bg_path],
            cwd=skill_path,
            capture_output=True,
            text=True,
            timeout=180
        )

        if os.path.exists(bg_path):
            print(f"   ✓ 背景完了: {bg_path}")
        else:
            print(f"   ✗ 背景生成失敗")
            return None
    except Exception as e:
        print(f"   ✗ エラー: {e}")
        return None

    # 2. テキストオーバーレイ
    print("2. テキストオーバーレイ中...")
    try:
        create_slide_with_telop(bg_path, final_path, title_texts, telop)
        print(f"   ✓ スライド完了: {final_path}")
        return final_path
    except Exception as e:
        print(f"   ✗ オーバーレイエラー: {e}")
        return None


def generate_batch(configs, batch_name):
    """バッチでスライドを生成"""
    print(f"\n{'#'*60}")
    print(f"# {batch_name}")
    print(f"{'#'*60}")

    results = []
    for config in configs:
        result = generate_single_slide(config)
        results.append({
            "num": config["num"],
            "name": config["name"],
            "success": result is not None,
            "path": result
        })

    # サマリー
    print(f"\n{'='*60}")
    print(f"{batch_name} - 生成結果")
    print(f"{'='*60}")
    success = sum(1 for r in results if r["success"])
    print(f"成功: {success}/{len(results)}")
    for r in results:
        status = "✓" if r["success"] else "✗"
        print(f"  {status} [{r['num']:03d}] {r['name']}")

    return results


if __name__ == "__main__":
    import sys
    from full_guide_config import PART1_INTRO, PART2_TERMINOLOGY, PART3_MCP, PART4_AGENTS
    from full_guide_config_part2 import PART5_SKILLS, PART6_MAC, PART7_WIN, PART8_UPDATE
    from full_guide_config_part3 import PART9_USECASES, PART10_SECURITY, PART11_SDD, PART12_SUMMARY

    if len(sys.argv) > 1:
        part = sys.argv[1]
    else:
        part = "1"

    if part == "1":
        print("TAISUN Agent 完全ガイド - Part 1 生成開始")
        results = generate_batch(PART1_INTRO, "Part 1: はじめに")
    elif part == "2":
        print("TAISUN Agent 完全ガイド - Part 2 生成開始")
        results = generate_batch(PART2_TERMINOLOGY, "Part 2: 専門用語解説")
    elif part == "3":
        print("TAISUN Agent 完全ガイド - Part 3 生成開始")
        results = generate_batch(PART3_MCP, "Part 3: MCPの詳細解説")
    elif part == "4":
        print("TAISUN Agent 完全ガイド - Part 4 生成開始")
        results = generate_batch(PART4_AGENTS, "Part 4: エージェントの詳細解説")
    elif part == "5":
        print("TAISUN Agent 完全ガイド - Part 5 生成開始")
        results = generate_batch(PART5_SKILLS, "Part 5: スキルの詳細解説")
    elif part == "6":
        print("TAISUN Agent 完全ガイド - Part 6 生成開始")
        results = generate_batch(PART6_MAC, "Part 6: Macインストール")
    elif part == "7":
        print("TAISUN Agent 完全ガイド - Part 7 生成開始")
        results = generate_batch(PART7_WIN, "Part 7: Windowsインストール")
    elif part == "8":
        print("TAISUN Agent 完全ガイド - Part 8 生成開始")
        results = generate_batch(PART8_UPDATE, "Part 8: アップデートと管理")
    elif part == "9":
        print("TAISUN Agent 完全ガイド - Part 9 生成開始")
        results = generate_batch(PART9_USECASES, "Part 9: 業種別活用事例")
    elif part == "10":
        print("TAISUN Agent 完全ガイド - Part 10 生成開始")
        results = generate_batch(PART10_SECURITY, "Part 10: 13層防御システム")
    elif part == "11":
        print("TAISUN Agent 完全ガイド - Part 11 生成開始")
        results = generate_batch(PART11_SDD, "Part 11: 要件定義SDD詳細")
    elif part == "12":
        print("TAISUN Agent 完全ガイド - Part 12 生成開始")
        results = generate_batch(PART12_SUMMARY, "Part 12: まとめ")

    print(f"\n出力先: {OUTPUT_DIR}")
