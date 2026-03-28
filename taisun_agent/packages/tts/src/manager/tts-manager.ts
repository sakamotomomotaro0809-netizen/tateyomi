/**
 * TTS Manager
 *
 * T5Gemma-TTS と Edge TTS を統合管理
 * 商用/非商用モードに応じて自動でエンジンを選択
 */

import type {
  TTSProvider,
  TTSRequest,
  TTSResult,
  TTSManagerConfig,
  TTSProviderId,
} from "../types.js";
import { T5GemmaTTSClient } from "../clients/t5gemma-tts.js";
import { EdgeTTSClient } from "../clients/edge-tts.js";
import { preprocessJapaneseText } from "../skills/japanese-reading.js";

/**
 * デフォルト設定
 */
export const DEFAULT_TTS_MANAGER_CONFIG: Partial<TTSManagerConfig> = {
  outputDir: "./output/tts",
  commercialModeDefault: false,
  enableQA: false,
};

/**
 * 統合TTSマネージャー
 */
export class TTSManager {
  private providers: Map<TTSProviderId, TTSProvider> = new Map();
  private config: TTSManagerConfig;

  constructor(config: Partial<TTSManagerConfig> = {}) {
    this.config = {
      providers: [],
      outputDir: "./output/tts",
      ...DEFAULT_TTS_MANAGER_CONFIG,
      ...config,
    };
  }

  /**
   * プロバイダーを登録
   */
  registerProvider(provider: TTSProvider): void {
    this.providers.set(provider.providerId, provider);
  }

  /**
   * T5Gemma-TTSを登録
   */
  registerT5Gemma(t5gemmaDir: string, hfToken?: string): void {
    const client = new T5GemmaTTSClient({
      t5gemmaDir,
      hfToken,
      outputDir: this.config.outputDir,
    });
    this.registerProvider(client);
  }

  /**
   * Edge TTSを登録
   */
  registerEdgeTTS(voice?: string): void {
    const client = new EdgeTTSClient({
      voice,
      outputDir: this.config.outputDir,
    });
    this.registerProvider(client);
  }

  /**
   * 全プロバイダーを自動登録（利用可能なもののみ）
   */
  async autoRegisterProviders(options?: {
    t5gemmaDir?: string;
    hfToken?: string;
    edgeTTSVoice?: string;
  }): Promise<void> {
    // Edge TTS を試行
    const edgeClient = new EdgeTTSClient({
      voice: options?.edgeTTSVoice,
      outputDir: this.config.outputDir,
    });
    if (await edgeClient.healthCheck()) {
      this.registerProvider(edgeClient);
    }

    // T5Gemma-TTS を試行
    if (options?.t5gemmaDir) {
      const t5gemmaClient = new T5GemmaTTSClient({
        t5gemmaDir: options.t5gemmaDir,
        hfToken: options.hfToken,
        outputDir: this.config.outputDir,
      });
      if (await t5gemmaClient.healthCheck()) {
        this.registerProvider(t5gemmaClient);
      }
    }
  }

  /**
   * 利用可能なプロバイダー一覧
   */
  getAvailableProviders(): TTSProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * プロバイダーを取得
   */
  getProvider(providerId: TTSProviderId): TTSProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * 最適なプロバイダーを自動選択
   */
  selectProvider(commercialMode: boolean): TTSProvider | undefined {
    const providers = this.getAvailableProviders();

    if (commercialMode) {
      // 商用モード: 商用利用可能なプロバイダーのみ
      const commercial = providers.filter((p) => p.commercialAllowed);
      return commercial[0]; // Edge TTS優先
    } else {
      // 非商用モード: T5Gemma優先（高品質）
      const t5gemma = providers.find((p) => p.providerId === "t5gemma");
      if (t5gemma) return t5gemma;
      // フォールバック: Edge TTS
      return providers[0];
    }
  }

  /**
   * 音声を合成
   */
  async synthesize(request: TTSRequest): Promise<TTSResult> {
    const commercialMode = request.commercialMode ?? this.config.commercialModeDefault;

    // プロバイダー選択
    let provider: TTSProvider | undefined;

    if (request.options?.provider) {
      const requestedProvider = request.options.provider as TTSProviderId;
      provider = this.providers.get(requestedProvider);

      // 商用モードで非商用プロバイダーを指定した場合はエラー
      if (provider && commercialMode && !provider.commercialAllowed) {
        return {
          success: false,
          durationMs: 0,
          sampleRate: 44100,
          format: "wav",
          error: `${provider.name}は商用利用不可です。Edge TTSを使用するか、commercialMode: falseを指定してください。`,
        };
      }
    } else {
      provider = this.selectProvider(commercialMode ?? false);
    }

    if (!provider) {
      return {
        success: false,
        durationMs: 0,
        sampleRate: 44100,
        format: "wav",
        error: "利用可能なTTSプロバイダーがありません",
      };
    }

    // リクエスト調整
    const adjustedRequest: TTSRequest = {
      ...request,
      commercialMode,
      outputPath: request.outputPath || `${this.config.outputDir}/tts_${Date.now()}.wav`,
    };

    return provider.synthesize(adjustedRequest);
  }

  /**
   * 日本語テキストを前処理して音声合成
   */
  async synthesizeJapanese(
    text: string,
    options?: Omit<TTSRequest, "text"> & {
      preprocessOptions?: {
        convertNumbers?: boolean;
        convertAbbreviations?: boolean;
      };
    }
  ): Promise<TTSResult> {
    // 日本語前処理
    const processedText = preprocessJapaneseText(text, {
      convertNumbers: options?.preprocessOptions?.convertNumbers ?? true,
      convertAbbreviations: options?.preprocessOptions?.convertAbbreviations ?? true,
    });

    return this.synthesize({
      ...options,
      text: processedText,
    });
  }

  /**
   * 全プロバイダーのヘルスチェック
   */
  async healthCheck(): Promise<Map<TTSProviderId, boolean>> {
    const results = new Map<TTSProviderId, boolean>();

    for (const [id, provider] of this.providers) {
      const healthy = await provider.healthCheck();
      results.set(id, healthy);
    }

    return results;
  }

  /**
   * リソース解放
   */
  async dispose(): Promise<void> {
    for (const provider of this.providers.values()) {
      if (provider.dispose) {
        await provider.dispose();
      }
    }
    this.providers.clear();
  }
}

/**
 * TTSマネージャーを作成
 */
export function createTTSManager(
  config?: Partial<TTSManagerConfig>
): TTSManager {
  return new TTSManager(config);
}

/**
 * 簡易合成関数（自動設定）
 */
export async function quickSynthesize(
  text: string,
  options?: {
    commercialMode?: boolean;
    outputPath?: string;
    t5gemmaDir?: string;
  }
): Promise<TTSResult> {
  const manager = new TTSManager({
    outputDir: options?.outputPath ? undefined : "./output/tts",
    commercialModeDefault: options?.commercialMode ?? false,
  });

  await manager.autoRegisterProviders({
    t5gemmaDir: options?.t5gemmaDir,
  });

  const result = await manager.synthesize({
    text,
    commercialMode: options?.commercialMode,
    outputPath: options?.outputPath,
  });

  await manager.dispose();

  return result;
}
