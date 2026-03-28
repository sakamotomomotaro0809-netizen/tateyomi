/**
 * Intent Parser - Main Entry Point
 *
 * ユーザーの自然言語コマンドから意図を抽出するシステム
 */

// Types
export * from './types';

// Core
export { Tokenizer, getTokenizer } from './core/tokenizer';
export { PatternClassifier, getPatternClassifier } from './core/pattern-classifier';
export { EntityExtractor, getEntityExtractor } from './core/entity-extractor';

// Engines
export { ContextResolver, getContextResolver } from './engines/context-resolver';
export { RiskEvaluator, getRiskEvaluator } from './engines/risk-evaluator';
export { ConfidenceScorer, getConfidenceScorer } from './engines/confidence-scorer';

// Classifiers
export { ALL_PATTERNS, PATTERN_COUNT } from './classifiers/patterns';
export { IntentClassifier, getIntentClassifier } from './classifiers/intent-classifier';
export { FeatureExtractor, getFeatureExtractor } from './classifiers/feature-extractor';
export { NaiveBayesClassifier, getNaiveBayes, resetNaiveBayes } from './classifiers/naive-bayes';
export { DecisionTreeClassifier, getDecisionTree, resetDecisionTree } from './classifiers/decision-tree';
export { MLRiskClassifier, getMLRiskClassifier, resetMLRiskClassifier } from './classifiers/ml-risk-classifier';

// Storage
export { ExecutionHistory, getExecutionHistory, resetExecutionHistory } from './storage/execution-history';
export { FeedbackLoop, getFeedbackLoop, resetFeedbackLoop } from './storage/feedback-loop';

// Integrations
export { HookIntegration, getHookIntegration } from './integrations/hook-integration';

// Main API
import { IntentClassifier } from './classifiers/intent-classifier';
import { IntentParserConfig, IntentResult } from './types';

/**
 * Intent Parser クラス（メイン API）
 */
export class IntentParser {
  private classifier: IntentClassifier;

  constructor(config?: Partial<IntentParserConfig>) {
    this.classifier = new IntentClassifier(config);
  }

  /**
   * テキストから Intent を解析
   *
   * @param text - 入力テキスト
   * @returns Intent 分析結果
   */
  async parse(text: string): Promise<IntentResult> {
    return this.classifier.classify(text);
  }

  /**
   * バッチ解析
   *
   * @param texts - 入力テキスト配列
   * @returns Intent 分析結果配列
   */
  async parseBatch(texts: string[]): Promise<IntentResult[]> {
    return this.classifier.classifyBatch(texts);
  }
}
