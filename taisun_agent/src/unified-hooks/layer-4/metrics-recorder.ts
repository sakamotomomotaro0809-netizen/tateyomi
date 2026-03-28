/**
 * Layer 4: Metrics Recorder
 *
 * 責務:
 * - Hook メトリクスの記録
 * - パフォーマンス測定
 * - 統計情報の集計
 */

import { HookMetrics, HookDecision } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export class MetricsRecorder {
  private metricsBuffer: HookMetrics[] = [];
  private readonly bufferSize = 100;
  private readonly metricsFile = '.claude/hooks/data/unified-metrics.jsonl';

  /**
   * メトリクスを記録 (非ブロッキング)
   */
  async record(metrics: HookMetrics): Promise<void> {
    // メモリバッファに追加
    this.metricsBuffer.push(metrics);

    // バッファがいっぱいになったら非同期でフラッシュ
    if (this.metricsBuffer.length >= this.bufferSize) {
      // 非ブロッキングでフラッシュ
      setImmediate(() => this.flush().catch(console.error));
    }
  }

  /**
   * バッファをファイルにフラッシュ
   */
  private async flush(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const data = this.metricsBuffer.slice();
    this.metricsBuffer = [];

    try {
      const dir = path.dirname(this.metricsFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const lines = data.map(m => JSON.stringify(m)).join('\n') + '\n';
      fs.appendFileSync(this.metricsFile, lines, 'utf8');
    } catch (error) {
      console.error('Failed to flush metrics:', error);
    }
  }

  /**
   * 統計情報を取得
   */
  getStats(): {
    totalRecords: number;
    bufferSize: number;
  } {
    let totalRecords = 0;

    try {
      if (fs.existsSync(this.metricsFile)) {
        const content = fs.readFileSync(this.metricsFile, 'utf8');
        totalRecords = content.split('\n').filter(line => line.trim()).length;
      }
    } catch (error) {
      console.error('Failed to get stats:', error);
    }

    return {
      totalRecords,
      bufferSize: this.metricsBuffer.length,
    };
  }

  /**
   * 最新の N 件のメトリクスを取得
   */
  getRecentMetrics(count: number = 10): HookMetrics[] {
    try {
      if (!fs.existsSync(this.metricsFile)) {
        return [];
      }

      const content = fs.readFileSync(this.metricsFile, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());

      const recentLines = lines.slice(-count);
      return recentLines.map(line => JSON.parse(line));
    } catch (error) {
      console.error('Failed to get recent metrics:', error);
      return [];
    }
  }
}
