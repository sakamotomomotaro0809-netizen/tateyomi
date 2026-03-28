# @taisun/tts

日本語TTS統合パッケージ - T5Gemma-TTS + Edge TTS

## 概要

`@taisun/tts` は、複数のTTSエンジンを統合した日本語音声合成パッケージです。
商用/非商用に応じて最適なエンジンを自動選択します。

| エンジン | 品質 | 商用利用 | 特徴 |
|----------|------|----------|------|
| **T5Gemma-TTS** | 高品質 | ❌ 非商用のみ | 表現力豊か、参照音声から模倣可能 |
| **Edge TTS** | 高品質 | ✅ 商用可 | Microsoft製、100%正確な読み上げ |

## インストール

```bash
npm install @taisun/tts
```

### 依存関係のインストール

```bash
# Edge TTS (Python)
pip install edge-tts

# T5Gemma-TTS (オプション・非商用のみ)
# 別途セットアップが必要 (scripts/setup.sh 参照)
```

## クイックスタート

### 1. 基本的な音声合成

```typescript
import { TTSManager } from "@taisun/tts";

const manager = new TTSManager();
manager.registerEdgeTTS();

const result = await manager.synthesize({
  text: "こんにちは、世界！",
  outputPath: "./output.wav",
});

console.log(result.outputPath); // ./output.wav
console.log(result.durationMs); // 音声の長さ（ミリ秒）
```

### 2. 日本語前処理付き合成

```typescript
import { TTSManager, preprocessJapaneseText } from "@taisun/tts";

const manager = new TTSManager();
manager.registerEdgeTTS();

// 漢字・英語略語を読み仮名に変換
const result = await manager.synthesizeJapanese(
  "AIで累計売上30億円を達成！",
  {
    outputPath: "./output.wav",
    preprocessOptions: {
      convertNumbers: true,
      convertAbbreviations: true,
    },
  }
);
// → "えーあいでるいけいうりあげさんじゅうおくえんをたっせい！"
```

### 3. 商用/非商用モード

```typescript
const manager = new TTSManager({
  commercialModeDefault: true, // 商用モード（Edge TTSのみ）
});
manager.registerEdgeTTS();

// 商用利用可能なエンジンのみ使用
const result = await manager.synthesize({
  text: "商用コンテンツ用ナレーション",
  commercialMode: true,
});
```

### 4. T5Gemma-TTS（高品質・非商用）

```typescript
const manager = new TTSManager();
manager.registerT5Gemma("./external/T5Gemma-TTS");

const result = await manager.synthesize({
  text: "高品質なナレーション",
  commercialMode: false, // 非商用のみ
  options: {
    temperature: 0.85,
    topK: 35,
    topP: 0.92,
  },
});
```

## CLI ツール

### 音声合成

```bash
# Edge TTS で合成
taisun-tts synthesize -t "こんにちは" -o output.wav

# 日本語前処理付き
taisun-tts synthesize -t "AIで売上30億円" -o output.wav --preprocess

# 商用モード
taisun-tts synthesize -t "商用ナレーション" -o output.wav --commercial

# 音声を指定
taisun-tts synthesize -t "テスト" -o output.wav -v ja-JP-KeitaNeural
```

### 日本語前処理

```bash
# テキストを前処理
taisun-tts preprocess -t "AIで累計売上30億円"
# → えーあいでるいけいうりあげさんじゅうおくえん
```

### テキスト分割

```bash
# 長いテキストを30秒単位で分割
taisun-tts segment -t "長いテキスト..." -s 30
```

### 音声一覧

```bash
taisun-tts voices
```

### ヘルスチェック

```bash
taisun-tts health
```

### バッチ処理

```bash
# input.json: ["テキスト1", "テキスト2", ...]
taisun-tts batch -i input.json -o ./output
```

## 日本語読み上げルール

### 数字の変換

| 表記 | 読み方 |
|------|--------|
| 30億円 | さんじゅうおくえん |
| 99% | きゅうじゅうきゅうパーセント |
| 2026年 | にせんにじゅうろくねん |
| 1ヶ月 | いっかげつ |

### 英語略語の変換

| 表記 | 読み方 |
|------|--------|
| AI | えーあい |
| SNS | えすえぬえす |
| LINE | らいん |
| YouTube | ゆーちゅーぶ |
| LP | えるぴー |
| VSL | ぶいえすえる |

### 四字熟語・ビジネス用語

| 表記 | 読み方 |
|------|--------|
| 虎視眈々 | こしたんたん |
| 先行者利益 | せんこうしゃりえき |
| 累計売上 | るいけいうりあげ |
| 期間限定 | きかんげんてい |

## 感情プリセット（T5Gemma-TTS用）

セールスコピーの感情表現に最適化されたパラメータ:

```typescript
import { EMOTION_PRESETS } from "@taisun/tts";

// 問題提起（Pain）- やや低め、共感を込めて
EMOTION_PRESETS.pain
// temperature: 0.75, topK: 25, topP: 0.88

// 転換（Bridge）- 希望を感じさせる
EMOTION_PRESETS.bridge
// temperature: 0.8, topK: 30, topP: 0.9

// ベネフィット - 明るく、期待感を煽る
EMOTION_PRESETS.benefit
// temperature: 0.85, topK: 35, topP: 0.92

// CTA - 緊急性、切迫感
EMOTION_PRESETS.cta
// temperature: 0.88, topK: 38, topP: 0.9
```

## Edge TTS 音声一覧

| Voice ID | 名前 | 性別 | スタイル |
|----------|------|------|----------|
| ja-JP-NanamiNeural | Nanami | 女性 | 明るい・フレンドリー |
| ja-JP-KeitaNeural | Keita | 男性 | 落ち着き・ビジネス |
| ja-JP-AoiNeural | Aoi | 女性 | 若い・元気 |
| ja-JP-DaichiNeural | Daichi | 男性 | フォーマル・ニュース |
| ja-JP-MayuNeural | Mayu | 女性 | 温かい・やさしい |
| ja-JP-NaokiNeural | Naoki | 男性 | ニュース・報道 |
| ja-JP-ShioriNeural | Shiori | 女性 | 自然・会話 |

## API リファレンス

### TTSManager

```typescript
class TTSManager {
  // プロバイダー登録
  registerProvider(provider: TTSProvider): void;
  registerEdgeTTS(voice?: string): void;
  registerT5Gemma(t5gemmaDir: string, hfToken?: string): void;

  // 自動登録
  autoRegisterProviders(options?: {...}): Promise<void>;

  // 合成
  synthesize(request: TTSRequest): Promise<TTSResult>;
  synthesizeJapanese(text: string, options?: {...}): Promise<TTSResult>;

  // ユーティリティ
  getAvailableProviders(): TTSProvider[];
  healthCheck(): Promise<Map<TTSProviderId, boolean>>;
  dispose(): Promise<void>;
}
```

### 前処理関数

```typescript
// 日本語前処理
preprocessJapaneseText(text: string, options?: JapanesePreprocessOptions): string;

// テキスト分割
segmentText(text: string, options?: { maxSeconds?: number }): string[];

// モーラ数推定
estimateMoraCount(text: string): number;
```

## ライセンス

- **@taisun/tts**: MIT
- **T5Gemma-TTS**: CC-BY-NC-4.0（非商用のみ）
- **Edge TTS**: Microsoft Services Agreement（商用可）

## 関連 Issue

- [Issue #20: T5Gemma-TTS統合](https://github.com/taiyousan15/taisun_v2/issues/20)
- [Issue #21: Edge TTS日本語ナレーション](https://github.com/taiyousan15/taisun_v2/issues/21)
