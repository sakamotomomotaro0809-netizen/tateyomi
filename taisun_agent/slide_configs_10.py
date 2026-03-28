#!/usr/bin/env python3
"""
追加10枚のスライド設定
目次ごとに2枚ずつ作成
"""

# 背景画像生成用プロンプト（テキストなし）
BG_PROMPTS = {
    # インストール (2枚)
    "slide6_install_mac": "anime style illustration, cute robot character helping with Mac computer setup, Apple MacBook on desk, clean modern workspace, step by step installation guide visualization, blue and silver color scheme, friendly tutorial atmosphere, no text, high quality",

    "slide7_install_windows": "anime style illustration, cute robot character helping with Windows PC setup, Windows laptop and desktop computer, colorful installation progress bars floating, modern office setting, blue and cyan color scheme, helpful guide atmosphere, no text, high quality",

    # 主要機能 (2枚)
    "slide8_skills": "anime style illustration, magical robot wizard character surrounded by floating skill icons and abilities, 68 different colored orbs representing skills, cosmic background with stars, purple and gold magical effects, powerful abilities showcase, no text, high quality",

    "slide9_agents": "anime style illustration, team of 85 cute mini robot agents working together, diverse robot characters with different specialties, collaborative teamwork scene, warm orange and blue colors, busy but organized atmosphere, no text, high quality",

    # 業種別活用事例 (2枚)
    "slide10_usecase_business": "anime style illustration, professional business robot in suit helping with documents charts and graphs, corporate office setting, productivity boost visualization, rising graph arrows, blue and green professional colors, no text, high quality",

    "slide11_usecase_creative": "anime style illustration, creative artist robot with paintbrush and camera, surrounded by artwork videos and designs, creative studio setting, colorful rainbow palette, artistic inspiration flowing, no text, high quality",

    # 13層防御システム (2枚)
    "slide12_defense_overview": "anime style illustration, powerful guardian robot standing in front of 13 layered digital shields, cybersecurity fortress visualization, glowing protective barriers, blue and gold defensive aura, impenetrable security concept, no text, high quality",

    "slide13_defense_detail": "anime style illustration, cross section view of 13 layer security system, each layer with different protection mechanism, shield knight robot explaining layers, technical diagram style but anime aesthetic, blue cyan security colors, no text, high quality",

    # 太陽スタイル (1枚)
    "slide14_taiyo_style": "anime style illustration, charismatic sales character with golden sun aura, persuasive copywriting magic flowing from hands, Japanese yen symbols and success imagery, warm golden and orange colors, powerful marketing energy, no text, high quality",

    # MCPツール (1枚)
    "slide15_mcp_tools": "anime style illustration, robot conductor orchestrating 227 floating tool icons, browser automation playwright robot, GitHub cat mascot, various API connectors, symphony of tools working in harmony, purple and teal tech colors, no text, high quality",
}

# スライド設定（テキストオーバーレイ用）
SLIDE_CONFIGS_10 = [
    {
        "name": "slide6_install_mac",
        "title_texts": [
            {
                "text": "Macへのインストール",
                "position": "top-center",
                "font_size": 56,
                "color": (255, 255, 255, 255),
                "outline_color": (0, 80, 160, 255),
                "outline_width": 5
            },
        ],
        "telop": "ターミナルで3つのコマンドを実行するだけ！初心者でも簡単セットアップ"
    },
    {
        "name": "slide7_install_windows",
        "title_texts": [
            {
                "text": "Windowsへのインストール",
                "position": "top-center",
                "font_size": 52,
                "color": (255, 255, 255, 255),
                "outline_color": (0, 120, 200, 255),
                "outline_width": 5
            },
        ],
        "telop": "PowerShellで簡単インストール！WSL不要で直接動作"
    },
    {
        "name": "slide8_skills",
        "title_texts": [
            {
                "text": "68の専門スキル",
                "position": "top-center",
                "font_size": 60,
                "color": (255, 220, 100, 255),
                "outline_color": (80, 0, 120, 255),
                "outline_width": 6
            },
        ],
        "telop": "コード生成・テスト・セキュリティ・ドキュメント作成まで全自動化"
    },
    {
        "name": "slide9_agents",
        "title_texts": [
            {
                "text": "85の専門エージェント",
                "position": "top-center",
                "font_size": 56,
                "color": (255, 255, 255, 255),
                "outline_color": (200, 80, 0, 255),
                "outline_width": 5
            },
        ],
        "telop": "planner・architect・tdd-guide・code-reviewer など用途別に最適化"
    },
    {
        "name": "slide10_usecase_business",
        "title_texts": [
            {
                "text": "ビジネス活用事例",
                "position": "top-center",
                "font_size": 56,
                "color": (255, 255, 255, 255),
                "outline_color": (0, 100, 80, 255),
                "outline_width": 5
            },
        ],
        "telop": "営業・マーケ・経理・人事｜業務効率化で残業ゼロを実現"
    },
    {
        "name": "slide11_usecase_creative",
        "title_texts": [
            {
                "text": "クリエイティブ活用事例",
                "position": "top-center",
                "font_size": 52,
                "color": (255, 255, 255, 255),
                "outline_color": (180, 0, 100, 255),
                "outline_width": 5
            },
        ],
        "telop": "デザイン・動画・ライティング・音楽｜AIがクリエイターをサポート"
    },
    {
        "name": "slide12_defense_overview",
        "title_texts": [
            {
                "text": "13層防御システム",
                "position": "top-center",
                "font_size": 60,
                "color": (100, 200, 255, 255),
                "outline_color": (0, 30, 80, 255),
                "outline_width": 6
            },
        ],
        "telop": "AIの暴走を防ぐ世界最高水準のセキュリティアーキテクチャ"
    },
    {
        "name": "slide13_defense_detail",
        "title_texts": [
            {
                "text": "防御レイヤー詳細",
                "position": "top-center",
                "font_size": 56,
                "color": (255, 255, 255, 255),
                "outline_color": (0, 60, 120, 255),
                "outline_width": 5
            },
        ],
        "telop": "Layer0:絶対ルール → Layer1-7:コアガード → Layer8-12:品質ガード"
    },
    {
        "name": "slide14_taiyo_style",
        "title_texts": [
            {
                "text": "太陽スタイル",
                "position": "top-center",
                "font_size": 64,
                "color": (255, 200, 50, 255),
                "outline_color": (180, 80, 0, 255),
                "outline_width": 6
            },
        ],
        "telop": "日給5000万円を生み出した176パターンのセールスライティング術"
    },
    {
        "name": "slide15_mcp_tools",
        "title_texts": [
            {
                "text": "227のMCPツール",
                "position": "top-center",
                "font_size": 60,
                "color": (200, 150, 255, 255),
                "outline_color": (60, 0, 100, 255),
                "outline_width": 6
            },
        ],
        "telop": "Playwright・GitHub・Pexels・Pixabay など外部サービスと完全連携"
    },
]
