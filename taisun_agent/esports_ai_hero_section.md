# ゲーム観戦×AI副業 ヒーローセクション完全パッケージ

## 🎮 コンセプト

**ターゲット**: eスポーツ観戦が趣味の家族持ちサラリーマン（30-40代）
**訴求**: AIで月20万円の副収入、時間も家族も諦めない
**トーン**: 共感型、リアルな幸せ、無理しない成功

---

## 🎨 NanoBanana画像生成プロンプト

### ヒーローセクション背景画像

#### プロンプト（即実行可能）

```
Create a modern hero section background image for an AI side business landing page targeting gaming enthusiasts and family-oriented professionals. The composition should blend esports gaming aesthetics with work-life balance themes.

Design a horizontal split composition: the left side features abstract gaming elements - glowing neon controller icons, stylized game HUD interfaces, or esports arena atmosphere in vibrant purple (#9C27B0) and cyan (#00BCD4) tones with subtle RGB lighting effects. The right side transitions to warm, inviting family life imagery - abstract representations of home comfort, quality time symbols, or peaceful evening scenes in warm orange (#FF6F00) and soft blue (#42A5F5) gradients.

The center should have a seamless gradient blend zone creating a visual bridge between gaming passion and family happiness. Include subtle AI circuit patterns or neural network nodes woven throughout to represent automation and smart income generation. Add floating holographic elements suggesting money flow, time freedom, or passive income streams.

The overall mood should be aspirational yet relatable - not aggressive hustle culture, but comfortable abundance and balanced lifestyle. Professional modern aesthetic with cinematic lighting, depth through layered elements, and plenty of negative space in the upper center for headline text overlay. 16:9 aspect ratio, 1920x1080px, web-optimized quality. The image should inspire viewers that they can maintain their gaming hobby while building financial security for their family.
```

#### ネガティブプロンプト

```
photorealistic people, specific game logos, copyrighted characters, violent imagery, dark depressing mood, cluttered composition, cheap stock photos, cartoon style, outdated graphics, low resolution, watermarks, specific brand names, aggressive marketing visuals, stressful work imagery
```

#### 推奨設定
- **サイズ**: 1920x1080 (16:9)
- **品質**: 最高
- **スタイル**: Cinematic, Modern, Aspirational
- **カラーバランス**: ゲーミングカラー（紫・シアン）+ 温かみ（オレンジ・青）

---

### サブ画像: アイコンイラスト（3つの特徴用）

#### アイコン1: eスポーツ観戦が副業のヒント

```
Design a modern flat-style icon representing esports viewing transforming into business opportunity. Create an illustration showing a game controller or headset icon on the left side connecting via glowing lines or circuit patterns to a lightbulb or idea symbol on the right. Use gaming-inspired colors: vibrant purple (#9C27B0) and cyan (#00BCD4) with smooth gradients. The icon should be clean, minimalist, and convey the "aha moment" of turning gaming knowledge into income. Include subtle sparkle or glow effects to emphasize inspiration. Square format, 512x512px, transparent background, modern flat design suitable for web use.
```

#### アイコン2: 週末の自由時間のまま自動で稼ぐ

```
Create a flat-style icon illustration representing automation and passive income during leisure time. Show a calendar or clock icon with weekend highlighted, connected to gear symbols or automation icons suggesting systems working independently. Use a calming color scheme of soft blue (#42A5F5) and warm orange (#FF6F00) to represent relaxation combined with productivity. Include subtle elements like checkmarks, automated workflows, or flowing currency symbols. The icon should communicate "set and forget" ease. Square format, 512x512px, transparent background, clean modern aesthetic.
```

#### アイコン3: 年間240万円の余裕で我慢しない家族との暮らし

```
Design a warm, family-focused flat icon representing financial comfort and quality family time. Create an illustration featuring a house or family symbol surrounded by subtle prosperity indicators - coins, growth elements, or comfort symbols. Use a heartwarming color palette of sunset orange (#FF6F00) and peaceful blue (#42A5F5). The icon should feel emotionally resonant, conveying love, security, and abundance without being materialistic. Include elements suggesting activities, travel, or education opportunities. Square format, 512x512px, transparent background, approachable and warm design style.
```

