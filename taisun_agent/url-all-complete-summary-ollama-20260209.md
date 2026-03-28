# Ollama Image Generation 完全把握レポート

**URL**: https://ollama.com/blog/image-generation
**記事日付**: 2026年1月20日
**解析日**: 2026年2月9日

---

## Part 1: 記事コンテンツの完全まとめ

### 概要
Ollamaが**画像生成機能（実験的）**をリリース。現在macOS対応、Windows/Linuxは近日対応予定。ローカルで画像生成が可能になった。

### 基本コマンド
```bash
ollama run x/z-image-turbo "your prompt"
```
- 生成画像は**カレントディレクトリ**に自動保存
- Ghostty、iTerm2などの画像レンダリング対応ターミナルでインラインプレビュー可能

---

### 対応モデル

#### 1. Z-Image Turbo（Alibaba Tongyi Lab）
```bash
ollama run x/z-image-turbo
```

| 項目 | 詳細 |
|------|------|
| パラメータ数 | **60億** |
| 開発元 | Alibaba Tongyi Lab |
| ライセンス | **Apache 2.0**（商用利用OK） |
| 特徴1 | フォトリアルな写真・ポートレート・シーン生成 |
| 特徴2 | **英語+中国語の二言語テキスト**を画像内に正確レンダリング |

**作例プロンプト3つ:**

1. **フォトリアルポートレート:**
   > Young woman in a cozy coffee shop, natural window lighting, wearing a cream knit sweater, holding a ceramic mug, soft bokeh background with warm ambient lights, candid moment, shot on 35mm film

2. **中国書道:**
   > Traditional Chinese calligraphy brush painting style, the characters "山高水長" written in elegant black ink on rice paper, red seal stamp in corner, minimalist composition

3. **クリエイティブ合成:**
   > Surreal double exposure portrait, woman's silhouette filled with blooming cherry blossom trees, soft pink and white petals floating, dreamy ethereal atmosphere

#### 2. FLUX.2 Klein（Black Forest Labs）
```bash
ollama run x/flux2-klein
```

| 項目 | 詳細 |
|------|------|
| サイズ | **4B** と **9B** の2種類 |
| 開発元 | Black Forest Labs |
| 4Bライセンス | **Apache 2.0**（商用利用OK） |
| 9Bライセンス | **FLUX Non-Commercial License v2.1**（非商用のみ） |
| 特徴 | 画像内の**テキスト読み取り可能**。UIモックアップやタイポグラフィ付きデザインに有用 |
| 強み | Black Forest Labs史上**最速**の画像生成モデル |

**作例プロンプト2つ:**

1. **テキストレンダリング:**
   > A neon sign reading "OPEN 24 HOURS" in a rainy city alley at night, reflections on wet pavement

2. **プロダクトフォト:**
   > Matte black coffee tumbler on wooden desk, morning sunlight casting long shadows, steam rising, commercial product shot

---

### 設定パラメータ（5つ）

| パラメータ | コマンド | 説明 |
|-----------|---------|------|
| **画像保存場所** | (cdで変更) | カレントディレクトリに保存。ターミナルでcdすれば保存先変更 |
| **画像サイズ** | `/set width` `/set height` | 幅・高さを指定。小さいほど高速・省メモリ |
| **ステップ数** | `/set steps` | モデルの反復回数。少ない=高速だが粗い。多すぎるとアーティファクト発生。Ollamaがモデルごとの推奨値をデフォルト設定 |
| **ランダムシード** | `/set seed` | 再現性のある結果に。同じシード=同じ画像。イテレーションや共有に便利 |
| **ネガティブプロンプト** | (プロンプト内で指定) | 画像に**含めたくない要素**をガイド |

---

### 今後の予定
1. **Windows/Linux対応**
2. **追加の画像生成モデル**
3. **画像編集機能**

---

## Part 2: サイト技術構造の完全まとめ

### スコアカード
| カテゴリ | スコア | 評価 |
|----------|--------|------|
| SEO | 78/100 | B |
| Accessibility | 73/100 | C |
| Security | 90/100 | A |
| Performance | 75/100 | B |
| **総合** | **79/100** | **B** |

### 技術スタック
| レイヤー | 技術 |
|---------|------|
| サーバー | **Go言語** (推定) + Google App Engine |
| フロントエンド | **htmx** (89KB) - SPA不使用、サーバーサイドレンダリング |
| CSS | **Tailwind CSS** (66KB) - ユーティリティファースト |
| コードハイライト | **Prism.js** (23KB) |
| フォント | システムフォントスタック（Web Font不使用 = 高速） |
| 画像配信 | files.ollama.com + ollama.com/assets |
| ホスティング | Google Frontend / Google App Engine |
| アナリティクス | **なし**（プライバシー重視） |

