#!/usr/bin/env python3
"""
TAISUN Agent 完全ガイド - 全101枚のスライド設定
"""

# Part 1: はじめに（5枚）
PART1_INTRO = [
    {
        "num": 1,
        "name": "p01_cover",
        "bg_prompt": "anime style illustration, epic hero robot character standing proudly with golden aura, futuristic AI technology background with floating skill icons and shield layers, professional blue and gold color scheme, inspiring cover image, no text, high quality, 16:9",
        "title_texts": [
            {"text": "TAISUN Agent", "position": "top-center", "font_size": 72, "color": (255, 220, 50, 255), "outline_color": (0, 40, 100, 255), "outline_width": 6},
            {"text": "完全ガイド", "position": (0, 130), "center_x": True, "font_size": 56, "color": (255, 255, 255, 255), "outline_color": (0, 40, 100, 255), "outline_width": 5},
        ],
        "telop": "68スキル × 85エージェント × 227MCPツール × 13層防御システム"
    },
    {
        "num": 2,
        "name": "p02_target_audience",
        "bg_prompt": "anime style illustration, diverse group of cute characters representing different professions - programmer with laptop, business person in suit, artist with paintbrush, marketer with charts, all looking excited and welcoming, bright colorful atmosphere, inclusive friendly vibe, no text, high quality",
        "title_texts": [
            {"text": "このガイドの対象者", "position": "top-center", "font_size": 56, "color": (255, 255, 255, 255), "outline_color": (100, 50, 0, 255), "outline_width": 5},
        ],
        "telop": "プログラマー・経営者・マーケター・クリエイター・初心者すべての方へ"
    },
    {
        "num": 3,
        "name": "p03_learning_objectives",
        "bg_prompt": "anime style illustration, cute robot teacher pointing at floating checklist with glowing checkmarks, educational classroom atmosphere, holographic learning path showing progression from beginner to expert, bright encouraging colors, no text, high quality",
        "title_texts": [
            {"text": "このガイドで学べること", "position": "top-center", "font_size": 52, "color": (255, 255, 255, 255), "outline_color": (0, 80, 120, 255), "outline_width": 5},
        ],
        "telop": "基礎知識 → インストール → 機能詳細 → 活用事例 → セキュリティ → 要件定義"
    },
    {
        "num": 4,
        "name": "p04_what_is_taisun",
        "bg_prompt": "anime style illustration, powerful robot character with multiple arms holding various tools, Claude AI logo inspired design, expansion pack concept with many floating abilities and features around the character, purple and cyan tech colors, impressive capability showcase, no text, high quality",
        "title_texts": [
            {"text": "TAISUN Agentとは？", "position": "top-center", "font_size": 56, "color": (255, 255, 255, 255), "outline_color": (80, 0, 120, 255), "outline_width": 5},
        ],
        "telop": "Claude Codeを超強化するオールインワン拡張パック"
    },
    {
        "num": 5,
        "name": "p05_difference",
        "bg_prompt": "anime style illustration, split screen comparison - left side shows simple chatbot with speech bubble, right side shows powerful robot actually building and creating things with tools, action vs just talking visualization, dramatic difference, no text, high quality",
        "title_texts": [
            {"text": "従来のAIツールとの違い", "position": "top-center", "font_size": 52, "color": (255, 255, 255, 255), "outline_color": (0, 100, 80, 255), "outline_width": 5},
        ],
        "telop": "単なるチャットAIではない「自分で考えて実行できるAI」"
    },
]