---

## 💻 HTML/CSSコード

### HTML構造

```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ゲームも家族も諦めない AI副業で月20万円</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&family=Zen+Antique&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <!-- ヒーローセクション -->
    <section class="hero-section">
        <div class="hero-background">
            <!-- NanoBananaで生成した画像をここに配置 -->
            <img src="hero-bg-gaming-ai.png" alt="Background" class="hero-bg-image">
            <div class="hero-overlay"></div>
        </div>

        <div class="hero-content">
            <div class="container">
                <!-- ヘッドコピー -->
                <h1 class="hero-headline">
                    <span class="headline-main">ゲーム観戦しながら月20万円稼いで、</span>
                    <span class="headline-main">家族との時間も守る</span>
                    <span class="headline-accent">AIが「普通の幸せ」に余裕をくれる</span>
                </h1>

                <!-- サブコピー -->
                <div class="hero-benefits">
                    <div class="benefit-item">
                        <span class="benefit-icon">✓</span>
                        <span class="benefit-text">金曜夜のeスポーツ観戦が、副業のヒントになる</span>
                    </div>
                    <div class="benefit-item">
                        <span class="benefit-icon">✓</span>
                        <span class="benefit-text">週末の自由時間そのまま、システムが勝手に稼ぐ</span>
                    </div>
                    <div class="benefit-item">
                        <span class="benefit-icon">✓</span>
                        <span class="benefit-text">年間240万円の余裕で、我慢しない家族との暮らし</span>
                    </div>
                </div>

                <!-- ボディコピー -->
                <div class="hero-body">
                    <p class="body-intro">大きな成功はいらない。</p>
                    <p class="body-text">ただ、子供の習い事を諦めさせたくない。<br>
                    家族旅行を我慢させたくない。<br>
                    でも、自分の時間も欲しい。<br>
                    金曜の夜、eスポーツ観戦を心から楽しみたい。</p>

                    <p class="body-highlight">AIを使えば、全部叶います。</p>

                    <p class="body-text">ゲームの知識が副業になり、月20万円。<br>
                    作業は週末の数時間、あとはシステムが自動で動く。<br>
                    本業も家族も、ゲームも諦めない。</p>

                    <p class="body-conclusion">特別にならなくていい。<br>
                    ただ、「お金の心配」も「時間の余裕」も、両方欲しいだけ。</p>
                </div>

                <!-- CTA -->
                <div class="hero-cta">
                    <a href="#form" class="cta-button">
                        <span class="cta-icon">🎮</span>
                        <span class="cta-text">ゲームも家族も諦めない人生へ</span>
                        <span class="cta-arrow">→</span>
                    </a>
                    <p class="cta-subtext">まずは無料で詳細を確認する</p>
                </div>
            </div>
        </div>

        <!-- スクロール誘導 -->
        <div class="scroll-indicator">
            <span class="scroll-text">Scroll</span>
            <span class="scroll-arrow">↓</span>
        </div>
    </section>
</body>
</html>
```

---

### CSS（styles.css）

