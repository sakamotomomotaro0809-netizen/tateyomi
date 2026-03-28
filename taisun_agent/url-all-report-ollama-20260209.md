# URL完全解析レポート

**対象URL**: https://ollama.com/blog/image-generation
**解析モード**: standard
**解析日時**: 2026-02-09
**解析深度**: 1 (単一ページ)

---

## スコアサマリー

| カテゴリ | スコア | 評価 |
|----------|--------|------|
| SEO | 78/100 | **B** |
| Accessibility | 73/100 | **C** |
| Security | 90/100 | **A** |
| Performance | 75/100 | **B** |
| **総合** | **79/100** | **B** |

> 評価基準: A(90+) B(75-89) C(60-74) D(40-59) F(0-39)

---

## 1. ページ構造

### 基本情報
| 項目 | 値 |
|------|-----|
| **タイトル** | Image generation (experimental) · Ollama Blog |
| **URL** | https://ollama.com/blog/image-generation |
| **文字セット** | UTF-8 |
| **DOCTYPE** | html |
| **言語** | 未設定 (問題あり) |
| **正規URL** | 未設定 |

### メタ情報
| メタタグ | 値 |
|---------|-----|
| description | Generate images locally with Ollama on macOS. Windows and Linux support coming soon. |
| viewport | width=device-width, initial-scale=1, maximum-scale=1 |
| robots | index, follow |

### Open Graph
| プロパティ | 値 |
|-----------|-----|
| og:title | Image generation (experimental) · Ollama Blog |
| og:description | Generate images locally with Ollama on macOS. Windows and Linux support coming soon. |
| og:image | https://ollama.com/public/og.png |
| og:type | website |
| og:image:width | 1200 |
| og:image:height | 628 |

### Twitter Card
| プロパティ | 値 |
|-----------|-----|
| twitter:card | summary_large_image |
| twitter:site | ollama |
| twitter:title | Image generation (experimental)· Ollama Blog |
| twitter:image:src | https://ollama.com/public/og.png |

### 見出し構造
```
H1: Image generation (experimental)
  H2: January 20, 2026
  H2: Models
    H3: Z-Image Turbo
      H4: Examples
    H3: FLUX.2 Klein
      H4: Examples
  H2: Configuration
    H3: Image location
    H3: Image sizes
    H3: Number of steps
    H3: Random seed
    H3: Negative prompts
  H2: What's next
```
見出し階層は正しく構成されている。H1は1つのみ。スキップなし。

### セマンティック要素
| 要素 | 数 |
|------|-----|
| header | 1 |
| nav | 1 |
| article | 1 |
| section | 1 |
| footer | 1 |

### JSON-LD構造化データ
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Ollama",
  "url": "https://ollama.com"
}
```
> 注: BlogPosting スキーマが不足。ブログ記事には `@type: BlogPosting` + `author`, `datePublished`, `image` を推奨。

### DOM統計
| 項目 | 値 |
|------|-----|
| 総要素数 | 199 |
| 最大深度 | 10 |
| scriptタグ | 5 |
| stylesheetリンク | 3 |
| インラインスタイル | 3 |

---

## 2. CSS・デザイン分析

### カラーパレット

**背景色 (Top 5)**
| 色 | 使用回数 | プレビュー |
|----|---------|-----------|
| `rgb(250, 250, 250)` #FAFAFA | 18 | 極薄グレー（メインBG） |
| `rgb(255, 255, 255)` #FFFFFF | 3 | 白 |
| `rgba(0, 0, 0, 0.05)` | 2 | 微透明黒（コードブロック） |
| `rgb(38, 38, 38)` #262626 | 1 | ダーク（フッターなど） |

**テキスト色 (Top 5)**
| 色 | 使用回数 | 用途推定 |
|----|---------|---------|
| `rgb(0, 0, 0)` #000000 | 107 | 本文テキスト |
| `rgb(115, 115, 115)` #737373 | 30 | 補助テキスト |
| `rgb(17, 24, 39)` #111827 | 21 | 見出し |
| `rgb(37, 99, 235)` #2563EB | 1 | リンク色 |
| `rgb(0, 140, 106)` #008C6A | 1 | アクセントカラー |

**ボーダー色**
| 色 | 使用回数 |
|----|---------|
| `rgb(229, 231, 235)` #E5E7EB | 158 |
| `rgb(107, 114, 128)` #6B7280 | 2 |

### デザインシステム要約
- **配色**: ミニマル。白/極薄グレー基調、黒テキスト、青リンク
- **スタイル**: クリーン・ミニマリスト

### フォント
| フォントファミリー | 使用回数 |
|------------------|---------|
| `ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji"...` | 142 |
| `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas...` | 19 |

