# NanoBanana LP画像生成 メタプロンプトフォーマット

## フォーマット構造

各LP画像生成用のプロンプトは、以下の構造化フォーマットを使用します。

---

## テンプレート v1.0

```
[IMAGE_TYPE]: {セクション名}

**Purpose**: {画像の目的・役割}
**Section**: {LPのどのセクションで使用するか}
**Aspect Ratio**: {アスペクト比: 16:9 / 1:1 / 9:16}

**Visual Elements**:
- Subject: {メインの被写体}
- Background: {背景の説明}
- Color Palette: {使用する色（HEXコードまたは色名）}
- Style: {ビジュアルスタイル}
- Mood: {雰囲気・トーン}

**Composition**:
- Layout: {構図の説明}
- Focal Point: {視線誘導のポイント}
- Text Space: {テキストを配置する余白の位置}

**Technical Specs**:
- Resolution: {推奨解像度}
- Format: {PNG / JPEG}
- Optimization: {Web用最適化の有無}

**Prompt (English)**:
{実際の英語プロンプト（200-300語）}

**Negative Prompt**:
{除外したい要素}

**Style Tags**:
{スタイル指定タグ: #modern #professional #gradient #flat-design など}
```

---

## セクション別プロンプト例

### 1. ヒーローセクション画像

```
[HERO_IMAGE]: フランチャイズ募集ヒーロービジュアル

**Purpose**: 第一印象でビジネスの魅力を伝える
**Section**: トップヒーローセクション
**Aspect Ratio**: 16:9 (横長)

**Visual Elements**:
- Subject: AI教育、ビジネス成長、デジタル未来のコンセプト
- Background: 赤から青へのグラデーション（#ff273c → #0088ff）
- Color Palette:
  - Primary: #ff273c (赤), #0088ff (青)
  - Accent: #ef6c00 (オレンジ)
  - Text: #FFFFFF (白)
- Style: Modern, Tech-focused, Professional
- Mood: 革新的、前向き、成功への期待感

**Composition**:
- Layout: 中央に抽象的なAI/テクノロジーモチーフ、左右対称
- Focal Point: 画面中央やや上
- Text Space: 中央上部（見出し用）、中央下部（CTA用）

**Technical Specs**:
- Resolution: 1920x1080px
- Format: PNG (透過なし)
- Optimization: Web用圧縮

**Prompt (English)**:
Create a modern hero section background image for an AI education franchise recruitment landing page. The image should feature an abstract digital landscape with flowing gradients from vibrant red (#ff273c) on the left transitioning smoothly to electric blue (#0088ff) on the right. Incorporate subtle geometric patterns, neural network nodes, or circuit board elements to represent AI technology. The composition should be clean and professional with plenty of negative space in the center for text overlay. Add floating holographic elements or light particles to create depth and a sense of innovation. The overall mood should be inspiring, forward-thinking, and convey business success and partnership opportunity. Ultra-modern aesthetic with smooth gradients, no people, no specific text, suitable for web design.

**Negative Prompt**:
photorealistic people, faces, specific logos, cluttered composition, dark mood, outdated design, cartoonish style, low resolution, watermarks, text overlays

**Style Tags**:
#modern #gradient #tech #abstract #professional #web-design #hero-section #innovation
```

---

### 2. アイコンイラスト（3カラム特徴セクション）

```
[ICON_ILLUSTRATION]: 成長市場アイコン

**Purpose**: ビジネスの成長性を視覚的に表現
**Section**: 選ばれる3つの理由 - 項目1
**Aspect Ratio**: 1:1 (正方形)

**Visual Elements**:
- Subject: 上昇するグラフ、トレンドライン
- Background: 透過または白
- Color Palette: 赤→青グラデーション (#ff273c → #0088ff)
- Style: Flat design, Icon style, Minimalist
- Mood: ポジティブ、成長、機会

**Composition**:
- Layout: アイコン中心配置、周囲に余白
- Focal Point: グラフの上昇部分
- Text Space: アイコン下部（テキスト説明用）

**Technical Specs**:
- Resolution: 512x512px
- Format: PNG (透過背景)
- Optimization: アイコンサイズで使用可能

**Prompt (English)**:
Design a flat-style icon illustration representing market growth and business opportunity. Create an upward trending graph or chart with smooth curves, featuring a gradient color scheme from red (#ff273c) to blue (#0088ff). The icon should be simple, clean, and easily recognizable at small sizes. Include subtle elements like upward arrows, rising bars, or growth indicators. The style should be modern flat design with minimal details, suitable for a professional business website. No background or transparent background preferred. The icon should convey positive momentum, expansion, and success in a sophisticated manner.

**Negative Prompt**:
3D rendering, photorealistic, overly detailed, complex patterns, dark colors, declining graphs, negative symbols, textured backgrounds

**Style Tags**:
#flat-design #icon #minimal #gradient #growth #business #modern
```