# Part 2: 専門用語解説（8枚）
PART2_TERMINOLOGY = [
    {
        "num": 6,
        "name": "p06_term_ai_agent",
        "bg_prompt": "anime style illustration, autonomous robot character making decisions and taking actions on its own, thought bubble showing planning process, arrows showing input to action flow, self-driving concept visualization, blue and white clean design, no text, high quality",
        "title_texts": [
            {"text": "【用語解説】", "position": (30, 25), "font_size": 28, "color": (100, 200, 255, 255), "outline_color": (0, 50, 100, 255), "outline_width": 3},
            {"text": "AIエージェントとは？", "position": (30, 60), "font_size": 48, "color": (255, 255, 255, 255), "outline_color": (0, 80, 160, 255), "outline_width": 5},
        ],
        "telop": "人間の指示を理解し、自分で考えて実行するAIプログラム"
    },
    {
        "num": 7,
        "name": "p07_term_claude_code",
        "bg_prompt": "anime style illustration, cute robot character working at terminal command line interface, black screen with colorful code, Anthropic purple and orange brand colors, professional developer environment, coding atmosphere, no text, high quality",
        "title_texts": [
            {"text": "【用語解説】", "position": (30, 25), "font_size": 28, "color": (100, 200, 255, 255), "outline_color": (0, 50, 100, 255), "outline_width": 3},
            {"text": "Claude Codeとは？", "position": (30, 60), "font_size": 48, "color": (255, 255, 255, 255), "outline_color": (120, 60, 0, 255), "outline_width": 5},
        ],
        "telop": "Anthropic社が提供するコマンドライン型AIアシスタント"
    },
    {
        "num": 8,
        "name": "p08_term_mcp",
        "bg_prompt": "anime style illustration, cute connector robot character acting as bridge between AI brain and various service icons (browser, database, files, APIs), universal adapter concept, connection lines glowing, tech blue and purple colors, no text, high quality",
        "title_texts": [
            {"text": "【用語解説】", "position": (30, 25), "font_size": 28, "color": (100, 200, 255, 255), "outline_color": (0, 50, 100, 255), "outline_width": 3},
            {"text": "MCPとは？", "position": (30, 60), "font_size": 52, "color": (255, 255, 255, 255), "outline_color": (80, 0, 120, 255), "outline_width": 5},
        ],
        "telop": "Model Context Protocol：AIと外部ツールをつなぐ共通規格"
    },
    {
        "num": 9,
        "name": "p09_term_skill",
        "bg_prompt": "anime style illustration, magical recipe book with glowing skill icons floating out of pages, robot chef character following recipe steps, cooking analogy for programming skills, warm golden and purple magic effects, no text, high quality",
        "title_texts": [
            {"text": "【用語解説】", "position": (30, 25), "font_size": 28, "color": (100, 200, 255, 255), "outline_color": (0, 50, 100, 255), "outline_width": 3},
            {"text": "スキルとは？", "position": (30, 60), "font_size": 52, "color": (255, 255, 255, 255), "outline_color": (150, 100, 0, 255), "outline_width": 5},
        ],
        "telop": "特定タスクを実行するための命令セット（料理のレシピのようなもの）"
    },
    {
        "num": 10,
        "name": "p10_term_agent",
        "bg_prompt": "anime style illustration, team of specialized robot experts - doctor robot, engineer robot, artist robot, analyst robot working together, each with unique tools and appearance, collaborative teamwork atmosphere, colorful diverse team, no text, high quality",
        "title_texts": [
            {"text": "【用語解説】", "position": (30, 25), "font_size": 28, "color": (100, 200, 255, 255), "outline_color": (0, 50, 100, 255), "outline_width": 3},
            {"text": "エージェントとは？", "position": (30, 60), "font_size": 48, "color": (255, 255, 255, 255), "outline_color": (0, 100, 80, 255), "outline_width": 5},
        ],
        "telop": "専門分野を持つAIの「専門家」チームメンバー"
    },
    {
        "num": 11,
        "name": "p11_term_prompt",
        "bg_prompt": "anime style illustration, person typing message to friendly robot assistant, speech bubble with question marks transforming into clear instructions, communication concept, warm friendly interaction, input field glowing, no text, high quality",
        "title_texts": [
            {"text": "【用語解説】", "position": (30, 25), "font_size": 28, "color": (100, 200, 255, 255), "outline_color": (0, 50, 100, 255), "outline_width": 3},
            {"text": "プロンプトとは？", "position": (30, 60), "font_size": 48, "color": (255, 255, 255, 255), "outline_color": (0, 80, 120, 255), "outline_width": 5},
        ],
        "telop": "AIへの指示文（お願いの仕方・質問の書き方）"
    },
    {
        "num": 12,
        "name": "p12_term_token",
        "bg_prompt": "anime style illustration, cute robot counting colorful letter blocks and word pieces, calculator showing cost, text being broken into small units visualization, money and measurement concept, educational diagram style, no text, high quality",
        "title_texts": [
            {"text": "【用語解説】", "position": (30, 25), "font_size": 28, "color": (100, 200, 255, 255), "outline_color": (0, 50, 100, 255), "outline_width": 3},
            {"text": "トークンとは？", "position": (30, 60), "font_size": 48, "color": (255, 255, 255, 255), "outline_color": (0, 120, 60, 255), "outline_width": 5},
        ],
        "telop": "AIが処理する文字の単位（料金計算や制限の基準になる）"
    },
    {
        "num": 13,
        "name": "p13_term_context",
        "bg_prompt": "anime style illustration, robot with thought bubble showing conversation history as connected speech bubbles, memory and context visualization, timeline of conversation flowing, understanding concept, purple and blue gradient, no text, high quality",
        "title_texts": [
            {"text": "【用語解説】", "position": (30, 25), "font_size": 28, "color": (100, 200, 255, 255), "outline_color": (0, 50, 100, 255), "outline_width": 3},
            {"text": "コンテキストとは？", "position": (30, 60), "font_size": 48, "color": (255, 255, 255, 255), "outline_color": (80, 0, 100, 255), "outline_width": 5},
        ],
        "telop": "AIが覚えている会話の文脈・背景情報（話の流れ）"
    },
]