- システムフォントスタック使用 = Web Font未使用 = 高速ロード

### タイポグラフィスケール
| サイズ | 使用回数 | 用途推定 |
|--------|---------|---------|
| 36px | 1 | H1 |
| 30px | 8 | H2 |
| 24px | 6 | H3 |
| 20px | 9 | H4 / リード |
| 18px | 10 | サブヘッド |
| 16px | 89 | 本文 |
| 14px | 18 | 補助テキスト |
| 13.6px | 11 | コードブロック |
| 12px | 9 | 小テキスト |

### レイアウト
| 手法 | 使用数 |
|------|-------|
| Flexbox | 15 |
| Grid | 0 |

### CSS変数
- なし（Tailwind CSSのユーティリティクラスベース）

### アニメーション
- なし（シンプルな静的ページ）

### メディアクエリ
| クエリ | 用途 |
|--------|------|
| `(min-width: 640px)` | モバイル |
| `(min-width: 768px)` | タブレット |
| `(min-width: 850px)` | タブレット+ |
| `(min-width: 1024px)` | ラップトップ |
| `(min-width: 1280px)` | デスクトップ |
| `(forced-colors: active)` | ハイコントラスト |
| `print` | 印刷用 |

### border-radius
| 値 | 使用回数 | 用途推定 |
|----|---------|---------|
| 9999px | 4 | ピル型ボタン |
| 16px | 8 | カード |
| 12px | 8 | 画像 |
| 6px | 10 | コードブロック |

---

## 3. リンク分析

### サマリー
| カテゴリ | 数 |
|---------|-----|
| **総リンク数** | **33** |
| 内部リンク | 21 |
| 外部リンク | 11 |
| ナビゲーション | 15 |
| CTA | 6 |
| フッター | 13 |
| ソーシャル | 10 |
| mailto | 1 |

### 内部リンク（ユニーク）
| パス | テキスト |
|------|---------|
| `/` | (Ollamaロゴ) |
| `/search` | Models |
| `/docs` | Docs |
| `/pricing` | Pricing |
| `/signin` | Sign in |
| `/download` | Download |
| `/x/z-image-turbo` | Z-Image Turbo |
| `/x/flux2-klein` | FLUX.2 Klein |
| `/blog` | Blog |

### 外部ドメイン
| ドメイン | リンク数 |
|---------|---------|
| github.com | 4 |
| discord.gg | 2 |
| discord.com | 2 |
| twitter.com | 2 |
| lu.ma | 1 |

### CTA リンク
- Sign in (x2) → `/signin`
- Download (x4) → `/download`

### ソーシャルリンク
- GitHub: https://github.com/ollama/ollama
- Discord: https://discord.gg/ollama / https://discord.com/invite/ollama
- X (Twitter): https://twitter.com/ollama
- Meetups: https://lu.ma/ollama

---

## 4. メディア棚卸し

### 画像 (9枚)
| # | alt | サイズ | ソース |
|---|-----|-------|--------|
| 1 | Ollama (ロゴ) | 181x256 | ollama.com/public/ollama.png |
| 2 | Ollama画像生成イメージ | 2056x1083 | files.ollama.com/image-generation.png |
| 3 | A cat holding a sign that says hello | 2164x1716 | assets/x/z-image-turbo/... |
| 4 | Young woman in a cozy coffee shop | 2330x2022 | assets/x/scratchpad/... |
| 5 | Chinese calligraphy on rice paper | 2434x1952 | assets/x/scratchpad/... |
| 6 | Surreal double exposure portrait | 2640x1958 | assets/x/scratchpad/... |
| 7 | OPEN 24 HOURS neon sign | 1992x1656 | assets/x/scratchpad/... |
| 8 | Matte black coffee tumbler | 2346x1748 | assets/x/scratchpad/... |
| 9 | Ollama image generation settings | 1320x932 | files.ollama.com/... |

- alt属性漏れ: **0** (全画像にalt設定済み)
- Lazy loading: **0** (9枚すべて即時読み込み → 改善推奨)
- レスポンシブ画像(srcset): **0** (改善推奨)

### SVG (3個)
- アイコン用SVG 3個（検索アイコン等、viewBox設定済み）