---

### 3. プロセス図解イラスト

```
[PROCESS_DIAGRAM]: ステップ1 - オンライン開業

**Purpose**: ビジネスモデルの第一ステップを視覚化
**Section**: ビジネスモデル - ステップ01
**Aspect Ratio**: 16:9 (横長)

**Visual Elements**:
- Subject: ノートPC、スマートフォン、リモートワークシーン
- Background: 明るいグレーまたは白
- Color Palette:
  - Primary: #0088ff (青)
  - Accent: #ef6c00 (オレンジ)
  - Neutral: #F5F5F5 (ライトグレー)
- Style: Modern illustration, Clean lines, Tech aesthetic
- Mood: 効率的、シンプル、アクセス可能

**Composition**:
- Layout: 左から右へのフロー、デバイス配置
- Focal Point: 中央のノートPC画面
- Text Space: 左側または上部（ステップ番号・タイトル用）

**Technical Specs**:
- Resolution: 1200x675px
- Format: PNG
- Optimization: Web用最適化

**Prompt (English)**:
Create a modern illustration showing an online business setup for the first step of a franchise business model. Feature a sleek laptop and smartphone on a clean workspace, with abstract digital elements floating around them representing online connectivity. Use a color palette of electric blue (#0088ff) and orange accents (#ef6c00) against a light background. The style should be contemporary with clean lines and a tech-forward aesthetic. Include subtle wifi signals, cloud icons, or digital interface elements to emphasize the online nature of the business. The illustration should convey ease of access, low barrier to entry, and modern digital business practices. Maintain a professional yet approachable visual tone suitable for a franchise recruitment page.

**Negative Prompt**:
photorealistic, cluttered workspace, people faces, specific brand logos, dark mood, outdated technology, cartoon style, messy composition

**Style Tags**:
#illustration #modern #tech #online-business #clean-design #professional #step-diagram
```

---

### 4. インフォグラフィック（収益表）

```
[INFOGRAPHIC]: 収益シミュレーションチャート

**Purpose**: 収益モデルを視覚的にわかりやすく表現
**Section**: 収益シミュレーション
**Aspect Ratio**: 16:9 (横長)

**Visual Elements**:
- Subject: 右肩上がりのグラフ、収益の視覚化
- Background: 白またはライトグレー
- Color Palette:
  - Growth: #0088ff → #00C853 (青から緑)
  - Accent: #ef6c00 (オレンジ)
  - Text: #121212 (黒)
- Style: Professional chart, Data visualization, Clean infographic
- Mood: 信頼性、成長性、透明性

**Composition**:
- Layout: グラフ中心、データポイント明確
- Focal Point: グラフの上昇トレンドライン
- Text Space: グラフ左側（軸ラベル）、上部（タイトル）

**Technical Specs**:
- Resolution: 1200x675px
- Format: PNG
- Optimization: データ可読性優先

**Prompt (English)**:
Design a professional infographic illustrating revenue growth and financial projections for a franchise business. Create a clean line chart showing upward progression from left to right, using a gradient color scheme transitioning from blue (#0088ff) to green (#00C853) to represent growth and profitability. Include bar chart elements or data points highlighting key financial milestones. The design should be modern and corporate-appropriate with clear visual hierarchy. Add subtle grid lines and axis indicators. Incorporate money-related visual elements like yen symbols (¥) or coin icons in a tasteful manner. The overall aesthetic should inspire confidence and present data in an accessible, professional format suitable for a business opportunity presentation. Clean background with plenty of white space.

**Negative Prompt**:
cluttered design, overly complex charts, cartoonish money symbols, dark background, confusing data presentation, 3D effects, excessive decorations

**Style Tags**:
#infographic #data-visualization #chart #professional #revenue #clean-design #business
```

---

### 5. 人物ポートレート（お客様の声）

