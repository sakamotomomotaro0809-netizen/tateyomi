#!/usr/bin/env python3
"""
インストール手順スライド設定
Mac編 6枚 + Windows編 6枚
"""

# 背景画像生成用プロンプト
INSTALL_BG_PROMPTS = {
    # Mac編
    "mac_step1_terminal": "anime style illustration, cute robot character pointing at Mac computer screen showing Finder window with Applications and Utilities folders highlighted, MacBook on clean desk, step 1 tutorial style, bright helpful atmosphere, arrow pointing to Terminal app icon, no text, high quality",

    "mac_step2_homebrew": "anime style illustration, cute robot character typing on MacBook keyboard, terminal window showing command line with brewing beer mug icon for Homebrew, installation progress bar, coding atmosphere, green terminal text on black background style, no text, high quality",

    "mac_step3_nodejs": "anime style illustration, cute robot character celebrating as Node.js green hexagon logo appears on Mac screen, terminal showing successful installation, happy achievement moment, green and white colors, no text, high quality",

    "mac_step4_claude": "anime style illustration, cute robot character installing Claude Code on Mac, terminal showing npm install command, Anthropic logo floating, purple and orange gradient accents, installation in progress visualization, no text, high quality",

    "mac_step5_taisun": "anime style illustration, cute robot character downloading TAISUN from GitHub, terminal showing git clone command, file download progress, GitHub octocat mascot helping, blue and purple tech colors, no text, high quality",

    "mac_step6_auth": "anime style illustration, cute robot character completing authentication, browser window showing login success checkmark, Mac and browser side by side, celebration confetti, green success colors, welcome screen, no text, high quality",

    # Windows編
    "win_step1_powershell": "anime style illustration, cute robot character pointing at Windows PC screen showing Start menu search for PowerShell, right-click context menu visible, Windows 11 style interface, blue Windows colors, helpful tutorial atmosphere, no text, high quality",

    "win_step2_nodejs_download": "anime style illustration, cute robot character browsing nodejs.org website on Windows PC, download button highlighted, Node.js green logo prominent, browser download dialog, helpful guide pointing, no text, high quality",

    "win_step3_nodejs_install": "anime style illustration, cute robot character clicking Next button on Windows installer wizard, Node.js setup window with progress bar, simple easy installation visualization, green checkmarks, no text, high quality",

    "win_step4_claude": "anime style illustration, cute robot character running npm command in PowerShell blue window, Claude Code installation progress, Windows terminal style, purple Anthropic accents, installation loading, no text, high quality",

    "win_step5_taisun": "anime style illustration, cute robot character setting up TAISUN on Windows, PowerShell showing setup script running, configuration files appearing, blue and gold colors, progress indication, no text, high quality",

    "win_step6_auth": "anime style illustration, cute robot character completing Windows authentication for Claude, Edge browser showing login success, Windows PC with celebration effects, green checkmark success, welcome complete, no text, high quality",
}

# スライド設定（テキストオーバーレイ用）
INSTALL_SLIDES_MAC = [
    {
        "name": "mac_step1_terminal",
        "title_texts": [
            {
                "text": "STEP 1",
                "position": (30, 25),
                "font_size": 32,
                "color": (100, 200, 255, 255),
                "outline_color": (0, 50, 100, 255),
                "outline_width": 3
            },
            {
                "text": "ターミナルを開く",
                "position": (30, 65),
                "font_size": 48,
                "color": (255, 255, 255, 255),
                "outline_color": (0, 60, 120, 255),
                "outline_width": 5
            },
        ],
        "telop": "Finder →「アプリケーション」→「ユーティリティ」→「ターミナル」"
    },
    {
        "name": "mac_step2_homebrew",
        "title_texts": [
            {
                "text": "STEP 2",
                "position": (30, 25),
                "font_size": 32,
                "color": (100, 200, 255, 255),
                "outline_color": (0, 50, 100, 255),
                "outline_width": 3
            },
            {
                "text": "Homebrewをインストール",
                "position": (30, 65),
                "font_size": 44,
                "color": (255, 255, 255, 255),
                "outline_color": (0, 80, 40, 255),
                "outline_width": 5
            },
        ],
        "telop": "コマンド: /bin/bash -c \"$(curl -fsSL https://brew.sh/install.sh)\""
    },
    {
        "name": "mac_step3_nodejs",
        "title_texts": [
            {
                "text": "STEP 3",
                "position": (30, 25),
                "font_size": 32,
                "color": (100, 200, 255, 255),
                "outline_color": (0, 50, 100, 255),
                "outline_width": 3
            },
            {
                "text": "Node.jsをインストール",
                "position": (30, 65),
                "font_size": 46,
                "color": (255, 255, 255, 255),
                "outline_color": (0, 100, 50, 255),
                "outline_width": 5
            },
        ],
        "telop": "コマンド: brew install node （約2分で完了）"
    },
    {
        "name": "mac_step4_claude",
        "title_texts": [
            {
                "text": "STEP 4",
                "position": (30, 25),
                "font_size": 32,
                "color": (100, 200, 255, 255),
                "outline_color": (0, 50, 100, 255),
                "outline_width": 3
            },
            {
                "text": "Claude Codeをインストール",
                "position": (30, 65),
                "font_size": 42,
                "color": (255, 255, 255, 255),
                "outline_color": (100, 50, 0, 255),
                "outline_width": 5
            },
        ],
        "telop": "コマンド: npm install -g @anthropic-ai/claude-code"
    },
    {
        "name": "mac_step5_taisun",
        "title_texts": [
            {
                "text": "STEP 5",
                "position": (30, 25),
                "font_size": 32,
                "color": (100, 200, 255, 255),
                "outline_color": (0, 50, 100, 255),
                "outline_width": 3
            },
            {
                "text": "TAISUN Agentをセットアップ",
                "position": (30, 65),
                "font_size": 40,
                "color": (255, 255, 255, 255),
                "outline_color": (80, 0, 120, 255),
                "outline_width": 5
            },
        ],
        "telop": "コマンド: git clone → セットアップスクリプトを実行"
    },
    {
        "name": "mac_step6_auth",
        "title_texts": [
            {
                "text": "STEP 6",
                "position": (30, 25),
                "font_size": 32,
                "color": (100, 200, 255, 255),
                "outline_color": (0, 50, 100, 255),
                "outline_width": 3
            },
            {
                "text": "初回認証を完了",
                "position": (30, 65),
                "font_size": 48,
                "color": (255, 255, 255, 255),
                "outline_color": (0, 120, 60, 255),
                "outline_width": 5
            },
        ],
        "telop": "claude を実行 → ブラウザでAnthropicにログイン → 完了！"
    },
]