### iframe: 0 / 動画: 0 / 音声: 0

### ファビコン・アイコン (7個)
| サイズ | タイプ |
|--------|-------|
| 16x16 | PNG |
| 32x32 | PNG |
| 48x48 | PNG |
| 64x64 | PNG |
| 180x180 | Apple Touch Icon |
| 192x192 | Android Chrome |
| 512x512 | Android Chrome |

---

## 5. フォーム分析

### フォーム一覧 (1個)
| # | action | method | フィールド数 |
|---|--------|--------|------------|
| 1 | /search | GET | 1 |

### フィールド詳細
| フィールド | type | name | placeholder | required | ラベル |
|-----------|------|------|-------------|----------|--------|
| input | text | q | Search models | false | なし (問題) |

### スタンドアロン入力 (1個)
- checkbox (メニュートグル用)

---

## 6. 技術スタック

### フレームワーク・ライブラリ
| 技術 | 検出方法 |
|------|---------|
| **Tailwind CSS** | クラス名ベース検出 (flex, bg-, text-, p-, m-) |
| **htmx** | vendor/htmx/bundle.js (89KB) |
| **Prism.js** | vendor/prism/prism.js (コードハイライト) |

### SPA
- **非SPA** - サーバーサイドレンダリング + htmx によるインタラクション

### CDN
- 外部CDN未使用（全リソースを自社サーバーから配信）

### アナリティクス
- **検出なし** (GA/GTM/FB Pixel等なし)

### ホスティング
- **Google Frontend** (HTTPヘッダー `server: Google Frontend`)
- Google App Engine推定 (`GAESA` cookie)
- ビルドコミット: `510d23fc198f` (2026-02-06)

---

## 7. アクセシビリティ監査

### スコア: 73/100 (C)

### 問題一覧
| 重要度 | カテゴリ | 問題 |
|--------|---------|------|
| Serious | language | `<html>` に `lang` 属性なし |
| Serious | forms | 検索入力にラベルなし (`<label for="search">` が不足) |
| Serious | landmarks | `<main>` ランドマークなし (articleはあるがmainがない) |
| Moderate | navigation | スキップリンクなし |

### ランドマーク
| ランドマーク | 暗黙的 | 明示的 |
|-------------|--------|--------|
| banner (header) | 1 | 0 |
| navigation (nav) | 1 | 0 |
| contentinfo (footer) | 1 | 0 |

### ARIA使用状況
- ARIA role属性: **未使用**

### フォーカス管理
- `outline: none` の要素: **38個** (フォーカスインジケーター不足の可能性)
- スキップリンク: なし

### 良い点
- 全画像にalt属性設定済み (9/9)
- H1は1つ、見出し階層正しい
- セマンティックHTML (header/nav/article/section/footer)

---

## 8. セキュリティチェック

### スコア: 90/100 (A)

### HTTPS
- **HTTPS有効** (HTTP/2)

### HTTPセキュリティヘッダー
| ヘッダー | 値 | 状態 |
|---------|-----|------|
| X-Frame-Options | DENY | 設定済み |
| Content-Security-Policy | (メタタグなし) | HTTP ヘッダーで設定の可能性 |
| Strict-Transport-Security | 未検出 | 要確認 |
| X-Content-Type-Options | 未検出 | 改善推奨 |
| Referrer-Policy | 未検出 | 改善推奨 |
| Permissions-Policy | 未検出 | 改善推奨 |

### その他
| 項目 | 状態 |
|------|------|
| 混合コンテンツ | **0** (なし) |
| 外部スクリプト | **0** (全て自社) |
| SRI カバレッジ | N/A (外部スクリプトなし) |
| インラインスクリプト | 3個 |
| イベントハンドラ属性 | 0個 |
| Cookie | 1 (`GAESA` - HttpOnly, Secure, SameSite=Lax) |
| target="_blank" without noopener | 0 |

### 良い点
- HTTPS + HTTP/2
- X-Frame-Options: DENY
- Cookie に HttpOnly + Secure + SameSite 設定済み
- 外部スクリプト0 = サプライチェーンリスクなし

---

## 9. パフォーマンス

### スコア: 75/100 (B)

### タイミング
| メトリクス | 値 | 評価 |
|-----------|-----|------|
| DNS | 9ms | 優秀 |
| TCP | 111ms | 良好 |
| **TTFB** | **211ms** | 良好 |
| ダウンロード | 95ms | 良好 |
| HTML転送サイズ | 21.3KB | 軽量 |

