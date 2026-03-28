/**
 * Layer 1: Intent Router & Quick Allow
 *
 * 責務:
 * - Intent パターンマッチング
 * - Fast Path 判定 (95% の操作を 50-150ms で処理)
 * - LRU キャッシュによる高速化
 */

import { HookEvent, HookIntent, Layer1Output } from '../types';
import { LRUCacheManager } from './cache-manager';

export class IntentRouter {
  private cache: LRUCacheManager<Layer1Output>;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;

  constructor() {
    this.cache = new LRUCacheManager<Layer1Output>(1000, 5000);
  }

  /**
   * Hook イベントから Intent を検出し、Fast Path 判定を行う
   */
  async route(event: HookEvent): Promise<Layer1Output> {
    const startTime = performance.now();

    // キャッシュキーを生成
    const cacheKey = this.generateCacheKey(event);

    // キャッシュヒットチェック
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.cacheHits++;
      return {
        ...cached,
        cacheHit: true,
        processingTimeMs: performance.now() - startTime,
      };
    }

    this.cacheMisses++;

    // Intent 検出
    const intent = this.detectIntent(event);

    // Fast Path 判定
    const { allow, skipLayers, reason } = this.evaluateFastPath(intent, event);

    const result: Layer1Output = {
      intent,
      allow,
      skipLayers,
      fastPath: skipLayers.length > 0,
      cacheHit: false,
      processingTimeMs: performance.now() - startTime,
      reason,
    };

    // キャッシュに保存
    this.cache.set(cacheKey, result);

    return result;
  }

  /**
   * Intent 検出
   */
  private detectIntent(event: HookEvent): HookIntent {
    const toolName = event.toolName;

    switch (toolName) {
      case 'Read':
        return HookIntent.READ;
      case 'Write':
        return HookIntent.WRITE;
      case 'Edit':
        return HookIntent.EDIT;
      case 'Bash':
        return HookIntent.BASH;
      case 'Glob':
        return HookIntent.GLOB;
      case 'Grep':
        return HookIntent.GREP;
      case 'Skill':
        return HookIntent.SKILL;
      default:
        return HookIntent.UNKNOWN;
    }
  }

  /**
   * Fast Path 評価
   *
   * 95% の操作を Fast Path (Layer 2-3 スキップ) で処理
   */
  private evaluateFastPath(
    intent: HookIntent,
    event: HookEvent
  ): { allow: boolean; skipLayers: number[]; reason?: string } {
    // READ は常に Fast Path (Layer 2-3 スキップ)
    if (intent === HookIntent.READ) {
      return {
        allow: true,
        skipLayers: [2, 3],
        reason: 'READ operations are always allowed (Fast Path)',
      };
    }

    // Glob, Grep は Fast Path
    if (intent === HookIntent.GLOB || intent === HookIntent.GREP) {
      return {
        allow: true,
        skipLayers: [2, 3],
        reason: 'Search operations are always allowed (Fast Path)',
      };
    }

    // 既存ファイルへの Write/Edit は Fast Path
    if (intent === HookIntent.WRITE || intent === HookIntent.EDIT) {
      const filePath = event.toolInput.file_path || '';

      // 既存ファイルかどうかは Layer 2 で判定するため、ここでは全て通す
      // ただし、明らかに安全なパターン (test files, docs) は Fast Path
      if (this.isSafeFile(filePath)) {
        return {
          allow: true,
          skipLayers: [3], // Layer 2 はスキップしない (Read-before-Write チェック必要)
          reason: 'Safe file pattern detected (Fast Path)',
        };
      }
    }

    // Bash コマンドの簡易評価
    if (intent === HookIntent.BASH) {
      const command = event.toolInput.command || '';

      // 読み取り専用コマンドは Fast Path
      if (this.isReadOnlyCommand(command)) {
        return {
          allow: true,
          skipLayers: [2, 3],
          reason: 'Read-only command detected (Fast Path)',
        };
      }
    }

    // Skill 呼び出しは Layer 2 で検証が必要
    if (intent === HookIntent.SKILL) {
      return {
        allow: false, // Layer 2 で skill 要件をチェック
        skipLayers: [3], // Security はスキップ可能
        reason: 'Skill invocation requires policy validation',
      };
    }

    // デフォルト: Layer 2, 3 両方で検証
    return {
      allow: false,
      skipLayers: [],
      reason: 'Requires full validation (Layer 2, 3)',
    };
  }

  /**
   * 安全なファイルパターンかどうか判定
   */
  private isSafeFile(filePath: string): boolean {
    const safePatterns = [
      /\.test\.(ts|js|tsx|jsx)$/,
      /\.spec\.(ts|js|tsx|jsx)$/,
      /\.md$/,
      /\.txt$/,
      /\.json$/,
      /README/,
      /CHANGELOG/,
    ];

    return safePatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * 読み取り専用コマンドかどうか判定
   */
  private isReadOnlyCommand(command: string): boolean {
    const readOnlyCommands = [
      /^ls(\s|$)/,
      /^cat(\s|$)/,
      /^head(\s|$)/,
      /^tail(\s|$)/,
      /^grep(\s|$)/,
      /^find(\s|$)/,
      /^echo(\s|$)/,
      /^pwd(\s|$)/,
      /^which(\s|$)/,
      /^whoami(\s|$)/,
      /^date(\s|$)/,
    ];

    return readOnlyCommands.some(pattern => pattern.test(command));
  }

  /**
   * キャッシュキー生成
   */
  private generateCacheKey(event: HookEvent): string {
    const toolName = event.toolName;
    const key = event.toolInput.file_path || event.toolInput.command || event.toolInput.pattern || '';
    return `${toolName}:${key}`;
  }

  /**
   * キャッシュヒット率を取得
   */
  getCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    if (total === 0) return 0;
    return this.cacheHits / total;
  }

  /**
   * 統計情報を取得
   */
  getStats(): {
    cacheSize: number;
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
  } {
    return {
      cacheSize: this.cache.size(),
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate: this.getCacheHitRate(),
    };
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}