### ページ構造
```
<html> (lang属性なし)
  <head>
    meta: description, viewport, robots, OG, Twitter Card
    JSON-LD: WebSite schema
    CSS: tailwind.css + prism.css + prism.min.css
  </head>
  <body>
    <header>
      <nav> Ollama / Models / GitHub / Discord / Docs / Pricing / Search / Sign in / Download
    </header>
    <article>
      H1: Image generation (experimental)
        H2: January 20, 2026
        H2: Models
          H3: Z-Image Turbo → 説明 + 作例3つ
          H3: FLUX.2 Klein → 説明 + 作例2つ
        H2: Configuration
          H3: Image location / Image sizes / Number of steps / Random seed / Negative prompts
        H2: What's next
    </article>
    <footer>
      Download / Blog / Docs / GitHub / Discord / X / Contact / Meetups
    </footer>
  </body>
</html>
```

### リンクマップ（全33リンク）
```
内部リンク (21):
  ├── / (ホーム)
  ├── /search (モデル検索)
  ├── /docs (ドキュメント)
  ├── /pricing (料金)
  ├── /signin (サインイン)
  ├── /download (ダウンロード) ← CTA x4
  ├── /x/z-image-turbo (Z-Image Turboモデルページ) x2
  ├── /x/flux2-klein (FLUX.2 Kleinモデルページ) x2
  └── /blog (ブログ)

外部リンク (11):
  ├── github.com/ollama/ollama (GitHub) x4
  ├── discord.gg/ollama (Discord) x2
  ├── discord.com/invite/ollama (Discord) x2
  ├── twitter.com/ollama (X) x2
  └── lu.ma/ollama (Meetups) x1

メール: hello@ollama.com x1
```

### メディア一覧（全9画像）
| # | 内容 | サイズ |
|---|------|--------|
| 1 | Ollamaロゴ | 181x256 |
| 2 | ヒーロー画像（Ollamaが絵を描くイラスト） | 2056x1083 |
| 3 | 猫が"Hello"サインを持つ画像（デモ） | 2164x1716 |
| 4 | コーヒーショップの女性（Z-Image Turbo作例） | 2330x2022 |
| 5 | 中国書道「山高水長」（Z-Image Turbo作例） | 2434x1952 |
| 6 | 二重露光ポートレート+桜（Z-Image Turbo作例） | 2640x1958 |
| 7 | "OPEN 24 HOURS"ネオンサイン（FLUX.2 Klein作例） | 1992x1656 |
| 8 | マットブラックコーヒータンブラー（FLUX.2 Klein作例） | 2346x1748 |
| 9 | ターミナル設定画面キャプチャ | 1320x932 |

### デザインシステム
| 要素 | 値 |
|------|-----|
| 基調色 | 白 `#FFFFFF` / 極薄グレー `#FAFAFA` |
| テキスト色 | 黒 `#000000` / グレー `#737373` / 見出し `#111827` |
| リンク色 | 青 `#2563EB` |
| アクセント | 緑 `#008C6A` |
| ボーダー | グレー `#E5E7EB` |
| 本文フォント | 16px / system-ui |
| H1 | 36px |
| H2 | 30px |
| H3 | 24px |
| コード | 13.6px / monospace |
| 角丸 | カード16px / 画像12px / コード6px / ボタン9999px(ピル) |
| レイアウト | Flexbox x15 / Grid不使用 |
| ブレークポイント | 640 / 768 / 850 / 1024 / 1280px |

### セキュリティ状況
| 項目 | 状態 |
|------|------|
| HTTPS + HTTP/2 | 有効 |
| X-Frame-Options | DENY |
| Cookie | HttpOnly + Secure + SameSite=Lax |
| 外部スクリプト | **0** (全て自社配信) |
| 混合コンテンツ | **0** |
| CSP | メタタグなし（ヘッダーで設定の可能性） |
| HSTS | 未検出 |

### 改善すべき点トップ5
| # | 問題 | 影響 |
|---|------|------|
| 1 | `<html lang="en">` 未設定 | スクリーンリーダー言語判定不可 |
| 2 | 画像12.3MB全即時読込、lazy loading 0/9 | 初期ロード重い |
| 3 | `<main>` ランドマークなし | キーボードナビゲーション困難 |
| 4 | canonical URL / BlogPosting JSON-LD 未設定 | SEO損失 |
| 5 | prism.css + prism.min.css 重複読込 | 無駄な2KB+ブロッキング |

---

*url-all skill 完全解析 | コンテンツ+技術+構造 全把握済み*