```
[PORTRAIT]: パートナー成功事例ポートレート

**Purpose**: 信頼性と親近感を与えるパートナーの顔
**Section**: パートナーの声 - 証言1
**Aspect Ratio**: 1:1 (正方形)

**Visual Elements**:
- Subject: 40代日本人男性ビジネスマン
- Background: ぼかしたオフィス環境
- Color Palette:
  - Skin tone: 自然な日本人肌色
  - Background: ニュートラルグレー、木目
  - Clothing: ネイビー、白シャツ
- Style: Professional portrait, Warm lighting, Confident pose
- Mood: 成功、自信、信頼性

**Composition**:
- Layout: 肩から上のポートレート、やや斜め向き
- Focal Point: 目線（カメラ目線または少し外す）
- Text Space: 下部（名前・肩書き用）

**Technical Specs**:
- Resolution: 800x800px
- Format: JPEG
- Optimization: ポートレート品質優先

**Prompt (English)**:
Generate a professional portrait photograph of a confident Japanese businessman in his 40s for a franchise partner testimonial section. The subject should appear successful and approachable, wearing business casual attire (navy blazer or shirt). Natural warm lighting should illuminate the face from a slight angle, creating a professional yet friendly atmosphere. The background should be a softly blurred office environment with neutral tones - perhaps bookshelves, plants, or modern office elements out of focus. The man should have a genuine, confident smile and eyes that convey trustworthiness and achievement. Photography style should be corporate headshot quality with natural skin tones and professional color grading. Suitable for a business success story or testimonial section on a landing page.

**Negative Prompt**:
cartoon, illustration, overly posed, artificial lighting, cluttered background, unprofessional attire, extreme angles, filters, glamour style, stock photo watermarks

**Style Tags**:
#portrait #professional #business #testimonial #photography #japanese #corporate
```

---

### 6. フロー図・タイムライン

```
[TIMELINE_ILLUSTRATION]: 加盟までの5ステッププロセス

**Purpose**: 加盟プロセスを段階的に視覚化
**Section**: 加盟までの流れ
**Aspect Ratio**: 9:16 (縦長) または 16:9 (横長フロー)

**Visual Elements**:
- Subject: 5つのステップを繋ぐフローチャート
- Background: 白またはライトグラデーション
- Color Palette:
  - Step progression: #ff273c → #ef6c00 → #0088ff (グラデーション遷移)
  - Connection: #CCCCCC (ライトグレー)
- Style: Clean infographic, Step-by-step visualization, Modern
- Mood: 明確、達成可能、段階的

**Composition**:
- Layout: 左から右へ（横）または上から下へ（縦）の流れ
- Focal Point: 各ステップのアイコン
- Text Space: 各ステップボックス内

**Technical Specs**:
- Resolution: 1200x675px (横) or 675x1200px (縦)
- Format: PNG
- Optimization: Web表示最適化

**Prompt (English)**:
Design a modern process flow diagram illustrating a 5-step franchise onboarding journey. Create a horizontal timeline with five distinct stages, each represented by a circular icon or numbered badge connected by arrows or flowing lines. Use a gradient color progression from red (#ff273c) at the start, transitioning through orange (#ef6c00) in the middle, to blue (#0088ff) at the end, symbolizing the journey from interest to successful launch. Each step should have space for a title and brief description. Include subtle icons representing: 1) Information/documents, 2) Consultation/dialogue, 3) Approval/contract, 4) Training/education, 5) Launch/success. The design should be clean, professional, and easy to follow, with clear visual hierarchy and flow direction. Modern flat design aesthetic with minimal shadows and clean lines.

**Negative Prompt**:
cluttered layout, confusing flow direction, overly complex icons, dark colors, 3D effects, photorealistic elements, unclear progression

**Style Tags**:
#timeline #flow-chart #process #step-by-step #infographic #modern #clean-design
```

---

### 7. CTA背景画像