```css
/* ========================================
   リセット & ベース設定
   ======================================== */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

:root {
    /* カラーパレット: ゲーミング + 家族の温かみ */
    --gaming-purple: #9C27B0;
    --gaming-cyan: #00BCD4;
    --family-orange: #FF6F00;
    --family-blue: #42A5F5;
    --accent-green: #00C853;

    /* ニュートラルカラー */
    --text-primary: #1A1A1A;
    --text-secondary: #4A4A4A;
    --text-white: #FFFFFF;
    --bg-overlay: rgba(0, 0, 0, 0.5);

    /* タイポグラフィ */
    --font-main: 'Noto Sans JP', sans-serif;
    --font-accent: 'Zen Antique', serif;
}

body {
    font-family: var(--font-main);
    font-size: 16px;
    line-height: 1.8;
    color: var(--text-primary);
    overflow-x: hidden;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

/* ========================================
   ヒーローセクション
   ======================================== */
.hero-section {
    position: relative;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

/* 背景画像 */
.hero-background {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
}

.hero-bg-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
}

.hero-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
        135deg,
        rgba(156, 39, 176, 0.3) 0%,
        rgba(0, 188, 212, 0.2) 50%,
        rgba(255, 111, 0, 0.3) 100%
    );
    backdrop-filter: blur(2px);
}

/* コンテンツ */
.hero-content {
    position: relative;
    z-index: 10;
    text-align: center;
    color: var(--text-white);
    padding: 60px 0;
}

/* ========================================
   ヘッドライン
   ======================================== */
.hero-headline {
    font-family: var(--font-main);
    font-weight: 900;
    margin-bottom: 40px;
    text-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
}

.headline-main {
    display: block;
    font-size: clamp(28px, 5vw, 48px);
    line-height: 1.4;
    margin-bottom: 10px;
}

.headline-accent {
    display: block;
    font-size: clamp(20px, 3.5vw, 32px);
    color: #FFD54F;
    margin-top: 20px;
    font-weight: 700;
    background: linear-gradient(90deg, #FFD54F, #FF6F00);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

/* ========================================
   サブコピー（ベネフィット）
   ======================================== */
.hero-benefits {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 16px;
    padding: 30px 40px;
    margin: 40px auto;
    max-width: 800px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
}

.benefit-item {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    margin: 16px 0;
    text-align: left;
    color: var(--text-primary);
}

.benefit-icon {
    font-size: 24px;
    color: var(--accent-green);
    margin-right: 12px;
    font-weight: bold;
}

.benefit-text {
    font-size: clamp(14px, 2vw, 18px);
    font-weight: 700;
    line-height: 1.6;
}

/* ========================================
   ボディコピー
   ======================================== */
.hero-body {
    background: rgba(26, 26, 26, 0.9);
    border-radius: 16px;
    padding: 40px;
    margin: 40px auto;
    max-width: 900px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(10px);
}

.body-intro {
    font-size: clamp(20px, 3vw, 28px);
    font-weight: 700;
    margin-bottom: 20px;
    color: var(--text-white);
}

.body-text {
    font-size: clamp(14px, 2vw, 18px);
    line-height: 2;
    margin-bottom: 24px;
    color: rgba(255, 255, 255, 0.9);
}

.body-highlight {
    font-size: clamp(18px, 2.5vw, 24px);
    font-weight: 900;
    color: #FFD54F;
    margin: 30px 0;
    text-shadow: 0 2px 10px rgba(255, 213, 79, 0.5);
}

.body-conclusion {
    font-size: clamp(16px, 2.2vw, 20px);
    font-weight: 700;
    margin-top: 30px;
    color: var(--text-white);
    border-top: 2px solid rgba(255, 255, 255, 0.3);
    padding-top: 20px;
}

/* ========================================
   CTA ボタン
   ======================================== */
.hero-cta {
    margin-top: 50px;
}

.cta-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 12px;

    font-size: clamp(18px, 2.5vw, 24px);
    font-weight: 900;
    color: var(--text-white);

    background: linear-gradient(135deg, var(--family-orange), var(--gaming-purple));
    padding: 20px 60px;
    border-radius: 50px;

    text-decoration: none;
    box-shadow: 0 10px 30px rgba(255, 111, 0, 0.5);

    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.cta-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    transition: left 0.5s ease;
}

.cta-button:hover::before {
    left: 100%;
}

.cta-button:hover {
    transform: translateY(-3px) scale(1.05);
    box-shadow: 0 15px 40px rgba(255, 111, 0, 0.7);
}

.cta-icon {
    font-size: 28px;
}

.cta-arrow {
    font-size: 24px;
    font-weight: bold;
    transition: transform 0.3s ease;
}

.cta-button:hover .cta-arrow {
    transform: translateX(5px);
}

.cta-subtext {
    margin-top: 16px;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
    font-weight: 400;
}

/* ========================================
   スクロールインジケーター
   ======================================== */
.scroll-indicator {
    position: absolute;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: var(--text-white);
    z-index: 10;
    animation: bounce 2s infinite;
}

.scroll-text {
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    opacity: 0.8;
}

.scroll-arrow {
    font-size: 20px;
}

@keyframes bounce {
    0%, 100% {
        transform: translateX(-50%) translateY(0);
    }
    50% {
        transform: translateX(-50%) translateY(10px);
    }
}

/* ========================================
   レスポンシブ対応
   ======================================== */

/* タブレット */
@media (max-width: 768px) {
    .hero-section {
        min-height: auto;
        padding: 80px 0 60px;
    }

    .hero-benefits {
        padding: 20px 24px;
    }

    .benefit-item {
        flex-direction: column;
        align-items: flex-start;
        text-align: left;
    }

    .benefit-icon {
        margin-bottom: 8px;
    }

    .hero-body {
        padding: 30px 20px;
    }

    .cta-button {
        padding: 16px 40px;
        font-size: 18px;
    }
}

/* モバイル */
@media (max-width: 480px) {
    .headline-main {
        font-size: 24px;
    }

    .headline-accent {
        font-size: 18px;
    }

    .benefit-text {
        font-size: 14px;
    }

    .hero-body {
        padding: 20px 16px;
    }

    .body-intro {
        font-size: 20px;
    }

    .body-text {
        font-size: 14px;
    }

    .cta-button {
        padding: 14px 30px;
        font-size: 16px;
        width: 100%;
        max-width: 320px;
    }
}

/* ========================================
   アクセシビリティ
   ======================================== */
@media (prefers-reduced-motion: reduce) {
    .cta-button,
    .cta-arrow,
    .scroll-indicator {
        animation: none;
        transition: none;
    }
}

/* ハイコントラストモード対応 */
@media (prefers-contrast: high) {
    .hero-overlay {
        background: rgba(0, 0, 0, 0.7);
    }

    .hero-benefits {
        background: rgba(255, 255, 255, 1);
    }

    .hero-body {
        background: rgba(0, 0, 0, 1);
    }
}
```