# Part 3: MCPの詳細解説（10枚）
PART3_MCP = [
    {
        "num": 14,
        "name": "p14_mcp_overview",
        "bg_prompt": "anime style illustration, grand system architecture diagram with cute robot as central hub connecting to many floating service icons, web browser database file cloud API all connected by glowing lines, tech blueprint style, blue and cyan colors, no text, high quality",
        "title_texts": [
            {"text": "MCPの全体像", "position": "top-center", "font_size": 56, "color": (255, 255, 255, 255), "outline_color": (0, 60, 120, 255), "outline_width": 5},
        ],
        "telop": "AIとWebサービス・ファイル・データベースをつなぐ「翻訳者」"
    },
    {
        "num": 15,
        "name": "p15_mcp_without",
        "bg_prompt": "anime style illustration, frustrated robot trying to connect to many different services with tangled messy wires, chaos and confusion, each service speaking different language, red warning signs, stressed atmosphere, no text, high quality",
        "title_texts": [
            {"text": "MCPがない世界", "position": "top-center", "font_size": 56, "color": (255, 200, 200, 255), "outline_color": (120, 0, 0, 255), "outline_width": 5},
        ],
        "telop": "各サービスごとに別々の接続方法が必要で非効率"
    },
    {
        "num": 16,
        "name": "p16_mcp_with",
        "bg_prompt": "anime style illustration, happy robot smoothly connecting to all services through one universal adapter, clean organized connections, all services speaking same language, green success indicators, harmonious atmosphere, no text, high quality",
        "title_texts": [
            {"text": "MCPがある世界", "position": "top-center", "font_size": 56, "color": (200, 255, 200, 255), "outline_color": (0, 100, 0, 255), "outline_width": 5},
        ],
        "telop": "1つの共通規格ですべてのサービスと簡単に接続"
    },
    {
        "num": 17,
        "name": "p17_mcp_playwright",
        "bg_prompt": "anime style illustration, robot puppeteer controlling web browser like marionette, browser window showing automated clicks and typing, web automation visualization, Playwright logo inspired, purple and blue tech colors, no text, high quality",
        "title_texts": [
            {"text": "【MCP】Playwright", "position": "top-center", "font_size": 52, "color": (255, 255, 255, 255), "outline_color": (80, 0, 120, 255), "outline_width": 5},
        ],
        "telop": "ブラウザ自動操作：Webサイトの閲覧・入力・クリックを自動化"
    },
    {
        "num": 18,
        "name": "p18_mcp_github",
        "bg_prompt": "anime style illustration, robot working with GitHub octocat mascot, code repository visualization, branches and commits floating, collaborative coding atmosphere, GitHub black and white with colorful code, no text, high quality",
        "title_texts": [
            {"text": "【MCP】GitHub連携", "position": "top-center", "font_size": 52, "color": (255, 255, 255, 255), "outline_color": (30, 30, 30, 255), "outline_width": 5},
        ],
        "telop": "コード管理：リポジトリ作成・コミット・PR作成を自動化"
    },
    {
        "num": 19,
        "name": "p19_mcp_images",
        "bg_prompt": "anime style illustration, robot photographer browsing through floating beautiful photographs, Pexels and Pixabay style image gallery, free stock photos visualization, camera and gallery icons, colorful artistic atmosphere, no text, high quality",
        "title_texts": [
            {"text": "【MCP】画像取得", "position": "top-center", "font_size": 52, "color": (255, 255, 255, 255), "outline_color": (0, 100, 100, 255), "outline_width": 5},
        ],
        "telop": "Pexels・Pixabay：商用利用可能な画像を自動検索・ダウンロード"
    },
    {
        "num": 20,
        "name": "p20_mcp_files",
        "bg_prompt": "anime style illustration, robot librarian organizing floating files and folders, file system visualization, documents being read written and transformed, organized digital library, warm orange and blue colors, no text, high quality",
        "title_texts": [
            {"text": "【MCP】ファイル操作", "position": "top-center", "font_size": 52, "color": (255, 255, 255, 255), "outline_color": (150, 80, 0, 255), "outline_width": 5},
        ],
        "telop": "ファイルの読み書き・整理・変換・検索を自動化"
    },
    {
        "num": 21,
        "name": "p21_mcp_database",
        "bg_prompt": "anime style illustration, robot database administrator working with floating data tables and SQL queries, database cylinders and data flow visualization, structured data organization, tech green and blue colors, no text, high quality",
        "title_texts": [
            {"text": "【MCP】データベース連携", "position": "top-center", "font_size": 48, "color": (255, 255, 255, 255), "outline_color": (0, 80, 60, 255), "outline_width": 5},
        ],
        "telop": "データの取得・更新・分析・レポート作成を自動化"
    },
    {
        "num": 22,
        "name": "p22_mcp_api",
        "bg_prompt": "anime style illustration, robot diplomat connecting different API service icons with handshakes, REST API visualization, JSON data flowing between services, universal translator concept, tech purple and cyan colors, no text, high quality",
        "title_texts": [
            {"text": "【MCP】API連携", "position": "top-center", "font_size": 52, "color": (255, 255, 255, 255), "outline_color": (100, 0, 100, 255), "outline_width": 5},
        ],
        "telop": "外部サービスのAPIを簡単に呼び出し・データ連携"
    },
    {
        "num": 23,
        "name": "p23_mcp_227tools",
        "bg_prompt": "anime style illustration, massive showcase of 227 floating tool icons organized by category, robot conductor orchestrating all tools, impressive scale visualization, tool categories highlighted, rainbow of colors organized, no text, high quality",
        "title_texts": [
            {"text": "227のMCPツール一覧", "position": "top-center", "font_size": 52, "color": (255, 220, 100, 255), "outline_color": (80, 40, 0, 255), "outline_width": 5},
        ],
        "telop": "ブラウザ・ファイル・画像・動画・DB・APIなど全カテゴリを網羅"
    },
]