```
[CTA_BACKGROUND]: フォームセクション背景

**Purpose**: 行動喚起を促す温かみのある背景
**Section**: 無料資料請求フォーム
**Aspect Ratio**: 16:9 (横長)

**Visual Elements**:
- Subject: ビジネス握手、パートナーシップのコンセプト
- Background: 柔らかいグラデーション
- Color Palette:
  - Primary: #0088ff (青) ベース
  - Accent: #ef6c00 (オレンジ) CTAボタン用
  - Overlay: 半透明白 (#FFFFFF 50%)
- Style: Professional, Inspiring, Warm atmosphere
- Mood: 信頼、パートナーシップ、前向き

**Composition**:
- Layout: 左右分割可能（左：画像、右：フォーム）
- Focal Point: 画面左側または背景全体にソフトフォーカス
- Text Space: 右半分または中央（フォーム配置用）

**Technical Specs**:
- Resolution: 1920x1080px
- Format: JPEG
- Optimization: 背景画像として最適化

**Prompt (English)**:
Create an inspiring background image for a call-to-action form section promoting franchise partnership opportunities. The image should convey trust, collaboration, and business success through abstract representations of handshake, partnership, or collaborative work. Use a soft blue (#0088ff) color palette with warm orange (#ef6c00) accent elements. The composition should allow for text and form overlay, with the main visual interest concentrated on the left side or as a subtle full-width background. Include soft gradients, gentle lighting effects, and abstract business imagery that feels professional yet approachable. The mood should be optimistic and encouraging, inspiring potential partners to take action. Ensure there's adequate contrast and space for white form elements to be clearly visible when overlaid.

**Negative Prompt**:
specific people faces, corporate stock photo clichés, overly busy composition, dark mood, aggressive sales imagery, cluttered elements, low contrast

**Style Tags**:
#background #cta #partnership #professional #warm #inspiring #gradient
```

---

## 使用ガイドライン

### 1. プロンプトのカスタマイズ

各セクションに応じて、以下を調整してください：

- **Color Palette**: ブランドカラーに合わせて変更
- **Subject**: ビジネス内容に応じた被写体に変更
- **Mood**: ターゲット層に合わせたトーン調整
- **Aspect Ratio**: 使用場所に応じたサイズ変更

### 2. 生成後の確認ポイント

✅ ブランドカラーとの整合性
✅ テキストオーバーレイ用の余白確保
✅ 解像度・品質の適切性
✅ ターゲット層への訴求力
✅ LP全体のデザイン統一感

### 3. 最適化ワークフロー

```
1. セクション特定
   ↓
2. 該当テンプレート選択
   ↓
3. ブランド情報でカスタマイズ
   ↓
4. NanoBananaで生成
   ↓
5. 品質確認・調整
   ↓
6. Web用最適化
   ↓
7. LP実装
```

### 4. バリエーション生成

同じセクションで複数案が必要な場合：

- **Color variations**: カラーパレットを変更
- **Composition alternatives**: 構図を左右反転、縦横変更
- **Style variations**: イラスト↔写真風、抽象↔具体的
- **Mood adjustments**: フォーマル↔カジュアル

---

## セクション別クイックリファレンス

| セクション | 画像タイプ | アスペクト比 | 主要カラー | 優先スタイル |
|-----------|-----------|------------|----------|-----------|
| Hero | HERO_IMAGE | 16:9 | Red-Blue Gradient | Abstract, Modern |
| ロゴスライダー | LOGO_BG | 16:9 | White/Light Gray | Clean, Minimal |
| 3つの理由 | ICON_ILLUSTRATION | 1:1 | Gradient | Flat Design, Icons |
| ビジネスモデル | PROCESS_DIAGRAM | 16:9 | Blue, Orange | Illustration, Tech |
| 収益表 | INFOGRAPHIC | 16:9 | Blue-Green | Data Viz, Professional |
| お客様の声 | PORTRAIT | 1:1 | Natural | Photography, Warm |
| 加盟フロー | TIMELINE | 9:16 or 16:9 | Red→Orange→Blue | Infographic, Flow |
| CTAフォーム | CTA_BACKGROUND | 16:9 | Blue, Orange | Inspiring, Professional |

---

## NanoBanana固有の最適化ヒント

### Google Geminiに効果的なプロンプト要素

1. **明確な英語記述**: 具体的で詳細な英語プロンプト
2. **スタイルタグ**: #タグでスタイルを明示
3. **Negative Prompt**: 除外要素を明確に指定
4. **構図指示**: Composition部分で配置を明確化
5. **カラーコード**: HEX値で正確な色指定

### 生成品質を上げるコツ

- プロンプトは200-300語が理想
- 抽象的表現より具体的描写
- 参照スタイル（例: "like Apple's design language"）を追加
- 複数生成して最良を選択
- 微調整はプロンプトの小さな変更で対応

---

## バージョン履歴

- **v1.0** (2026-01-09): 初版作成 - ホリエモンAI学校LP構造を基にしたテンプレート

---

## ライセンス・使用条件

このテンプレートは、TAISUN v2プロジェクトの一部として提供されます。
商用・非商用問わず自由に使用・改変可能です。