---

## 📐 デザイン仕様書

### カラーパレット

| 用途 | カラー | HEX | 意味 |
|------|--------|-----|------|
| ゲーミング紫 | 紫 | `#9C27B0` | eスポーツ、ゲーミング、情熱 |
| ゲーミングシアン | シアン | `#00BCD4` | デジタル、未来、クール |
| 家族オレンジ | オレンジ | `#FF6F00` | 温かみ、家族、幸せ |
| 家族ブルー | 青 | `#42A5F5` | 安心、信頼、穏やか |
| アクセント緑 | 緑 | `#00C853` | 成功、収入、成長 |
| アクセント黄 | 黄 | `#FFD54F` | 希望、明るさ、可能性 |

### タイポグラフィ

| 要素 | フォント | サイズ（PC） | サイズ（SP） | ウェイト |
|------|----------|-------------|-------------|---------|
| メイン見出し | Noto Sans JP | 48px | 24px | 900 |
| アクセント見出し | Noto Sans JP | 32px | 18px | 700 |
| ベネフィット | Noto Sans JP | 18px | 14px | 700 |
| ボディコピー | Noto Sans JP | 18px | 14px | 400 |
| ハイライト | Noto Sans JP | 24px | 18px | 900 |
| CTA | Noto Sans JP | 24px | 16px | 900 |

### スペーシング

- セクション上下余白: 60px（PC）/ 40px（SP）
- コンテンツ間マージン: 40px（PC）/ 24px（SP）
- パディング: 40px（PC）/ 20px（SP）

### 効果

- **グラデーション**: 紫→シアン→オレンジの3色ブレンド
- **ブラー**: backdrop-filter: blur(10px) でガラスモルフィズム
- **シャドウ**: 複数レイヤーで立体感
- **アニメーション**: ホバー時の拡大、矢印スライド、スクロールバウンス

