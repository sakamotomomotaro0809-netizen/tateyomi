/**
 * Layer 3: Injection Detector
 *
 * 責務:
 * - コマンドインジェクション検出
 * - SQLインジェクション検出
 * - パストラバーサル検出
 */

import { SecurityThreat } from '../types';

export class InjectionDetector {
  /**
   * コマンドインジェクション検出
   */
  detectCommandInjection(command: string): SecurityThreat | null {
    const dangerousPatterns = [
      /;\s*rm\s+-rf/,
      /\|\s*bash/,
      /\|\s*sh/,
      /`.*`/,
      /\$\(.*\)/,
      /&&\s*curl/,
      /;\s*wget/,
      />\s*\/dev\/null.*&/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return {
          category: 'injection',
          severity: 'critical',
          description: 'コマンドインジェクションパターンを検出しました',
          pattern: pattern.toString(),
        };
      }
    }

    return null;
  }

  /**
   * SQLインジェクション検出
   */
  detectSQLInjection(input: string): SecurityThreat | null {
    const sqlPatterns = [
      /'\s*OR\s*'1'\s*=\s*'1/i,
      /--\s*$/,
      /;.*DROP\s+TABLE/i,
      /UNION\s+SELECT/i,
      /'\s*;\s*DELETE\s+FROM/i,
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(input)) {
        return {
          category: 'injection',
          severity: 'critical',
          description: 'SQLインジェクションパターンを検出しました',
          pattern: pattern.toString(),
        };
      }
    }

    return null;
  }

  /**
   * パストラバーサル検出
   */
  detectPathTraversal(filePath: string): SecurityThreat | null {
    const traversalPatterns = [
      /\.\.\//,
      /\.\.\\\\,
      /%2e%2e%2f/i,
      /%2e%2e%5c/i,
    ];

    for (const pattern of traversalPatterns) {
      if (pattern.test(filePath)) {
        return {
          category: 'injection',
          severity: 'high',
          description: 'パストラバーサルパターンを検出しました',
          pattern: pattern.toString(),
        };
      }
    }

    return null;
  }
}
