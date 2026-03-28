# スライド生成プロンプト集

## スライド1: タイトル
```
アニメ風イラスト、システム概要図、長文テキストが流れ込む入力パイプと、カラフルなアニメキャラクターが説明するスライドが出力される様子。未来的なテクノロジー感、日本のアニメスタイル、明るいパステルカラー、クリーンなデザイン
```

## スライド2: テキスト分析レイヤー
```
可愛いAIアシスタントキャラクター（アニメ風）が大量のテキストドキュメントを分析している様子。吹き出しでキーポイントを抽出。Claude AIのロゴ風デザイン、温かい色調、プロフェッショナルだがフレンドリーな雰囲気
```

## スライド3: 画像生成レイヤー
```
魔法使いのようなアニメキャラクターが杖を振ると、テキストが美しいイラストに変換される様子。Stable Diffusion、DALL-E、Geminiのイメージを融合。紫とブルーのグラデーション、魔法のパーティクルエフェクト
```

## スライド4: スライド生成レイヤー
```
ロボットアーティスト（アニメ風）がイーゼルの前でプレゼンテーションスライドを作成している様子。複数のスライドが浮遊し、それぞれにアニメ風のイラストが入っている。モダンなオフィス環境、ミニマルなデザイン
```

## スライド5: MCP統合
```
可愛いコネクタキャラクター達（アニメ風）が手をつないでデータを受け渡している様子。PlaywrightロボットがWebブラウザを操作、GitHubの猫キャラクター、Apifyの蜂キャラクター。楽しいチームワークの雰囲気
```

## スライド6: 完成イメージ
```
完成したアニメ風スライドデッキのショーケース。複数のスライドが扇状に広がり、各スライドに美しいアニメイラストとテキストが配置されている。プレゼンテーション画面、観客が感動している様子、スタンディングオベーション
```

---

## NanoBanana Pro 実行コマンド

```bash
# スライド1: タイトル
python3 scripts/run.py image_generator.py \
  --prompt "anime style illustration, system overview diagram showing long text flowing into input pipe and colorful anime characters explaining slides as output, futuristic technology feel, Japanese anime style, bright pastel colors, clean design" \
  --output ~/Desktop/開発2026/taisun_agent2026/slides/slide1_title.png

# スライド2: テキスト分析
python3 scripts/run.py image_generator.py \
  --prompt "cute AI assistant character (anime style) analyzing large text documents, speech bubbles extracting key points, Claude AI inspired design, warm color tones, professional but friendly atmosphere" \
  --output ~/Desktop/開発2026/taisun_agent2026/slides/slide2_text_analysis.png

# スライド3: 画像生成
python3 scripts/run.py image_generator.py \
  --prompt "magical wizard anime character waving wand transforming text into beautiful illustrations, Stable Diffusion DALL-E Gemini fusion imagery, purple and blue gradients, magical particle effects" \
  --output ~/Desktop/開発2026/taisun_agent2026/slides/slide3_image_gen.png

# スライド4: スライド生成
python3 scripts/run.py image_generator.py \
  --prompt "robot artist (anime style) creating presentation slides at easel, multiple floating slides with anime illustrations inside, modern office environment, minimal design" \
  --output ~/Desktop/開発2026/taisun_agent2026/slides/slide4_slide_gen.png

# スライド5: MCP統合
python3 scripts/run.py image_generator.py \
  --prompt "cute connector characters (anime style) holding hands passing data, Playwright robot operating web browser, GitHub cat character, Apify bee character, fun teamwork atmosphere" \
  --output ~/Desktop/開発2026/taisun_agent2026/slides/slide5_mcp.png

# スライド6: 完成イメージ
python3 scripts/run.py image_generator.py \
  --prompt "completed anime style slide deck showcase, multiple slides fanning out with beautiful anime illustrations and text, presentation screen, impressed audience giving standing ovation" \
  --output ~/Desktop/開発2026/taisun_agent2026/slides/slide6_final.png
```
