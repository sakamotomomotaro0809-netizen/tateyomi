/**
 * ML Risk Classifier - ハイブリッドML分類器
 *
 * 予測フロー:
 *   Bayes (>=70%信頼度) → 採用 [90%のケース]
 *   Tree  (>=60%信頼度) → 採用 [9%のケース]
 *   ルールベース        → フォールバック [1%]
 */

import { RiskLevel, MLPrediction, FeatureVector, ExecutionRecord, IntentContext, IntentType } from '../types';
import { NaiveBayesClassifier, getNaiveBayes, resetNaiveBayes } from './naive-bayes';
import { DecisionTreeClassifier, getDecisionTree, resetDecisionTree } from './decision-tree';
import { FeatureExtractor, getFeatureExtractor } from './feature-extractor';
import { ExecutionHistory, getExecutionHistory } from '../storage/execution-history';

const BAYES_CONFIDENCE_THRESHOLD = 70;
const TREE_CONFIDENCE_THRESHOLD = 60;
const MIN_TRAINING_SAMPLES = 50;
const RETRAIN_INTERVAL_RECORDS = 200;

export class MLRiskClassifier {
  private bayes: NaiveBayesClassifier;
  private tree: DecisionTreeClassifier;
  private extractor: FeatureExtractor;
  private history: ExecutionHistory;
  private lastTrainedAt = 0;
  private enabled: boolean;

  constructor(options?: {
    modelDir?: string;
    dataDir?: string;
    enabled?: boolean;
  }) {
    this.bayes = getNaiveBayes(options?.modelDir);
    this.tree = getDecisionTree();
    this.extractor = getFeatureExtractor();
    this.history = getExecutionHistory(options?.dataDir);
    this.enabled = options?.enabled ?? (process.env.TAISUN_USE_ML_CLASSIFIER === 'true');
  }

  /**
   * ML予測を実行
   */
  predict(
    toolName: string,
    toolInput: Record<string, unknown>,
    context: IntentContext,
    intentConfidence: number,
    ruleBasedRisk: RiskLevel
  ): MLPrediction {
    const startTime = performance.now();

    if (!this.enabled) {
      return {
        riskLevel: ruleBasedRisk,
        confidence: 0,
        method: 'rule',
        processingTimeMs: performance.now() - startTime,
      };
    }

    try {
      const historyStats = this.computeHistoryStats();
      const features = this.extractor.extract(
        toolName, toolInput, context, intentConfidence, historyStats
      );
      const featureArray = this.extractor.toArray(features);

      // Step 1: Bayes
      if (this.bayes.isTrained) {
        const bayesPrediction = this.bayes.predict(featureArray);
        if (bayesPrediction.confidence >= BAYES_CONFIDENCE_THRESHOLD) {
          return {
            riskLevel: bayesPrediction.riskLevel,
            confidence: bayesPrediction.confidence,
            method: 'bayes',
            processingTimeMs: performance.now() - startTime,
          };
        }

        // Step 2: Decision Tree (Bayes不確実時)
        if (this.tree.isTrained) {
          const treePrediction = this.tree.predict(featureArray);
          if (treePrediction.confidence >= TREE_CONFIDENCE_THRESHOLD) {
            return {
              riskLevel: treePrediction.riskLevel,
              confidence: treePrediction.confidence,
              method: 'tree',
              processingTimeMs: performance.now() - startTime,
            };
          }
        }
      }

      // Step 3: ルールベースフォールバック
      return {
        riskLevel: ruleBasedRisk,
        confidence: 0,
        method: 'rule',
        processingTimeMs: performance.now() - startTime,
      };
    } catch {
      return {
        riskLevel: ruleBasedRisk,
        confidence: 0,
        method: 'rule',
        processingTimeMs: performance.now() - startTime,
      };
    }
  }

  /**
   * 実行結果を記録
   */
  recordExecution(
    toolName: string,
    intent: string,
    riskLevel: RiskLevel,
    wasBlocked: boolean,
    wasApproved: boolean,
    features: FeatureVector
  ): void {
    const record: ExecutionRecord = {
      timestamp: Date.now(),
      toolName,
      intent,
      riskLevel,
      wasBlocked,
      wasApproved,
      features,
    };

    this.history.record(record);
    this.maybeRetrain();
  }

  /**
   * 再学習が必要か判定し、必要なら実行
   */
  private maybeRetrain(): void {
    const currentCount = this.history.count();

    if (currentCount < MIN_TRAINING_SAMPLES) return;
    if (currentCount - this.lastTrainedAt < RETRAIN_INTERVAL_RECORDS) return;

    this.retrain();
  }

  /**
   * モデルを再学習
   */
  retrain(): void {
    const records = this.history.loadAll();
    if (records.length < MIN_TRAINING_SAMPLES) return;

    this.bayes.train(records);
    this.bayes.save();

    this.tree.train(records);

    this.lastTrainedAt = records.length;
  }

  /**
   * 保存済みモデルを読み込み
   */
  loadModel(): boolean {
    return this.bayes.load();
  }

  /**
   * ML分類器が有効かどうか
   */
  get isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * ML分類器が学習済みかどうか
   */
  get isTrained(): boolean {
    return this.bayes.isTrained;
  }

  /**
   * 訓練サンプル数
   */
  get trainingSamples(): number {
    return this.bayes.sampleCount;
  }

  private computeHistoryStats(): { approvalRate: number; errorRate: number } {
    const recent = this.history.loadRecent(100);
    if (recent.length === 0) {
      return { approvalRate: 0.8, errorRate: 0.05 };
    }

    const approved = recent.filter((r) => r.wasApproved).length;
    const blocked = recent.filter((r) => r.wasBlocked).length;

    return {
      approvalRate: approved / recent.length,
      errorRate: blocked / recent.length,
    };
  }
}

let classifierInstance: MLRiskClassifier | null = null;

export function getMLRiskClassifier(options?: {
  modelDir?: string;
  dataDir?: string;
  enabled?: boolean;
}): MLRiskClassifier {
  if (!classifierInstance) {
    classifierInstance = new MLRiskClassifier(options);
  }
  return classifierInstance;
}

export function resetMLRiskClassifier(): void {
  resetNaiveBayes();
  resetDecisionTree();
  classifierInstance = null;
}