### リソース内訳
| タイプ | 数 | サイズ |
|--------|-----|-------|
| CSS (link) | 3 | 67KB |
| JavaScript (script) | 2 | 111KB |
| **画像 (img)** | **9** | **12,651KB (12.3MB)** |
| その他 | 1 | 1KB |
| **合計** | **15** | **12,830KB (12.5MB)** |

### 最大リソース
| リソース | サイズ | 読込時間 |
|---------|--------|---------|
| scratchpad/334440a7 (コーヒーショップ画像) | 383KB | 459ms |
| htmx/bundle.js | 88KB | 117ms |
| tailwind.css | 65KB | 202ms |

### ブロッキングリソース (5個)
| タイプ | ファイル |
|--------|---------|
| CSS | tailwind.css |
| CSS | prism.css |
| CSS | prism.min.css (重複？) |
| JS | htmx/bundle.js |
| JS | prism.js |

### DOM統計
| 項目 | 値 | 評価 |
|------|-----|------|
| 総要素数 | 199 | 優秀 (軽量DOM) |
| scripts | 5 | 少ない |
| stylesheets | 3 | 少ない |
| images | 9 | 適度 |

### 問題
- 9枚の画像に **lazy loading未設定** (合計12.3MB)
- prism.css と prism.min.css が**両方読み込まれている** (重複)

---

## 10. レスポンシブ対応

### ビューポート
- `width=device-width, initial-scale=1` - 正しく設定
- `user-scalable` 制限なし - アクセシブル

### ブレークポイント (5段階)
| ブレークポイント | ラベル |
|----------------|--------|
| 640px | Mobile |
| 768px | Tablet |
| 850px | Tablet+ |
| 1024px | Laptop |
| 1280px | Desktop |

### メディアクエリ (7個)
- `(min-width: 640px)` ~ `(min-width: 1280px)` のモバイルファースト設計
- `(forced-colors: active)` - ハイコントラストモード対応
- `print` - 印刷スタイル対応

### タッチターゲット
- 44x44px未満のターゲット: **20個** (改善推奨)
- 主にナビゲーションリンク (高さ28pxが多い)

### レスポンシブ画像
- srcset使用: **0/9** (全画像が固定サイズ → 改善推奨)

### 水平スクロール
- **なし** (正しくレスポンシブ)

---

## 改善提案

### 優先度: 高
1. **`<html lang="en">` を追加** - アクセシビリティの基本。スクリーンリーダーの言語判定に必須
2. **画像に `loading="lazy"` を追加** - ファーストビュー以外の6-7枚に設定で12MB以上の初期ロード削減
3. **`<main>` ランドマークを追加** - `<article>` を `<main>` で囲む
4. **検索フォームにラベル追加** - `<label for="search" class="sr-only">Search models</label>`

### 優先度: 中
5. **レスポンシブ画像 (srcset) 導入** - 2000px超の画像が多数。モバイルには不要
6. **prism.css 重複解消** - prism.css と prism.min.css の両方が読み込まれている
7. **BlogPosting JSON-LD追加** - SEO改善。author, datePublished, image を構造化
8. **canonical URL設定** - `<link rel="canonical">` が未設定
9. **タッチターゲットサイズ拡大** - ナビリンクの高さを44px以上に
10. **スキップリンク追加** - キーボードナビゲーション改善

### 優先度: 低
11. **セキュリティヘッダー強化** - HSTS, X-Content-Type-Options, Referrer-Policy 追加
12. **htmx/prism.js を async/defer に** - レンダリングブロック解消
13. **画像の次世代フォーマット** - WebP/AVIF でさらに軽量化
14. **フォーカスインジケーター改善** - outline:none が38要素に適用されている

---

## 技術サマリー

| 項目 | 詳細 |
|------|------|
| **アーキテクチャ** | サーバーサイドレンダリング + htmx |
| **CSS** | Tailwind CSS (ユーティリティファースト) |
| **JS** | htmx (88KB) + Prism.js (23KB) |
| **ホスティング** | Google App Engine (Google Frontend) |
| **フォント** | システムフォントスタック (Web Font不使用) |
| **画像配信** | 自社CDN (files.ollama.com + ollama.com/assets) |
| **アナリティクス** | 未検出 |
| **デザイン** | ミニマリスト、白/グレー基調、クリーンUI |

---

*Generated by url-all skill | TAISUN Agent System | 2026-02-09*