INSTALL_SLIDES_WIN = [
    {
        "name": "win_step1_powershell",
        "title_texts": [
            {
                "text": "STEP 1",
                "position": (30, 25),
                "font_size": 32,
                "color": (100, 200, 255, 255),
                "outline_color": (0, 50, 100, 255),
                "outline_width": 3
            },
            {
                "text": "PowerShellを開く",
                "position": (30, 65),
                "font_size": 48,
                "color": (255, 255, 255, 255),
                "outline_color": (0, 80, 160, 255),
                "outline_width": 5
            },
        ],
        "telop": "スタート →「PowerShell」検索 → 右クリック →「管理者として実行」"
    },
    {
        "name": "win_step2_nodejs_download",
        "title_texts": [
            {
                "text": "STEP 2",
                "position": (30, 25),
                "font_size": 32,
                "color": (100, 200, 255, 255),
                "outline_color": (0, 50, 100, 255),
                "outline_width": 3
            },
            {
                "text": "Node.jsをダウンロード",
                "position": (30, 65),
                "font_size": 44,
                "color": (255, 255, 255, 255),
                "outline_color": (0, 100, 50, 255),
                "outline_width": 5
            },
        ],
        "telop": "nodejs.org にアクセス →「LTS版」をダウンロード"
    },
    {
        "name": "win_step3_nodejs_install",
        "title_texts": [
            {
                "text": "STEP 3",
                "position": (30, 25),
                "font_size": 32,
                "color": (100, 200, 255, 255),
                "outline_color": (0, 50, 100, 255),
                "outline_width": 3
            },
            {
                "text": "インストーラーを実行",
                "position": (30, 65),
                "font_size": 46,
                "color": (255, 255, 255, 255),
                "outline_color": (0, 100, 50, 255),
                "outline_width": 5
            },
        ],
        "telop": "ダウンロードしたファイルを開く →「Next」を押し続けるだけ！"
    },
    {
        "name": "win_step4_claude",
        "title_texts": [
            {
                "text": "STEP 4",
                "position": (30, 25),
                "font_size": 32,
                "color": (100, 200, 255, 255),
                "outline_color": (0, 50, 100, 255),
                "outline_width": 3
            },
            {
                "text": "Claude Codeをインストール",
                "position": (30, 65),
                "font_size": 42,
                "color": (255, 255, 255, 255),
                "outline_color": (100, 50, 0, 255),
                "outline_width": 5
            },
        ],
        "telop": "コマンド: npm install -g @anthropic-ai/claude-code"
    },
    {
        "name": "win_step5_taisun",
        "title_texts": [
            {
                "text": "STEP 5",
                "position": (30, 25),
                "font_size": 32,
                "color": (100, 200, 255, 255),
                "outline_color": (0, 50, 100, 255),
                "outline_width": 3
            },
            {
                "text": "TAISUN Agentをセットアップ",
                "position": (30, 65),
                "font_size": 40,
                "color": (255, 255, 255, 255),
                "outline_color": (80, 0, 120, 255),
                "outline_width": 5
            },
        ],
        "telop": "セットアップコマンドを実行してTAISUNを導入"
    },
    {
        "name": "win_step6_auth",
        "title_texts": [
            {
                "text": "STEP 6",
                "position": (30, 25),
                "font_size": 32,
                "color": (100, 200, 255, 255),
                "outline_color": (0, 50, 100, 255),
                "outline_width": 3
            },
            {
                "text": "初回認証を完了",
                "position": (30, 65),
                "font_size": 48,
                "color": (255, 255, 255, 255),
                "outline_color": (0, 120, 60, 255),
                "outline_width": 5
            },
        ],
        "telop": "claude を実行 → ブラウザでAnthropicにログイン → 完了！"
    },
]
