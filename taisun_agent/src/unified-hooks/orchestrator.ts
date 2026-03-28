/**
 * Unified Hook Orchestrator
 *
 * 責務:
 * - Layer 1-4 の統合実行
 * - Fast Path ルーティング
 * - エラーハンドリング
 * - パフォーマンス最適化
 */

import { HookEvent, UnifiedHookResult, HookDecision, HookMetrics, Layer4Output } from './types';
import { IntentRouter } from './layer-1';
import { PolicyValidator, StateValidator } from './layer-2';
import { SecurityGate } from './layer-3';
import { MetricsRecorder, StatePersistence } from './layer-4';

export class UnifiedHookOrchestrator {
  private layer1: IntentRouter;
  private layer2Policy: PolicyValidator;
  private layer2State: StateValidator;
  private layer3: SecurityGate;
  private layer4Metrics: MetricsRecorder;
  private layer4State: StatePersistence;

  constructor() {
    this.layer1 = new IntentRouter();
    this.layer2Policy = new PolicyValidator();
    this.layer2State = new StateValidator();
    this.layer3 = new SecurityGate();
    this.layer4Metrics = new MetricsRecorder();
    this.layer4State = new StatePersistence();
  }

  /**
   * Hook イベントを処理
   */
  async process(event: HookEvent): Promise<UnifiedHookResult> {
    const startTime = performance.now();

    try {
      // Layer 1: Intent Router & Quick Allow
      const layer1Result = await this.layer1.route(event);

      // Layer 1 でブロックされた場合は即座に返す
      if (!layer1Result.allow && layer1Result.reason) {
        return {
          decision: HookDecision.BLOCK,
          layer1: layer1Result,
          totalProcessingTimeMs: performance.now() - startTime,
          fastPath: false,
          cacheHit: layer1Result.cacheHit,
          reason: layer1Result.reason,
        };
      }

      // Fast Path: Layer 2-3 をスキップ
      const skipLayer2 = layer1Result.skipLayers.includes(2);
      const skipLayer3 = layer1Result.skipLayers.includes(3);

      let layer2Result;
      let layer3Result;
      let finalDecision: HookDecision = HookDecision.ALLOW;
      let finalReason: string | undefined;

      // Layer 2: Policy & State Validator
      if (!skipLayer2) {
        layer2Result = await this.layer2Policy.validate(event, layer1Result.intent);

        // 状態検証も実行
        const state = this.layer4State.loadState(event.cwd);
        this.layer2State.checkReadBeforeWrite(event, state, layer2Result.violations);
        this.layer2State.checkBaselineLock(event, state, layer2Result.violations);

        // 決定を更新
        if (layer2Result.decision === HookDecision.BLOCK) {
          finalDecision = HookDecision.BLOCK;
          finalReason = layer2Result.reason;
        } else if (layer2Result.decision === HookDecision.WARNING && finalDecision === HookDecision.ALLOW) {
          finalDecision = HookDecision.WARNING;
          finalReason = layer2Result.reason;
        }
      }

      // Layer 2 でブロックされた場合はLayer 3 をスキップ
      if (finalDecision === HookDecision.BLOCK) {
        const totalTime = performance.now() - startTime;

        // Layer 4 を非同期で実行
        this.executeLayer4Async(event, layer1Result, layer2Result, undefined, totalTime, finalDecision);

        return {
          decision: finalDecision,
          layer1: layer1Result,
          layer2: layer2Result,
          totalProcessingTimeMs: totalTime,
          fastPath: layer1Result.fastPath,
          cacheHit: layer1Result.cacheHit,
          reason: finalReason,
        };
      }

      // Layer 3: Security & Safety Gate
      if (!skipLayer3) {
        layer3Result = await this.layer3.validate(event);

        // 決定を更新
        if (layer3Result.decision === HookDecision.BLOCK) {
          finalDecision = HookDecision.BLOCK;
          finalReason = layer3Result.reason;
        } else if (layer3Result.decision === HookDecision.WARNING && finalDecision === HookDecision.ALLOW) {
          finalDecision = HookDecision.WARNING;
          finalReason = layer3Result.reason;
        }
      }

      const totalTime = performance.now() - startTime;

      // Layer 4: Observability (非ブロッキング)
      this.executeLayer4Async(event, layer1Result, layer2Result, layer3Result, totalTime, finalDecision);

      return {
        decision: finalDecision,
        layer1: layer1Result,
        layer2: layer2Result,
        layer3: layer3Result,
        totalProcessingTimeMs: totalTime,
        fastPath: layer1Result.fastPath,
        cacheHit: layer1Result.cacheHit,
        reason: finalReason,
      };
    } catch (error) {
      console.error('Unified Hook Orchestrator error:', error);

      // エラー時は ALLOW (フックシステム自体の障害でブロックしない)
      return {
        decision: HookDecision.ALLOW,
        layer1: {
          intent: 'UNKNOWN' as any,
          allow: true,
          skipLayers: [],
          fastPath: false,
          cacheHit: false,
          processingTimeMs: performance.now() - startTime,
          reason: `Hook error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
        totalProcessingTimeMs: performance.now() - startTime,
        fastPath: false,
        cacheHit: false,
        reason: 'Hook system error - allowing operation',
      };
    }
  }

  /**
   * Layer 4 を非ブロッキングで実行
   */
  private async executeLayer4Async(
    event: HookEvent,
    layer1: any,
    layer2: any,
    layer3: any,
    totalTimeMs: number,
    decision: HookDecision
  ): Promise<void> {
    setImmediate(async () => {
      try {
        const startTime = performance.now();

        // メトリクス記録
        const metrics: HookMetrics = {
          timestamp: Date.now(),
          hookName: 'unified-hook',
          decision,
          processingTimeMs: totalTimeMs,
          cacheHit: layer1?.cacheHit ?? false,
          fastPath: layer1?.fastPath ?? false,
          layer1TimeMs: layer1?.processingTimeMs ?? 0,
          layer2TimeMs: layer2?.processingTimeMs,
          layer3TimeMs: layer3?.processingTimeMs,
          layer4TimeMs: 0, // 後で更新
        };

        await this.layer4Metrics.record(metrics);

        // 状態永続化
        if (event.toolName === 'Read') {
          await this.layer4State.addToReadLog(event.cwd, event.toolInput.file_path || '');
        }

        // セッションハンドオフ更新
        await this.layer4State.updateHandoff(event.cwd, event);

        metrics.layer4TimeMs = performance.now() - startTime;
      } catch (error) {
        console.error('Layer 4 async execution error:', error);
      }
    });
  }

  /**
   * 統計情報を取得
   */
  getStats(): {
    layer1: any;
    layer4: any;
  } {
    return {
      layer1: this.layer1.getStats(),
      layer4: this.layer4Metrics.getStats(),
    };
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.layer1.clearCache();
  }
}
