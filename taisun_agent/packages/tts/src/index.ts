/**
 * @taisun/tts
 *
 * 日本語TTS統合パッケージ
 * T5Gemma-TTS (非商用) + Edge TTS (商用可) の統合
 *
 * @example
 * ```typescript
 * import { TTSManager, preprocessJapaneseText } from "@taisun/tts";
 *
 * const manager = new TTSManager();
 * manager.registerEdgeTTS();
 *
 * const result = await manager.synthesize({
 *   text: "こんにちは、世界！",
 *   outputPath: "./output.wav",
 * });
 * ```
 */

// Types
export type {
  TTSProviderId,
  AudioFormat,
  TTSRequest,
  TTSResult,
  TTSProviderConfig,
  T5GemmaConfig,
  T5GemmaOptions,
  EdgeTTSConfig,
  EdgeTTSOptions,
  EdgeTTSVoice,
  JapaneseReadingRule,
  JapanesePreprocessOptions,
  TTSProvider,
  QAValidationResult,
  TTSManagerConfig,
} from "./types.js";

// Clients
export {
  T5GemmaTTSClient,
  createT5GemmaTTSClient,
  DEFAULT_T5GEMMA_CONFIG,
} from "./clients/t5gemma-tts.js";

export {
  EdgeTTSClient,
  createEdgeTTSClient,
  DEFAULT_EDGE_TTS_CONFIG,
  JAPANESE_VOICES,
  getJapaneseVoiceInfo,
} from "./clients/edge-tts.js";

// Manager
export {
  TTSManager,
  createTTSManager,
  quickSynthesize,
  DEFAULT_TTS_MANAGER_CONFIG,
} from "./manager/tts-manager.js";

// Skills
export {
  preprocessJapaneseText,
  segmentText,
  estimateMoraCount,
  convertNumberToJapanese,
  NUMBER_READING_RULES,
  ABBREVIATION_READING_RULES,
  IDIOM_READING_RULES,
  BUSINESS_READING_RULES,
  EMOTION_PRESETS,
} from "./skills/japanese-reading.js";
export type { EmotionPreset } from "./skills/japanese-reading.js";
