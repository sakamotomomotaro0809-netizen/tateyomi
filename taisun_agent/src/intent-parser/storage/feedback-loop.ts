/**
 * Feedback Loop
 *
 * フィードバック収集・再学習トリガー
 * ユーザーのブロック承認/拒否結果を学習データに変換
 */

import { RiskLevel, FeatureVector } from '../types';
import { getExecutionHistory, ExecutionHistory } from './execution-history';
import { getMLRiskClassifier, MLRiskClassifier } from '../classifiers/ml-risk-classifier';

const RETRAIN_THRESHOLD = 50;

interface FeedbackEntry {
  timestamp: number;
  toolName: string;
  intent: string;
  predictedRisk: RiskLevel;
  actualOutcome: 'approved' | 'blocked' | 'error';
  features: FeatureVector;
  correctedRisk?: RiskLevel;
}

export class FeedbackLoop {
  private pendingFeedback: FeedbackEntry[] = [];
  private readonly history: ExecutionHistory;
  private readonly classifier: MLRiskClassifier;
  private feedbackCount = 0;

  constructor(history?: ExecutionHistory, classifier?: MLRiskClassifier) {
    this.history = history || getExecutionHistory();
    this.classifier = classifier || getMLRiskClassifier();
  }

  /**
   * フィードバックを記録
   */
  recordFeedback(entry: FeedbackEntry): void {
    this.pendingFeedback.push(entry);
    this.feedbackCount++;

    const correctedRisk = this.deriveRiskFromOutcome(entry);

    this.history.record({
      timestamp: entry.timestamp,
      toolName: entry.toolName,
      intent: entry.intent,
      riskLevel: correctedRisk,
      wasBlocked: entry.actualOutcome === 'blocked',
      wasApproved: entry.actualOutcome === 'approved',
      features: entry.features,
    });

    if (this.feedbackCount >= RETRAIN_THRESHOLD) {
      this.triggerRetrain();
    }
  }

  /**
   * 実行結果からリスクレベルを補正
   */
  private deriveRiskFromOutcome(entry: FeedbackEntry): RiskLevel {
    if (entry.correctedRisk) {
      return entry.correctedRisk;
    }

    if (entry.actualOutcome === 'approved' && entry.predictedRisk === 'high') {
      return 'medium';
    }

    if (entry.actualOutcome === 'blocked' && entry.predictedRisk === 'low') {
      return 'medium';
    }

    return entry.predictedRisk;
  }

  /**
   * 再学習をトリガー
   */
  triggerRetrain(): void {
    this.history.flush();
    this.classifier.retrain();
    this.feedbackCount = 0;
    this.pendingFeedback = [];
  }

  /**
   * False Block Rate を計算
   */
  computeFalseBlockRate(recentCount = 200): number {
    const recent = this.history.loadRecent(recentCount);
    if (recent.length === 0) return 0;

    const falseBlocks = recent.filter(
      (r) => r.wasBlocked && r.wasApproved
    ).length;

    return falseBlocks / recent.length;
  }

  /**
   * 保留中のフィードバック数
   */
  get pendingCount(): number {
    return this.pendingFeedback.length;
  }

  /**
   * 総フィードバック数
   */
  get totalFeedbackCount(): number {
    return this.feedbackCount;
  }
}

let feedbackInstance: FeedbackLoop | null = null;

export function getFeedbackLoop(): FeedbackLoop {
  if (!feedbackInstance) {
    feedbackInstance = new FeedbackLoop();
  }
  return feedbackInstance;
}

export function resetFeedbackLoop(): void {
  feedbackInstance = null;
}
