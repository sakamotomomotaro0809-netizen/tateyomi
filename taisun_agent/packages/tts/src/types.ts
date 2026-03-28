/**
 * @taisun/tts - Type Definitions
 *
 * T5Gemma-TTS + Edge TTS 統合パッケージの型定義
 */

/**
 * TTSプロバイダーID
 */
export type TTSProviderId = "t5gemma" | "edge-tts" | "voicevox" | "auto";

/**
 * 音声フォーマット
 */
export type AudioFormat = "wav" | "mp3" | "ogg";

/**
 * TTS合成リクエスト
 */
export interface TTSRequest {
  /** 合成するテキスト */
  text: string;
  /** 出力ファイルパス */
  outputPath?: string;
  /** 音声フォーマット */
  format?: AudioFormat;
  /** 商用利用モード（trueの場合、商用可能なエンジンのみ使用） */
  commercialMode?: boolean;
  /** 参照音声使用の同意確認（Voice Cloning使用時） */
  consentVerified?: boolean;
  /** プロバイダー固有オプション */
  options?: Record<string, unknown>;
}

/**
 * TTS合成結果
 */
export interface TTSResult {
  /** 成功フラグ */
  success: boolean;
  /** 音声データ（Buffer） */
  audioData?: Buffer;
  /** 出力ファイルパス */
  outputPath?: string;
  /** 音声の長さ（ミリ秒） */
  durationMs: number;
  /** サンプルレート */
  sampleRate: number;
  /** フォーマット */
  format: AudioFormat;
  /** 使用したプロバイダー */
  provider?: TTSProviderId;
  /** エラーメッセージ */
  error?: string;
}

/**
 * TTSプロバイダー設定
 */
export interface TTSProviderConfig {
  /** プロバイダーID */
  providerId: TTSProviderId;
  /** エンドポイントURL（リモートサービス用） */
  endpoint?: string;
  /** APIキー */
  apiKey?: string;
  /** タイムアウト（ミリ秒） */
  timeoutMs?: number;
  /** 出力ディレクトリ */
  outputDir?: string;
  /** 商用利用可能か */
  commercialAllowed: boolean;
  /** ライセンス情報 */
  license: string;
}

/**
 * T5Gemma-TTS固有設定
 */
export interface T5GemmaConfig extends TTSProviderConfig {
  providerId: "t5gemma";
  /** Python実行パス */
  pythonPath: string;
  /** T5Gemma-TTSディレクトリ */
  t5gemmaDir: string;
  /** HuggingFaceモデルディレクトリ */
  modelDir: string;
  /** HuggingFaceトークン */
  hfToken?: string;
}

/**
 * T5Gemma-TTS合成オプション
 */
export interface T5GemmaOptions {
  /** 目標音声長（秒） */
  targetDuration?: number;
  /** サンプリング温度 */
  temperature?: number;
  /** Top-k サンプリング */
  topK?: number;
  /** Top-p サンプリング */
  topP?: number;
  /** ランダムシード */
  seed?: number;
  /** 参照音声パス（Voice Cloning用） */
  referenceSpeech?: string;
  /** 参照音声の書き起こし */
  referenceText?: string;
}

/**
 * Edge TTS固有設定
 */
export interface EdgeTTSConfig extends TTSProviderConfig {
  providerId: "edge-tts";
  /** 音声ID */
  voice?: string;
}

/**
 * Edge TTS音声オプション
 */
export interface EdgeTTSOptions {
  /** 音声ID */
  voice?: EdgeTTSVoice;
  /** 話速調整（-100% ~ +100%） */
  rate?: string;
  /** 音量調整（-100% ~ +100%） */
  volume?: string;
  /** ピッチ調整（-50Hz ~ +50Hz） */
  pitch?: string;
}

/**
 * Edge TTS 日本語音声ID
 */
export type EdgeTTSVoice =
  | "ja-JP-NanamiNeural"   // 女性（明るい）
  | "ja-JP-KeitaNeural"    // 男性（落ち着き）
  | "ja-JP-AoiNeural"      // 女性（若い）
  | "ja-JP-DaichiNeural"   // 男性（フォーマル）
  | "ja-JP-MayuNeural"     // 女性（温かい）
  | "ja-JP-NaokiNeural"    // 男性（ニュース）
  | "ja-JP-ShioriNeural";  // 女性（自然）

/**
 * 日本語読み上げ変換ルール
 */
export interface JapaneseReadingRule {
  /** 元の表記 */
  pattern: string | RegExp;
  /** 読み方（ひらがな/カタカナ） */
  reading: string;
  /** カテゴリ */
  category: "number" | "abbreviation" | "idiom" | "business" | "custom";
}

/**
 * 日本語テキスト前処理オプション
 */
export interface JapanesePreprocessOptions {
  /** 数字を日本語読みに変換 */
  convertNumbers?: boolean;
  /** 英語略語をカタカナに変換 */
  convertAbbreviations?: boolean;
  /** カスタムルールを適用 */
  customRules?: JapaneseReadingRule[];
}

/**
 * TTSプロバイダーインターフェース
 */
export interface TTSProvider {
  /** プロバイダーID */
  readonly providerId: TTSProviderId;
  /** プロバイダー名 */
  readonly name: string;
  /** 商用利用可能か */
  readonly commercialAllowed: boolean;
  /** ライセンス情報 */
  readonly license: string;

  /**
   * 音声を合成
   */
  synthesize(request: TTSRequest): Promise<TTSResult>;

  /**
   * ヘルスチェック
   */
  healthCheck(): Promise<boolean>;

  /**
   * リソース解放
   */
  dispose?(): Promise<void>;
}

/**
 * QA検証結果
 */
export interface QAValidationResult {
  /** 検証成功 */
  passed: boolean;
  /** 書き起こしテキスト */
  transcription?: string;
  /** 類似度スコア（0-1） */
  similarityScore?: number;
  /** 詳細メッセージ */
  details?: string;
}

/**
 * TTSマネージャー設定
 */
export interface TTSManagerConfig {
  /** 利用可能なプロバイダー設定 */
  providers: TTSProviderConfig[];
  /** デフォルトプロバイダー */
  defaultProvider?: TTSProviderId;
  /** 出力ディレクトリ */
  outputDir: string;
  /** 商用モードのデフォルト */
  commercialModeDefault?: boolean;
  /** QA検証を有効化 */
  enableQA?: boolean;
}