---

## 🚀 実装手順

### 1. 画像生成

```bash
# NanoBanaスキル起動
/nanobanana-pro
```

上記の「NanoBanana画像生成プロンプト」をコピー＆ペーストして実行

**生成する画像**:
1. ヒーローセクション背景（1920x1080）
2. アイコン1: eスポーツ観戦→副業（512x512）
3. アイコン2: 週末自動化（512x512）
4. アイコン3: 家族の余裕（512x512）

### 2. ファイル配置

```
project/
├── index.html          # 上記HTMLコード
├── styles.css          # 上記CSSコード
└── images/
    ├── hero-bg-gaming-ai.png      # ヒーロー背景
    ├── icon-esports-hint.png      # アイコン1
    ├── icon-weekend-auto.png      # アイコン2
    └── icon-family-comfort.png    # アイコン3
```

### 3. HTML修正

画像パスを実際のファイル名に変更：

```html
<img src="images/hero-bg-gaming-ai.png" alt="Background" class="hero-bg-image">
```

### 4. テスト

- **デスクトップ**: Chrome DevTools（1920x1080）
- **タブレット**: iPad Pro（1024x768）
- **モバイル**: iPhone 14 Pro（390x844）

### 5. 最適化

```bash
# 画像圧縮（TinyPNG推奨）
# ヒーロー背景: 300KB以下
# アイコン: 50KB以下

# CSS/JSミニファイ
# Critical CSS抽出
```

---

## 📊 A/Bテストバリエーション案

### パターンA（現行）
- **ヘッドライン**: "ゲーム観戦しながら月20万円稼いで、家族との時間も守る"
- **CTA**: "ゲームも家族も諦めない人生へ"

### パターンB（緊急性訴求）
- **ヘッドライン**: "今週末から始める。ゲーム観戦が月20万円の副収入に"
- **CTA**: "まずは無料でやり方を見る"

### パターンC（実績訴求）
- **ヘッドライン**: "283名が実践中。ゲーム好きの週末副業で平均月18.7万円"
- **CTA**: "成功者の声を見る"

---

## ✅ チェックリスト

### デザイン
- [ ] ヒーロー背景画像が正しく表示される
- [ ] グラデーションオーバーレイが適用されている
- [ ] テキストが読みやすい（コントラスト比4.5:1以上）
- [ ] フォントが正しく読み込まれている

### コンテンツ
- [ ] ヘッドラインが3行以内に収まっている
- [ ] ベネフィット3点が明確に表示されている
- [ ] ボディコピーが読みやすく改行されている
- [ ] CTAボタンが目立っている

### レスポンシブ
- [ ] PC（1920px）で正しく表示
- [ ] タブレット（768px）で正しく表示
- [ ] モバイル（375px）で正しく表示
- [ ] 各ブレークポイントでフォントサイズが適切

### パフォーマンス
- [ ] 画像が最適化されている（WebP対応）
- [ ] Largest Contentful Paint < 2.5s
- [ ] First Input Delay < 100ms
- [ ] Cumulative Layout Shift < 0.1

### アクセシビリティ
- [ ] alt属性が設定されている
- [ ] コントラスト比が適切
- [ ] キーボードナビゲーション可能
- [ ] スクリーンリーダー対応

---

## 🎯 期待される効果

### 心理的訴求ポイント

1. **共感**: "大きな成功はいらない" → 親近感
2. **具体性**: "月20万円" "年間240万円" → 信憑性
3. **バランス**: ゲーム・家族・仕事の両立 → 実現可能性
4. **感情**: 子供の習い事、家族旅行 → 感情移入

### コンバージョン最適化

- **ファーストビュー完結**: スクロール不要で全情報
- **視線誘導**: 見出し→ベネフィット→ボディ→CTA
- **信頼構築**: リアルな悩み共感で壁を下げる
- **行動喚起**: CTAボタンが自然な結論

---

このパッケージをそのまま使用すれば、ゲーム観戦×AI副業のヒーローセクションが完成します。
