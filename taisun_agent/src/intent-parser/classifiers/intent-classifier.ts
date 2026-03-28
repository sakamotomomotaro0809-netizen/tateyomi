/**
 * Intent Classifier
 *
 * パターンマッチング、エンティティ、コンテキストから Intent を分類
 */

import { IntentType, IntentResult, IntentParserConfig, DEFAULT_CONFIG } from '../types';
import { getPatternClassifier } from '../core/pattern-classifier';
import { getEntityExtractor } from '../core/entity-extractor';
import { getContextResolver } from '../engines/context-resolver';
import { getRiskEvaluator } from '../engines/risk-evaluator';
import { getConfidenceScorer } from '../engines/confidence-scorer';
import { ALL_PATTERNS } from './patterns';

/**
 * Intent Classifier クラス
 */
export class IntentClassifier {
  private config: IntentParserConfig;
  private patternClassifier = getPatternClassifier();
  private entityExtractor = getEntityExtractor();
  private contextResolver = getContextResolver();
  private riskEvaluator = getRiskEvaluator();
  private confidenceScorer = getConfidenceScorer();

  constructor(config: Partial<IntentParserConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * テキストから Intent を分類
   *
   * @param text - 入力テキスト
   * @returns Intent 分析結果
   */
  async classify(text: string): Promise<IntentResult> {
    const startTime = Date.now();

    try {
      // 1. パターンマッチング
      const patternMatches = this.patternClassifier.classify(text);

      // 2. エンティティ抽出
      const entities = await this.entityExtractor.extractAll(text);

      // 3. ファイルパス抽出
      const filePaths = this.entityExtractor.extractFilePaths(text);
      const existingFiles = filePaths.map((e) => e.value);

      // 4. コンテキスト解決
      const context = await this.contextResolver.resolve(text, existingFiles);

      // 5. Intent 決定
      const intent = this.determineIntent(patternMatches);

      // 6. 信頼度スコアリング
      const confidence = this.confidenceScorer.score(patternMatches, context);

      // 7. リスク評価
      const riskLevel = this.riskEvaluator.evaluate(intent, context, confidence);

      // 8. スキップ可能 Layer 決定
      const shouldSkipLayers = this.riskEvaluator.determineSkippableLayers(riskLevel, intent, context);

      // 9. 推論理由生成
      const reasoning = this.generateReasoning(intent, patternMatches, context, confidence);

      const processingTime = Date.now() - startTime;

      // パフォーマンス警告
      if (processingTime > this.config.maxProcessingTimeMs) {
        console.warn(`Intent classification took ${processingTime}ms (threshold: ${this.config.maxProcessingTimeMs}ms)`);
      }

      return {
        intent,
        confidence,
        entities,
        context,
        riskLevel,
        shouldSkipLayers,
        reasoning,
      };
    } catch (error) {
      console.error('Intent classification error:', error);

      // エラー時のフォールバック
      return {
        intent: IntentType.UNKNOWN,
        confidence: 0,
        entities: [],
        context: {
          sessionContinuation: false,
          existingFilesDetected: [],
          deviationDetected: false,
          workflowReuseDetected: false,
          baselineFileModification: false,
        },
        riskLevel: 'high',
        shouldSkipLayers: [],
        reasoning: `分類エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
      };
    }
  }

  /**
   * Intent を決定
   *
   * @param patternMatches - パターンマッチ結果配列
   * @returns Intent タイプ
   */
  private determineIntent(patternMatches: any[]): IntentType {
    if (patternMatches.length === 0) {
      return IntentType.UNKNOWN;
    }

    // 最高信頼度のパターンに対応する Intent を返す
    const bestMatch = patternMatches[0];
    const pattern = ALL_PATTERNS.find((p) => p.name === bestMatch.pattern);

    return pattern?.intent || IntentType.UNKNOWN;
  }

  /**
   * 推論理由を生成
   *
   * @param intent - Intent タイプ
   * @param patternMatches - パターンマッチ結果配列
   * @param context - コンテキスト情報
   * @param confidence - 信頼度スコア
   * @returns 推論理由
   */
  private generateReasoning(intent: IntentType, patternMatches: any[], context: any, confidence: number): string {
    const reasons: string[] = [];

    // パターンマッチ情報
    if (patternMatches.length > 0) {
      const primaryPattern = patternMatches[0].pattern;
      reasons.push(`パターン「${primaryPattern}」が検出されました（信頼度: ${patternMatches[0].confidence}）`);
    }

    // コンテキスト情報
    if (context.sessionContinuation) {
      reasons.push('セッション継続が検出されました');
    }

    if (context.workflowReuseDetected) {
      reasons.push('ワークフロー再利用が検出されました');
    }

    if (context.skillRequested) {
      reasons.push(`スキル「${context.skillRequested}」が要求されました`);
    }

    if (context.existingFilesDetected.length > 0) {
      reasons.push(`既存ファイル ${context.existingFilesDetected.length} 件が検出されました`);
    }

    if (context.deviationDetected) {
      reasons.push('指示にない行動の提案が検出されました');
    }

    if (context.baselineFileModification) {
      reasons.push('ベースラインファイルの改変が検出されました');
    }

    // Intent と信頼度
    reasons.push(`Intent: ${intent}（信頼度: ${confidence}）`);

    return reasons.join('; ');
  }

  /**
   * バッチ分類
   *
   * @param texts - 入力テキスト配列
   * @returns Intent 分析結果配列
   */
  async classifyBatch(texts: string[]): Promise<IntentResult[]> {
    return Promise.all(texts.map((text) => this.classify(text)));
  }

  /**
   * 設定を更新
   *
   * @param config - 更新する設定
   */
  updateConfig(config: Partial<IntentParserConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 現在の設定を取得
   *
   * @returns 現在の設定
   */
  getConfig(): IntentParserConfig {
    return { ...this.config };
  }
}

/**
 * シングルトンインスタンス
 */
let classifierInstance: IntentClassifier | null = null;

/**
 * Intent Classifier インスタンスを取得
 *
 * @returns IntentClassifier インスタンス
 */
export function getIntentClassifier(): IntentClassifier {
  if (!classifierInstance) {
    classifierInstance = new IntentClassifier();
  }
  return classifierInstance;
}
