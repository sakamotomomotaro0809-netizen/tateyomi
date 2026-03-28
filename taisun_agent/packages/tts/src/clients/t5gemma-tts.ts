/**
 * T5Gemma-TTS Client
 *
 * ローカル実行の高品質日本語TTS
 * モデル: Aratako/T5Gemma-TTS-2b-2b
 *
 * 注意: 非商用利用のみ (CC-BY-NC ライセンス)
 */

import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs/promises";
import type {
  TTSProvider,
  TTSRequest,
  TTSResult,
  T5GemmaConfig,
  T5GemmaOptions,
} from "../types.js";

/**
 * デフォルト設定
 */
export const DEFAULT_T5GEMMA_CONFIG: Omit<T5GemmaConfig, "t5gemmaDir"> = {
  providerId: "t5gemma",
  pythonPath: "python3",
  modelDir: "Aratako/T5Gemma-TTS-2b-2b",
  outputDir: "./output/tts",
  commercialAllowed: false,
  license: "CC-BY-NC-4.0",
};

/**
 * T5Gemma-TTS クライアント
 */
export class T5GemmaTTSClient implements TTSProvider {
  readonly providerId = "t5gemma" as const;
  readonly name = "T5Gemma-TTS";
  readonly commercialAllowed = false;
  readonly license = "CC-BY-NC-4.0 (非商用のみ)";

  private config: T5GemmaConfig;

  constructor(config: Partial<T5GemmaConfig> & { t5gemmaDir: string }) {
    this.config = {
      ...DEFAULT_T5GEMMA_CONFIG,
      ...config,
    } as T5GemmaConfig;
  }

  /**
   * T5Gemma-TTSが利用可能かチェック
   */
  async healthCheck(): Promise<boolean> {
    try {
      const venvPython = path.join(
        this.config.t5gemmaDir,
        "venv",
        "bin",
        "python"
      );
      await fs.access(venvPython);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 音声を合成
   */
  async synthesize(request: TTSRequest): Promise<TTSResult> {
    // 商用モードチェック
    if (request.commercialMode) {
      return {
        success: false,
        durationMs: 0,
        sampleRate: 44100,
        format: "wav",
        provider: this.providerId,
        error: "T5Gemma-TTSは非商用利用のみです。commercialMode: falseを指定するか、Edge TTSを使用してください。",
      };
    }

    const options = (request.options || {}) as T5GemmaOptions;
    const outputDir = request.outputPath
      ? path.dirname(request.outputPath)
      : path.join(this.config.outputDir!, `tts_${Date.now()}`);

    await fs.mkdir(outputDir, { recursive: true });

    const venvPython = path.join(
      this.config.t5gemmaDir,
      "venv",
      "bin",
      "python"
    );
    const scriptPath = path.join(
      this.config.t5gemmaDir,
      "inference_commandline_hf.py"
    );

    const args = [
      scriptPath,
      `--target_text=${request.text}`,
      `--model_dir=${this.config.modelDir}`,
      `--output_dir=${outputDir}`,
    ];

    // オプションパラメータ
    if (options.targetDuration) {
      args.push(`--target_duration=${options.targetDuration}`);
    }
    if (options.temperature) {
      args.push(`--temperature=${options.temperature}`);
    }
    if (options.topK) {
      args.push(`--top_k=${options.topK}`);
    }
    if (options.topP) {
      args.push(`--top_p=${options.topP}`);
    }
    if (options.seed) {
      args.push(`--seed=${options.seed}`);
    }
    if (options.referenceSpeech) {
      // 参照音声使用時は同意確認が必要
      if (!request.consentVerified) {
        return {
          success: false,
          durationMs: 0,
          sampleRate: 44100,
          format: "wav",
          provider: this.providerId,
          error: "参照音声使用時は consentVerified: true が必要です",
        };
      }
      args.push(`--reference_speech=${options.referenceSpeech}`);
    }
    if (options.referenceText) {
      args.push(`--reference_text=${options.referenceText}`);
    }

    const env = { ...process.env };
    if (this.config.hfToken) {
      env.HF_TOKEN = this.config.hfToken;
    }

    try {
      const result = await this.runProcess(venvPython, args, {
        cwd: this.config.t5gemmaDir,
        env,
      });

      if (!result.success) {
        return {
          success: false,
          durationMs: 0,
          sampleRate: 44100,
          format: "wav",
          provider: this.providerId,
          error: result.error,
        };
      }

      // 生成されたファイルを探す
      const files = await fs.readdir(outputDir);
      const wavFile = files.find((f) => f.endsWith(".wav"));

      if (!wavFile) {
        return {
          success: false,
          durationMs: 0,
          sampleRate: 44100,
          format: "wav",
          provider: this.providerId,
          error: "音声ファイルが生成されませんでした",
        };
      }

      const generatedPath = path.join(outputDir, wavFile);
      const audioData = await fs.readFile(generatedPath);

      // 指定パスにリネーム
      let finalPath = generatedPath;
      if (request.outputPath && generatedPath !== request.outputPath) {
        await fs.rename(generatedPath, request.outputPath);
        finalPath = request.outputPath;
      }

      const durationMs = this.getWavDuration(audioData);

      return {
        success: true,
        audioData,
        outputPath: finalPath,
        durationMs,
        sampleRate: 44100,
        format: "wav",
        provider: this.providerId,
      };
    } catch (error) {
      return {
        success: false,
        durationMs: 0,
        sampleRate: 44100,
        format: "wav",
        provider: this.providerId,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Pythonプロセスを実行
   */
  private runProcess(
    command: string,
    args: string[],
    options: { cwd: string; env: NodeJS.ProcessEnv }
  ): Promise<{ success: boolean; output: string; error?: string }> {
    return new Promise((resolve) => {
      const proc = spawn(command, args, {
        cwd: options.cwd,
        env: options.env,
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
          error: err.message,
        });
      });
    });
  }

  /**
   * WAVファイルの長さを取得（ミリ秒）
   */
  private getWavDuration(buffer: Buffer): number {
    if (buffer.length < 44) {
      return 0;
    }

    const byteRate = buffer.readUInt32LE(28);

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

    // フォールバック
    return Math.round(((buffer.length - 44) / byteRate) * 1000);
  }
}

/**
 * T5Gemma-TTS クライアントを作成
 */
export function createT5GemmaTTSClient(
  config: Partial<T5GemmaConfig> & { t5gemmaDir: string }
): T5GemmaTTSClient {
  return new T5GemmaTTSClient(config);
}
