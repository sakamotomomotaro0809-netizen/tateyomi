#!/usr/bin/env node
/**
 * @taisun/tts CLI
 *
 * 日本語TTS統合コマンドラインツール
 */

import { Command } from "commander";
import chalk from "chalk";
import * as fs from "fs/promises";
import * as path from "path";
import { TTSManager } from "../manager/tts-manager.js";
import { EdgeTTSClient, JAPANESE_VOICES } from "../clients/edge-tts.js";
import { T5GemmaTTSClient } from "../clients/t5gemma-tts.js";
import {
  preprocessJapaneseText,
  segmentText,
  EMOTION_PRESETS,
} from "../skills/japanese-reading.js";
import type { EdgeTTSVoice } from "../types.js";

const program = new Command();

program
  .name("taisun-tts")
  .description("日本語TTS統合ツール - T5Gemma-TTS + Edge TTS")
  .version("1.0.0");

/**
 * synthesize コマンド - 音声合成
 */
program
  .command("synthesize")
  .alias("synth")
  .description("テキストから音声を合成")
  .requiredOption("-t, --text <text>", "合成するテキスト")
  .option("-o, --output <path>", "出力ファイルパス", "./output.wav")
  .option("-p, --provider <provider>", "プロバイダー (edge-tts, t5gemma, auto)", "auto")
  .option("-v, --voice <voice>", "Edge TTS音声ID", "ja-JP-NanamiNeural")
  .option("-c, --commercial", "商用モード（Edge TTSのみ使用）")
  .option("--t5gemma-dir <dir>", "T5Gemma-TTSディレクトリ")
  .option("--preprocess", "日本語前処理を適用", true)
  .action(async (options) => {
    console.log(chalk.blue("🎤 音声合成を開始..."));

    const manager = new TTSManager({
      outputDir: path.dirname(options.output),
      commercialModeDefault: options.commercial,
    });

    // プロバイダー登録
    if (options.provider === "auto" || options.provider === "edge-tts") {
      manager.registerEdgeTTS(options.voice);
    }

    if (
      (options.provider === "auto" || options.provider === "t5gemma") &&
      options.t5gemmaDir
    ) {
      manager.registerT5Gemma(options.t5gemmaDir);
    }

    // ヘルスチェック
    const health = await manager.healthCheck();
    const available = Array.from(health.entries())
      .filter(([_, ok]) => ok)
      .map(([id]) => id);

    if (available.length === 0) {
      console.error(chalk.red("❌ 利用可能なTTSプロバイダーがありません"));
      process.exit(1);
    }

    console.log(chalk.gray(`利用可能: ${available.join(", ")}`));

    // テキスト前処理
    let text = options.text;
    if (options.preprocess) {
      text = preprocessJapaneseText(text);
      console.log(chalk.gray(`前処理後: ${text}`));
    }

    // 合成実行
    const result = await manager.synthesize({
      text,
      outputPath: options.output,
      commercialMode: options.commercial,
      options: {
        provider: options.provider === "auto" ? undefined : options.provider,
        voice: options.voice as EdgeTTSVoice,
      },
    });

    if (result.success) {
      console.log(chalk.green(`✅ 合成完了: ${result.outputPath}`));
      console.log(chalk.gray(`   プロバイダー: ${result.provider}`));
      console.log(chalk.gray(`   長さ: ${(result.durationMs / 1000).toFixed(2)}秒`));
    } else {
      console.error(chalk.red(`❌ 合成失敗: ${result.error}`));
      process.exit(1);
    }

    await manager.dispose();
  });

/**
 * preprocess コマンド - 日本語前処理
 */
program
  .command("preprocess")
  .description("日本語テキストをTTS用に前処理")
  .requiredOption("-t, --text <text>", "処理するテキスト")
  .option("-f, --file <path>", "テキストファイルから読み込み")
  .action(async (options) => {
    let text = options.text;

    if (options.file) {
      text = await fs.readFile(options.file, "utf-8");
    }

    const processed = preprocessJapaneseText(text);

    console.log(chalk.blue("📝 前処理結果:"));
    console.log(chalk.gray("---"));
    console.log(processed);
    console.log(chalk.gray("---"));
  });

/**
 * segment コマンド - テキスト分割
 */
program
  .command("segment")
  .description("テキストを適切な長さのセグメントに分割")
  .requiredOption("-t, --text <text>", "分割するテキスト")
  .option("-f, --file <path>", "テキストファイルから読み込み")
  .option("-s, --max-seconds <seconds>", "最大秒数", "30")
  .option("-m, --mora-per-second <mora>", "1秒あたりのモーラ数", "6")
  .action(async (options) => {
    let text = options.text;

    if (options.file) {
      text = await fs.readFile(options.file, "utf-8");
    }

    const segments = segmentText(text, {
      maxSeconds: parseInt(options.maxSeconds),
      moraPerSecond: parseFloat(options.moraPerSecond),
    });

    console.log(chalk.blue(`📄 ${segments.length}セグメントに分割:`));
    segments.forEach((seg, i) => {
      console.log(chalk.gray(`[${i + 1}] ${seg.substring(0, 50)}...`));
    });
  });

