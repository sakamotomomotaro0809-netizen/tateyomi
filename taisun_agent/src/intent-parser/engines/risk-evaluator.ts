/**
 * Risk Evaluator
 *
 * Intent のリスクレベルを評価
 */

import { IntentType, RiskLevel, IntentContext } from '../types';

/**
 * Risk Evaluator クラス
 */
export class RiskEvaluator {
  /**
   * Intent タイプに基づくベースリスク
   */
  private readonly baseRiskLevels: Map<IntentType, RiskLevel> = new Map([
    // High Risk
    [IntentType.FILE_DELETE, 'high'],
    [IntentType.PROJECT_DEPLOY, 'high'],
    [IntentType.DEVIATION_REQUEST, 'high'],

    // Medium Risk
    [IntentType.FILE_CREATE, 'medium'],
    [IntentType.FILE_EDIT, 'medium'],
    [IntentType.CODE_REFACTOR, 'medium'],
    [IntentType.CODE_IMPLEMENTATION, 'medium'],
    [IntentType.PROJECT_BUILD, 'medium'],

    // Low Risk
    [IntentType.FILE_READ, 'low'],
    [IntentType.CODE_REVIEW, 'low'],
    [IntentType.ANALYSIS_CODE, 'low'],
    [IntentType.ANALYSIS_PERFORMANCE, 'low'],
    [IntentType.ANALYSIS_SECURITY, 'low'],
    [IntentType.SEARCH_CODE, 'low'],
    [IntentType.SEARCH_FILE, 'low'],
    [IntentType.QUESTION, 'low'],
    [IntentType.CONFIRMATION, 'low'],
  ]);

  /**
   * リスクレベルを評価
   *
   * @param intent - Intent タイプ
   * @param context - コンテキスト情報
   * @param confidence - 信頼度
   * @returns リスクレベル
   */
  evaluate(intent: IntentType, context: IntentContext, confidence: number): RiskLevel {
    // ベースリスクを取得
    let riskLevel = this.baseRiskLevels.get(intent) || 'medium';

    // コンテキストに基づくリスク調整
    riskLevel = this.adjustForContext(riskLevel, context);

    // 信頼度に基づくリスク調整
    riskLevel = this.adjustForConfidence(riskLevel, confidence);

    return riskLevel;
  }

  /**
   * コンテキストに基づくリスク調整
   *
   * @param baseRisk - ベースリスクレベル
   * @param context - コンテキスト情報
   * @returns 調整されたリスクレベル
   */
  private adjustForContext(baseRisk: RiskLevel, context: IntentContext): RiskLevel {
    let risk = baseRisk;

    // ベースラインファイル改変は高リスク
    if (context.baselineFileModification) {
      return 'high';
    }

    // 逸脱検出は中〜高リスク
    if (context.deviationDetected && risk === 'low') {
      risk = 'medium';
    }

    // ワークフロー再利用は低リスク
    if (context.workflowReuseDetected && risk === 'medium') {
      risk = 'low';
    }

    // スキル要求は低リスク
    if (context.skillRequested && risk === 'medium') {
      risk = 'low';
    }

    return risk;
  }

  /**
   * 信頼度に基づくリスク調整
   *
   * @param baseRisk - ベースリスクレベル
   * @param confidence - 信頼度（0-100）
   * @returns 調整されたリスクレベル
   */
  private adjustForConfidence(baseRisk: RiskLevel, confidence: number): RiskLevel {
    // 信頼度が低い（<50）場合はリスクを上げる
    if (confidence < 50) {
      if (baseRisk === 'low') {
        return 'medium';
      }
      if (baseRisk === 'medium') {
        return 'high';
      }
    }

    // 信頼度が非常に高い（>90）場合はリスクを下げる
    if (confidence > 90) {
      if (baseRisk === 'high') {
        return 'medium';
      }
      if (baseRisk === 'medium') {
        return 'low';
      }
    }

    return baseRisk;
  }

  /**
   * リスクレベルに基づくスキップ可能 Layer を決定
   *
   * @param riskLevel - リスクレベル
   * @param intent - Intent タイプ
   * @param context - コンテキスト情報
   * @returns スキップ可能な Layer 番号配列
   */
  determineSkippableLayers(riskLevel: RiskLevel, intent: IntentType, context: IntentContext): number[] {
    const skippableLayers: number[] = [];

    // Low Risk の場合
    if (riskLevel === 'low') {
      // Layer 6 (Deviation Approval) をスキップ可能
      if (!context.deviationDetected) {
        skippableLayers.push(6);
      }

      // Layer 7 (Agent Enforcement) をスキップ可能
      if (this.isSimpleIntent(intent)) {
        skippableLayers.push(7);
      }
    }

    // ワークフロー再利用の場合
    if (context.workflowReuseDetected) {
      // Layer 3 (Read-before-Write) をスキップ可能
      skippableLayers.push(3);
    }

    // スキル要求の場合
    if (context.skillRequested) {
      // Layer 5 (Skill Evidence) を通過（スキップではない）
      // Layer 6 (Deviation Approval) をスキップ可能
      skippableLayers.push(6);
    }

    return skippableLayers;
  }

  /**
   * シンプルな Intent か判定
   *
   * @param intent - Intent タイプ
   * @returns シンプルな Intent なら true
   */
  private isSimpleIntent(intent: IntentType): boolean {
    const simpleIntents = [
      IntentType.FILE_READ,
      IntentType.SEARCH_CODE,
      IntentType.SEARCH_FILE,
      IntentType.QUESTION,
      IntentType.CONFIRMATION,
      IntentType.CODE_REVIEW,
      IntentType.ANALYSIS_CODE,
    ];

    return simpleIntents.includes(intent);
  }

  /**
   * リスクレベルの数値スコアを取得
   *
   * @param riskLevel - リスクレベル
   * @returns スコア（1-3）
   */
  getRiskScore(riskLevel: RiskLevel): number {
    const scores: Record<RiskLevel, number> = {
      low: 1,
      medium: 2,
      high: 3,
    };

    return scores[riskLevel];
  }

  /**
   * リスク説明を取得
   *
   * @param riskLevel - リスクレベル
   * @param intent - Intent タイプ
   * @returns リスク説明
   */
  getRiskDescription(riskLevel: RiskLevel, intent: IntentType): string {
    if (riskLevel === 'high') {
      return `高リスク操作: ${intent} は慎重な確認が必要です`;
    }

    if (riskLevel === 'medium') {
      return `中リスク操作: ${intent} は確認推奨`;
    }

    return `低リスク操作: ${intent} は安全に実行可能`;
  }
}

/**
 * シングルトンインスタンス
 */
let evaluatorInstance: RiskEvaluator | null = null;

/**
 * Risk Evaluator インスタンスを取得
 *
 * @returns RiskEvaluator インスタンス
 */
export function getRiskEvaluator(): RiskEvaluator {
  if (!evaluatorInstance) {
    evaluatorInstance = new RiskEvaluator();
  }
  return evaluatorInstance;
}
