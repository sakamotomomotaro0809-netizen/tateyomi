/**
 * Edge TTS Client
 *
 * Microsoft Edge TTSを使用した高品質日本語音声合成
 * 商用利用可能・無料
 */

import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs/promises";
import type {
  TTSProvider,
  TTSRequest,
  TTSResult,
  EdgeTTSConfig,
  EdgeTTSOptions,
  EdgeTTSVoice,
} from "../types.js";

/**
 * 日本語音声一覧
 */
export const JAPANESE_VOICES: Record<EdgeTTSVoice, { name: string; gender: string; style: string }> = {
  "ja-JP-NanamiNeural": { name: "Nanami", gender: "female", style: "明るい・フレンドリー" },
  "ja-JP-KeitaNeural": { name: "Keita", gender: "male", style: "落ち着き・ビジネス" },
  "ja-JP-AoiNeural": { name: "Aoi", gender: "female", style: "若い・元気" },
  "ja-JP-DaichiNeural": { name: "Daichi", gender: "male", style: "フォーマル・ニュース" },
  "ja-JP-MayuNeural": { name: "Mayu", gender: "female", style: "温かい・やさしい" },
  "ja-JP-NaokiNeural": { name: "Naoki", gender: "male", style: "ニュース・報道" },
  "ja-JP-ShioriNeural": { name: "Shiori", gender: "female", style: "自然・会話" },
};

/**
 * デフォルト設定
 */
export const DEFAULT_EDGE_TTS_CONFIG: EdgeTTSConfig = {
  providerId: "edge-tts",
  voice: "ja-JP-NanamiNeural",
  outputDir: "./output/tts",
  commercialAllowed: true,
  license: "Microsoft Services Agreement",
};

/**
 * Edge TTS クライアント
 */
export class EdgeTTSClient implements TTSProvider {
  readonly providerId = "edge-tts" as const;
  readonly name = "Microsoft Edge TTS";
  readonly commercialAllowed = true;
  readonly license = "Microsoft Services Agreement (商用利用可)";

  private config: EdgeTTSConfig;

  constructor(config?: Partial<EdgeTTSConfig>) {
    this.config = {
      ...DEFAULT_EDGE_TTS_CONFIG,
      ...config,
    };
  }

  /**
   * Edge TTSが利用可能かチェック
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.runCommand("edge-tts", ["--list-voices"]);
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * 音声を合成
   */
  async synthesize(request: TTSRequest): Promise<TTSResult> {
    const options = (request.options || {}) as EdgeTTSOptions;
    const voice = options.voice || this.config.voice || "ja-JP-NanamiNeural";
    const format = request.format || "wav";

    // 出力パス決定
    const outputDir = request.outputPath
      ? path.dirname(request.outputPath)
      : this.config.outputDir!;

    await fs.mkdir(outputDir, { recursive: true });

    const outputPath = request.outputPath ||
      path.join(outputDir, `edge_tts_${Date.now()}.${format === "wav" ? "wav" : "mp3"}`);

    // edge-tts コマンド構築
    const args = [
      "--voice", voice,
      "--text", request.text,
      "--write-media", outputPath,
    ];

    // オプション追加
    if (options.rate) {
      args.push("--rate", options.rate);
    }
    if (options.volume) {
      args.push("--volume", options.volume);
    }
    if (options.pitch) {
      args.push("--pitch", options.pitch);
    }

    try {
      const result = await this.runCommand("edge-tts", args);

      if (!result.success) {
        return {
          success: false,
          durationMs: 0,
          sampleRate: 24000,
          format: format === "wav" ? "wav" : "mp3",
          provider: this.providerId,
          error: result.error,
        };
      }

      // ファイル存在確認
      try {
        await fs.access(outputPath);
      } catch {
        return {
          success: false,
          durationMs: 0,
          sampleRate: 24000,
          format: format === "wav" ? "wav" : "mp3",
          provider: this.providerId,
          error: "音声ファイルが生成されませんでした",
        };
      }

      const audioData = await fs.readFile(outputPath);
      const durationMs = this.estimateDuration(audioData, format);

      return {
        success: true,
        audioData,
        outputPath,
        durationMs,
        sampleRate: 24000,
        format: format === "wav" ? "wav" : "mp3",
        provider: this.providerId,
      };
    } catch (error) {
      return {
        success: false,
        durationMs: 0,
        sampleRate: 24000,
        format: format === "wav" ? "wav" : "mp3",
        provider: this.providerId,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 利用可能な音声一覧を取得
   */
  async listVoices(): Promise<string[]> {
    const result = await this.runCommand("edge-tts", ["--list-voices"]);
    if (!result.success) {
      return [];
    }

    // 日本語音声のみ抽出
    const lines = result.output.split("\n");
    const jaVoices = lines
      .filter((line) => line.includes("ja-JP"))
      .map((line) => {
        const match = line.match(/Name: ([\w-]+)/);
        return match ? match[1] : null;
      })
      .filter((v): v is string => v !== null);

    return jaVoices;
  }

  /**
   * コマンドを実行
   */
  private runCommand(
    command: string,
    args: string[]
  ): Promise<{ success: boolean; output: string; error?: string }> {
    return new Promise((resolve) => {
      const proc = spawn(command, args, {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve({ success: true, output: stdout });
        } else {
          resolve({
            success: false,
            output: stdout,
            error: stderr || `Process exited with code ${code}`,
          });
        }
      });

      proc.on("error", (err) => {
        resolve({
          success: false,
          output: "",
          error: `edge-tts が見つかりません。pip install edge-tts でインストールしてください。: ${err.message}`,
        });
      });
    });
  }

  /**
   * 音声の長さを推定
   */
  private estimateDuration(buffer: Buffer, format: string): number {
    if (format === "wav" && buffer.length >= 44) {
      const byteRate = buffer.readUInt32LE(28);
      if (byteRate > 0) {
        // 'data'チャンクを探す
        let dataPos = 12;
        while (dataPos < buffer.length - 8) {
          const chunkId = buffer.toString("ascii", dataPos, dataPos + 4);
          const chunkSize = buffer.readUInt32LE(dataPos + 4);

          if (chunkId === "data") {
            return Math.round((chunkSize / byteRate) * 1000);
          }
          dataPos += 8 + chunkSize;
        }
      }
    }

    // MP3の場合は概算（ビットレート128kbps想定）
    if (format === "mp3") {
      return Math.round((buffer.length / 16000) * 1000);
    }

    return 0;
  }
}

/**
 * Edge TTS クライアントを作成
 */
export function createEdgeTTSClient(
  config?: Partial<EdgeTTSConfig>
): EdgeTTSClient {
  return new EdgeTTSClient(config);
}

/**
 * 日本語音声情報を取得
 */
export function getJapaneseVoiceInfo(voice: EdgeTTSVoice) {
  return JAPANESE_VOICES[voice];
}