/**
 * voices コマンド - 音声一覧
 */
program
  .command("voices")
  .description("利用可能な日本語音声を表示")
  .option("--provider <provider>", "プロバイダー (edge-tts)", "edge-tts")
  .action(async (options) => {
    console.log(chalk.blue("🎙️ 日本語音声一覧:"));
    console.log();

    if (options.provider === "edge-tts") {
      for (const [id, info] of Object.entries(JAPANESE_VOICES)) {
        console.log(chalk.cyan(`  ${id}`));
        console.log(chalk.gray(`    名前: ${info.name} (${info.gender})`));
        console.log(chalk.gray(`    スタイル: ${info.style}`));
        console.log();
      }
    }
  });

/**
 * presets コマンド - 感情プリセット一覧
 */
program
  .command("presets")
  .description("セールスコピー用の感情プリセットを表示")
  .action(() => {
    console.log(chalk.blue("🎭 感情プリセット一覧:"));
    console.log();

    for (const [key, preset] of Object.entries(EMOTION_PRESETS)) {
      console.log(chalk.cyan(`  ${key}`));
      console.log(chalk.gray(`    ${preset.description}`));
      console.log(
        chalk.gray(
          `    temperature: ${preset.temperature}, topK: ${preset.topK}, topP: ${preset.topP}`
        )
      );
      console.log();
    }
  });

/**
 * health コマンド - ヘルスチェック
 */
program
  .command("health")
  .description("TTSプロバイダーの状態をチェック")
  .option("--t5gemma-dir <dir>", "T5Gemma-TTSディレクトリ")
  .action(async (options) => {
    console.log(chalk.blue("🔍 ヘルスチェック..."));
    console.log();

    // Edge TTS
    const edgeClient = new EdgeTTSClient();
    const edgeOk = await edgeClient.healthCheck();
    console.log(
      edgeOk
        ? chalk.green("✅ Edge TTS: OK")
        : chalk.red("❌ Edge TTS: 利用不可 (pip install edge-tts)")
    );

    // T5Gemma-TTS
    if (options.t5gemmaDir) {
      const t5gemmaClient = new T5GemmaTTSClient({
        t5gemmaDir: options.t5gemmaDir,
      });
      const t5gemmaOk = await t5gemmaClient.healthCheck();
      console.log(
        t5gemmaOk
          ? chalk.green("✅ T5Gemma-TTS: OK")
          : chalk.red("❌ T5Gemma-TTS: 利用不可 (venv未設定)")
      );
    } else {
      console.log(chalk.gray("⚪ T5Gemma-TTS: --t5gemma-dir 未指定"));
    }
  });

/**
 * batch コマンド - バッチ処理
 */
program
  .command("batch")
  .description("複数のテキストをバッチ処理で音声合成")
  .requiredOption("-i, --input <file>", "入力JSONファイル")
  .option("-o, --output-dir <dir>", "出力ディレクトリ", "./output")
  .option("-p, --provider <provider>", "プロバイダー", "edge-tts")
  .option("-v, --voice <voice>", "Edge TTS音声ID", "ja-JP-NanamiNeural")
  .option("-c, --commercial", "商用モード")
  .action(async (options) => {
    console.log(chalk.blue("📦 バッチ処理を開始..."));

    const inputData = JSON.parse(await fs.readFile(options.input, "utf-8"));

    if (!Array.isArray(inputData)) {
      console.error(chalk.red("入力ファイルは配列形式である必要があります"));
      process.exit(1);
    }

    await fs.mkdir(options.outputDir, { recursive: true });

    const manager = new TTSManager({
      outputDir: options.outputDir,
      commercialModeDefault: options.commercial,
    });
    manager.registerEdgeTTS(options.voice);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < inputData.length; i++) {
      const item = inputData[i];
      const text = typeof item === "string" ? item : item.text;
      const filename = item.filename || `segment_${i.toString().padStart(4, "0")}.wav`;

      const outputPath = path.join(options.outputDir, filename);

      const result = await manager.synthesize({
        text: preprocessJapaneseText(text),
        outputPath,
        commercialMode: options.commercial,
      });

      if (result.success) {
        console.log(chalk.green(`✅ [${i + 1}/${inputData.length}] ${filename}`));
        successCount++;
      } else {
        console.log(chalk.red(`❌ [${i + 1}/${inputData.length}] ${result.error}`));
        failCount++;
      }
    }

    console.log();
    console.log(chalk.blue(`完了: ${successCount}成功, ${failCount}失敗`));

    await manager.dispose();
  });

program.parse();
