/**
 * Confidence Scorer
 *
 * Intent の信頼度スコアリング
 */

import { PatternMatch, IntentContext } from '../types';

/**
 * Confidence Scorer クラス
 */
export class ConfidenceScorer {
  /**
   * 信頼度をスコアリング
   *
   * @param patternMatches - パターンマッチ結果配列
   * @param context - コンテキスト情報
   * @returns 信頼度スコア（0-100）
   */
  score(patternMatches: PatternMatch[], context: IntentContext): number {
    if (patternMatches.length === 0) {
      return 0;
    }

    // ベーススコア: 最高信頼度のパターン
    let baseScore = patternMatches[0].confidence;

    // コンテキストによるブースト
    baseScore = this.applyContextBoost(baseScore, context);

    // 複数パターンマッチによるブースト
    baseScore = this.applyMultiPatternBoost(baseScore, patternMatches);

    // 0-100 の範囲に収める
    return Math.min(100, Math.max(0, baseScore));
  }

  /**
   * コンテキストによるブースト
   *
   * @param baseScore - ベーススコア
   * @param context - コンテキスト情報
   * @returns ブーストされたスコア
   */
  private applyContextBoost(baseScore: number, context: IntentContext): number {
    let score = baseScore;

    // セッション継続の場合: +5
    if (context.sessionContinuation) {
      score += 5;
    }

    // ワークフロー再利用の場合: +10
    if (context.workflowReuseDetected) {
      score += 10;
    }

    // スキル要求の場合: +8
    if (context.skillRequested) {
      score += 8;
    }

    // 既存ファイル検出の場合: +5
    if (context.existingFilesDetected.length > 0) {
      score += 5;
    }

    // 逸脱検出の場合: -10
    if (context.deviationDetected) {
      score -= 10;
    }

    // ベースラインファイル改変の場合: -15
    if (context.baselineFileModification) {
      score -= 15;
    }

    return score;
  }

  /**
   * 複数パターンマッチによるブースト
   *
   * @param baseScore - ベーススコア
   * @param patternMatches - パターンマッチ結果配列
   * @returns ブーストされたスコア
   */
  private applyMultiPatternBoost(baseScore: number, patternMatches: PatternMatch[]): number {
    let score = baseScore;

    // 2つ以上のパターンがマッチした場合: +5
    if (patternMatches.length >= 2) {
      score += 5;
    }

    // 3つ以上のパターンがマッチした場合: さらに +5
    if (patternMatches.length >= 3) {
      score += 5;
    }

    return score;
  }

  /**
   * 信頼度レベルを取得
   *
   * @param score - 信頼度スコア（0-100）
   * @returns 信頼度レベル
   */
  getConfidenceLevel(score: number): 'very_low' | 'low' | 'medium' | 'high' | 'very_high' {
    if (score >= 90) {
      return 'very_high';
    }
    if (score >= 70) {
      return 'high';
    }
    if (score >= 50) {
      return 'medium';
    }
    if (score >= 30) {
      return 'low';
    }
    return 'very_low';
  }

  /**
   * 信頼度説明を取得
   *
   * @param score - 信頼度スコア（0-100）
   * @returns 信頼度説明
   */
  getConfidenceDescription(score: number): string {
    const level = this.getConfidenceLevel(score);

    const descriptions: Record<typeof level, string> = {
      very_high: '非常に高い信頼度: Intent の判定は確実です',
      high: '高い信頼度: Intent の判定は信頼できます',
      medium: '中程度の信頼度: Intent の判定は妥当です',
      low: '低い信頼度: Intent の判定は不確実です',
      very_low: '非常に低い信頼度: Intent の判定は推測です',
    };

    return descriptions[level];
  }

  /**
   * パターンマッチスコアの詳細を取得
   *
   * @param patternMatches - パターンマッチ結果配列
   * @returns スコア詳細
   */
  getScoreBreakdown(patternMatches: PatternMatch[]): {
    primaryPattern: string;
    primaryScore: number;
    additionalPatterns: number;
    totalMatches: number;
  } {
    if (patternMatches.length === 0) {
      return {
        primaryPattern: 'none',
        primaryScore: 0,
        additionalPatterns: 0,
        totalMatches: 0,
      };
    }

    return {
      primaryPattern: patternMatches[0].pattern,
      primaryScore: patternMatches[0].confidence,
      additionalPatterns: patternMatches.length - 1,
      totalMatches: patternMatches.length,
    };
  }
}

/**
 * シングルトンインスタンス
 */
let scorerInstance: ConfidenceScorer | null = null;

/**
 * Confidence Scorer インスタンスを取得
 *
 * @returns ConfidenceScorer インスタンス
 */
export function getConfidenceScorer(): ConfidenceScorer {
  if (!scorerInstance) {
    scorerInstance = new ConfidenceScorer();
  }
  return scorerInstance;
}