# Part 4: エージェントの詳細解説（12枚）
PART4_AGENTS = [
    {
        "num": 24,
        "name": "p24_agent_role",
        "bg_prompt": "anime style illustration, team of expert robot specialists each with unique professional outfit and tools, doctor engineer artist analyst working together, expert team concept, professional atmosphere, no text, high quality",
        "title_texts": [
            {"text": "エージェントの役割とは？", "position": "top-center", "font_size": 52, "color": (255, 255, 255, 255), "outline_color": (0, 80, 120, 255), "outline_width": 5},
        ],
        "telop": "特定分野の専門知識を持つAIの「専門家」"
    },
    {
        "num": 25,
        "name": "p25_why_multiple",
        "bg_prompt": "anime style illustration, comparison between one stressed robot trying to do everything vs happy team of specialized robots each doing their job well, teamwork wins concept, split screen style, no text, high quality",
        "title_texts": [
            {"text": "なぜ複数のエージェント？", "position": "top-center", "font_size": 52, "color": (255, 255, 255, 255), "outline_color": (100, 50, 0, 255), "outline_width": 5},
        ],
        "telop": "1人の万能選手より、専門家チームの方が高品質"
    },
    {
        "num": 26,
        "name": "p26_agent_planner",
        "bg_prompt": "anime style illustration, architect robot drawing blueprints and planning diagrams, strategic thinking visualization, flowcharts and planning boards floating, blue and white professional colors, no text, high quality",
        "title_texts": [
            {"text": "【計画系】planner", "position": "top-center", "font_size": 52, "color": (255, 255, 255, 255), "outline_color": (0, 60, 120, 255), "outline_width": 5},
        ],
        "telop": "実装前に計画を立て、リスクを洗い出す設計者"
    },
    {
        "num": 27,
        "name": "p27_agent_architect",
        "bg_prompt": "anime style illustration, master builder robot designing grand system architecture, building blocks and structure diagrams, engineering blueprints floating, professional architect atmosphere, no text, high quality",
        "title_texts": [
            {"text": "【計画系】architect", "position": "top-center", "font_size": 52, "color": (255, 255, 255, 255), "outline_color": (80, 40, 0, 255), "outline_width": 5},
        ],
        "telop": "システム全体の設計・アーキテクチャを決定"
    },
    {
        "num": 28,
        "name": "p28_agent_tdd",
        "bg_prompt": "anime style illustration, scientist robot in lab coat running tests and experiments, test tubes with green checkmarks, red to green cycle visualization, quality assurance atmosphere, no text, high quality",
        "title_texts": [
            {"text": "【開発系】tdd-guide", "position": "top-center", "font_size": 52, "color": (255, 255, 255, 255), "outline_color": (0, 100, 50, 255), "outline_width": 5},
        ],
        "telop": "テスト駆動開発を徹底、80%以上のカバレッジ確保"
    },
    {
        "num": 29,
        "name": "p29_agent_reviewer",
        "bg_prompt": "anime style illustration, detective robot with magnifying glass inspecting code on screen, finding bugs and issues, quality inspection visualization, analytical atmosphere, no text, high quality",
        "title_texts": [
            {"text": "【開発系】code-reviewer", "position": "top-center", "font_size": 48, "color": (255, 255, 255, 255), "outline_color": (100, 0, 100, 255), "outline_width": 5},
        ],
        "telop": "コード品質・セキュリティ・保守性をレビュー"
    },
    {
        "num": 30,
        "name": "p30_agent_build",
        "bg_prompt": "anime style illustration, mechanic robot fixing broken machine with tools, error messages being repaired, repair and fix visualization, workshop atmosphere, orange and blue colors, no text, high quality",
        "title_texts": [
            {"text": "【開発系】build-error-resolver", "position": "top-center", "font_size": 44, "color": (255, 255, 255, 255), "outline_color": (150, 80, 0, 255), "outline_width": 5},
        ],
        "telop": "ビルドエラー・型エラーを最小限の修正で解決"
    },
    {
        "num": 31,
        "name": "p31_agent_security",
        "bg_prompt": "anime style illustration, guardian robot with shield protecting system from threats, security scanning visualization, firewall and protection symbols, blue and gold defensive colors, no text, high quality",
        "title_texts": [
            {"text": "【品質系】security-reviewer", "position": "top-center", "font_size": 44, "color": (255, 255, 255, 255), "outline_color": (0, 80, 120, 255), "outline_width": 5},
        ],
        "telop": "脆弱性・情報漏洩リスクを検出・修正"
    },
    {
        "num": 32,
        "name": "p32_agent_e2e",
        "bg_prompt": "anime style illustration, robot tester simulating user interactions on computer, clicking buttons and testing flows, end to end testing visualization, quality assurance atmosphere, no text, high quality",
        "title_texts": [
            {"text": "【品質系】e2e-runner", "position": "top-center", "font_size": 52, "color": (255, 255, 255, 255), "outline_color": (0, 100, 80, 255), "outline_width": 5},
        ],
        "telop": "ユーザー操作を模擬してシステム全体をテスト"
    },
    {
        "num": 33,
        "name": "p33_agent_refactor",
        "bg_prompt": "anime style illustration, cleaning robot organizing messy code into clean organized structure, before and after transformation, cleanup and organization visualization, no text, high quality",
        "title_texts": [
            {"text": "【保守系】refactor-cleaner", "position": "top-center", "font_size": 48, "color": (255, 255, 255, 255), "outline_color": (80, 80, 0, 255), "outline_width": 5},
        ],
        "telop": "不要コード削除・重複排除・リファクタリング"
    },
    {
        "num": 34,
        "name": "p34_agent_doc",
        "bg_prompt": "anime style illustration, writer robot creating documentation and manuals, books and documents floating, technical writing visualization, organized library atmosphere, no text, high quality",
        "title_texts": [
            {"text": "【保守系】doc-updater", "position": "top-center", "font_size": 52, "color": (255, 255, 255, 255), "outline_color": (0, 80, 60, 255), "outline_width": 5},
        ],
        "telop": "ドキュメント・README・コメントを自動更新"
    },
    {
        "num": 35,
        "name": "p35_agent_list",
        "bg_prompt": "anime style illustration, grand showcase of 85 different robot agents organized by category, team photo style, diverse specialized robots, impressive scale visualization, colorful organized display, no text, high quality",
        "title_texts": [
            {"text": "85エージェント一覧", "position": "top-center", "font_size": 56, "color": (255, 220, 100, 255), "outline_color": (80, 40, 0, 255), "outline_width": 5},
        ],
        "telop": "タスクに応じて最適なエージェントを自動選択"
    },
]
