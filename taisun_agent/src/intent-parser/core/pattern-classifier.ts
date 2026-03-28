/**
 * Pattern Classifier
 *
 * 正規表現パターンマッチングによる分類
 */

import { PatternMatch, Pattern } from '../types';
import { ALL_PATTERNS } from '../classifiers/patterns';

/**
 * Pattern Classifier クラス
 */
export class PatternClassifier {
  private patterns: Pattern[];

  constructor(customPatterns?: Pattern[]) {
    this.patterns = customPatterns || ALL_PATTERNS;
  }

  /**
   * テキストからパターンをマッチング
   *
   * @param text - 入力テキスト
   * @returns マッチしたパターン配列（信頼度順）
   */
  classify(text: string): PatternMatch[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const matches: PatternMatch[] = [];

    for (const pattern of this.patterns) {
      const match = text.match(pattern.regex);

      if (match) {
        matches.push({
          pattern: pattern.name,
          confidence: pattern.confidence,
          matched: match[0],
          position: {
            start: match.index || 0,
            end: (match.index || 0) + match[0].length,
          },
        });
      }
    }

    // 信頼度順にソート
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 最も信頼度の高いパターンを取得
   *
   * @param text - 入力テキスト
   * @returns 最高信頼度のパターン、なければ null
   */
  classifyBest(text: string): PatternMatch | null {
    const matches = this.classify(text);
    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * 特定の Intent に関連するパターンのみマッチング
   *
   * @param text - 入力テキスト
   * @param intentType - Intent タイプ
   * @returns マッチしたパターン配列
   */
  classifyByIntent(text: string, intentType: string): PatternMatch[] {
    const filteredPatterns = this.patterns.filter((p) => p.intent === intentType);
    const classifier = new PatternClassifier(filteredPatterns);
    return classifier.classify(text);
  }

  /**
   * 複数パターンのマッチング（AND 条件）
   *
   * @param text - 入力テキスト
   * @param patternNames - パターン名配列
   * @returns すべてマッチすれば true
   */
  matchAll(text: string, patternNames: string[]): boolean {
    const matches = this.classify(text);
    const matchedNames = new Set(matches.map((m) => m.pattern));

    return patternNames.every((name) => matchedNames.has(name));
  }

  /**
   * 複数パターンのマッチング（OR 条件）
   *
   * @param text - 入力テキスト
   * @param patternNames - パターン名配列
   * @returns いずれかがマッチすれば true
   */
  matchAny(text: string, patternNames: string[]): boolean {
    const matches = this.classify(text);
    const matchedNames = new Set(matches.map((m) => m.pattern));

    return patternNames.some((name) => matchedNames.has(name));
  }

  /**
   * パターンの統計情報を取得
   *
   * @param text - 入力テキスト
   * @returns 統計情報
   */
  getStats(text: string): {
    totalMatches: number;
    averageConfidence: number;
    maxConfidence: number;
    minConfidence: number;
  } {
    const matches = this.classify(text);

    if (matches.length === 0) {
      return {
        totalMatches: 0,
        averageConfidence: 0,
        maxConfidence: 0,
        minConfidence: 0,
      };
    }

    const confidences = matches.map((m) => m.confidence);
    const sum = confidences.reduce((a, b) => a + b, 0);

    return {
      totalMatches: matches.length,
      averageConfidence: sum / matches.length,
      maxConfidence: Math.max(...confidences),
      minConfidence: Math.min(...confidences),
    };
  }

  /**
   * パターンを追加
   *
   * @param pattern - 追加するパターン
   */
  addPattern(pattern: Pattern): void {
    this.patterns = [...this.patterns, pattern];
  }

  /**
   * パターンを削除
   *
   * @param patternName - 削除するパターン名
   */
  removePattern(patternName: string): void {
    this.patterns = this.patterns.filter((p) => p.name !== patternName);
  }

  /**
   * 全パターンを取得
   *
   * @returns パターン配列
   */
  getPatterns(): Pattern[] {
    return [...this.patterns];
  }

  /**
   * パターン数を取得
   *
   * @returns パターン数
   */
  getPatternCount(): number {
    return this.patterns.length;
  }

  /**
   * テキスト内の複数箇所でマッチング
   *
   * @param text - 入力テキスト
   * @returns 全マッチング結果（位置情報付き）
   */
  findAllMatches(text: string): PatternMatch[] {
    const allMatches: PatternMatch[] = [];

    for (const pattern of this.patterns) {
      const regex = new RegExp(pattern.regex, 'g');
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        allMatches.push({
          pattern: pattern.name,
          confidence: pattern.confidence,
          matched: match[0],
          position: {
            start: match.index,
            end: match.index + match[0].length,
          },
        });
      }
    }

    return allMatches.sort((a, b) => a.position.start - b.position.start);
  }

  /**
   * パターンの重複検出
   *
   * @param text - 入力テキスト
   * @returns 重複しているパターン配列
   */
  detectOverlaps(text: string): PatternMatch[][] {
    const matches = this.findAllMatches(text);
    const overlaps: PatternMatch[][] = [];

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const overlapping = [current];

      for (let j = i + 1; j < matches.length; j++) {
        const next = matches[j];

        if (
          (current.position.start <= next.position.start && next.position.start < current.position.end) ||
          (next.position.start <= current.position.start && current.position.start < next.position.end)
        ) {
          overlapping.push(next);
        }
      }

      if (overlapping.length > 1) {
        overlaps.push(overlapping);
      }
    }

    return overlaps;
  }
}

/**
 * シングルトンインスタンス
 */
let classifierInstance: PatternClassifier | null = null;

/**
 * Pattern Classifier インスタンスを取得
 *
 * @returns PatternClassifier インスタンス
 */
export function getPatternClassifier(): PatternClassifier {
  if (!classifierInstance) {
    classifierInstance = new PatternClassifier();
  }
  return classifierInstance;
}
