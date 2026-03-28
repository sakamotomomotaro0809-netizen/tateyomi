"""
メタデータ解析によるテーマ自動生成
タイトル・著者・冒頭テキストのキーワードからUIテーマを決定する
"""
from __future__ import annotations
from tateyomi.config import ParsedBook

THEMES: dict[str, dict] = {
    "default": {
        "name": "和風",
        "bg": "#f5f0e8",
        "text": "#1a1a1a",
        "accent": "#3d5a80",
        "header_bg": "rgba(245,240,232,0.97)",
        "border": "#d4c9b0",
        "font": '"Hiragino Mincho ProN", "游明朝", "Yu Mincho", serif',
        "nav_btn": "#3d5a80",
        "nav_btn_text": "#ffffff",
    },
    "business": {
        "name": "ビジネス",
        "bg": "#f8f9fa",
        "text": "#1c1c1e",
        "accent": "#0057b7",
        "header_bg": "rgba(248,249,250,0.97)",
        "border": "#dee2e6",
        "font": '"Hiragino Sans", "游ゴシック", "Yu Gothic", "Noto Sans JP", sans-serif',
        "nav_btn": "#0057b7",
        "nav_btn_text": "#ffffff",
    },
    "tech": {
        "name": "テック",
        "bg": "#1e1e2e",
        "text": "#cdd6f4",
        "accent": "#89b4fa",
        "header_bg": "rgba(30,30,46,0.97)",
        "border": "#313244",
        "font": '"Fira Code", "Source Han Code JP", "Courier New", monospace',
        "nav_btn": "#89b4fa",
        "nav_btn_text": "#1e1e2e",
    },
    "novel": {
        "name": "文学",
        "bg": "#fdf6e3",
        "text": "#2d1b00",
        "accent": "#8b4513",
        "header_bg": "rgba(253,246,227,0.97)",
        "border": "#c8a96e",
        "font": '"Hiragino Mincho ProN", "游明朝", "Yu Mincho", serif',
        "nav_btn": "#8b4513",
        "nav_btn_text": "#ffffff",
    },
    "poetry": {
        "name": "詩・エッセイ",
        "bg": "#f0ebe5",
        "text": "#3d2b1f",
        "accent": "#9b6b6b",
        "header_bg": "rgba(240,235,229,0.97)",
        "border": "#d4b8b0",
        "font": '"Hiragino Mincho ProN", "游明朝", "Yu Mincho", serif',
        "nav_btn": "#9b6b6b",
        "nav_btn_text": "#ffffff",
    },
    "classic": {
        "name": "古典",
        "bg": "#f2ede4",
        "text": "#1a0a00",
        "accent": "#6b3a2a",
        "header_bg": "rgba(242,237,228,0.97)",
        "border": "#b8a890",
        "font": '"Hiragino Mincho ProN", "游明朝", "Yu Mincho", serif',
        "nav_btn": "#6b3a2a",
        "nav_btn_text": "#ffffff",
    },
}

_BUSINESS_KEYWORDS = [
    "ビジネス", "経営", "マーケ", "収益", "稼ぐ", "副業", "投資",
    "sales", "business", "marketing", "起業", "資産", "利益", "戦略",
    "マネジメント", "リーダー", "売上", "顧客", "収益化", "バイブル",
]
_TECH_KEYWORDS = [
    "プログラム", "python", "javascript", "typescript", "技術", "エンジニア",
    "開発", "コード", "データ", "ai", "機械学習", "アルゴリズム", "システム",
    "サーバー", "クラウド", "git", "linux", "docker", "api",
]
_POETRY_KEYWORDS = [
    "詩", "エッセイ", "随筆", "俳句", "短歌", "散文", "詩集",
    "essay", "poem", "poetry",
]
_CLASSIC_KEYWORDS = [
    "源氏物語", "枕草子", "徒然草", "平家物語", "古事記", "万葉集",
    "漱石", "鴎外", "芥川", "太宰", "三島", "川端",
]


def detect_theme(book: ParsedBook) -> dict:
    """
    ParsedBook のメタデータ・冒頭テキストを解析してテーマを返す。
    戻り値は THEMES のコピー（"key" フィールドを追加）。
    """
    title = (book.title or "").lower()
    author = (book.author or "").lower()

    # 冒頭テキスト抽出（最初の章のプレーンテキスト先頭1000字）
    sample_text = ""
    if book.chapters:
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(book.chapters[0].html_content, "lxml")
            sample_text = soup.get_text()[:1000].lower()
        except Exception:
            pass

    corpus = title + " " + author + " " + sample_text

    # ── キーワードスコアリング ─────────────────────────────────────────
    scores: dict[str, int] = {k: 0 for k in THEMES}

    for kw in _BUSINESS_KEYWORDS:
        if kw in corpus:
            scores["business"] += 2 if kw in title else 1

    for kw in _TECH_KEYWORDS:
        if kw in corpus:
            scores["tech"] += 2 if kw in title else 1

    for kw in _POETRY_KEYWORDS:
        if kw in corpus:
            scores["poetry"] += 2 if kw in title else 1

    for kw in _CLASSIC_KEYWORDS:
        if kw in corpus:
            scores["classic"] += 2 if kw in (title + author) else 1

    # 章数ヒューリスティック: 章が多い = 長編小説
    if len(book.chapters) > 15:
        scores["novel"] += 2
    elif len(book.chapters) > 5:
        scores["novel"] += 1

    # 最高スコアのテーマを選択（同点ならデフォルト）
    best_key = max(scores, key=lambda k: scores[k])
    if scores[best_key] == 0:
        best_key = "default"

    theme = dict(THEMES[best_key])
    theme["key"] = best_key
    return theme
