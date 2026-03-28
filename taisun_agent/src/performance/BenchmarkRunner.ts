/**
 * Benchmark Runner for TAISUN v2
 *
 * Runs performance benchmarks and generates comparison reports.
 */

import * as fs from 'fs';
import * as os from 'os';
import {
  BenchmarkScenario,
  BenchmarkResult,
  BenchmarkSuiteConfig,
  BenchmarkSuiteResult,
} from './types';

/**
 * Benchmark Runner class
 */
export class BenchmarkRunner {
  private scenarios: BenchmarkScenario[] = [];

  /**
   * Register a benchmark scenario
   */
  registerScenario(scenario: BenchmarkScenario): void {
    this.scenarios.push(scenario);
  }

  /**
   * Run a single scenario
   */
  async runScenario(scenario: BenchmarkScenario): Promise<BenchmarkResult> {
    const timings: number[] = [];
    const memorySnapshots: number[] = [];
    let errors = 0;

    // Setup
    if (scenario.setup) {
      await scenario.setup();
    }

    // Warmup iterations
    for (let i = 0; i < scenario.warmupIterations; i++) {
      try {
        await Promise.race([
          scenario.run(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Warmup timeout')), scenario.timeout)
          ),
        ]);
      } catch {
        // Ignore warmup errors
      }
    }

    // Force GC if available
    if (global.gc) {
      global.gc();
    }

    // Main iterations
    for (let i = 0; i < scenario.iterations; i++) {
      const startMemory = process.memoryUsage().heapUsed;
      const startTime = process.hrtime.bigint();

      try {
        await Promise.race([
          scenario.run(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), scenario.timeout)
          ),
        ]);

        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1000000;
        timings.push(durationMs);

        const endMemory = process.memoryUsage().heapUsed;
        memorySnapshots.push((endMemory - startMemory) / 1024 / 1024);
      } catch {
        errors++;
      }
    }

    // Teardown
    if (scenario.teardown) {
      await scenario.teardown();
    }

    // Calculate statistics
    const sortedTimings = [...timings].sort((a, b) => a - b);
    const totalMs = timings.reduce((a, b) => a + b, 0);
    const avgMs = timings.length > 0 ? totalMs / timings.length : 0;

    const variance = timings.length > 0
      ? timings.reduce((sum, t) => sum + Math.pow(t - avgMs, 2), 0) / timings.length
      : 0;
    const stdDev = Math.sqrt(variance);

    const p50Index = Math.floor(sortedTimings.length * 0.5);
    const p95Index = Math.floor(sortedTimings.length * 0.95);
    const p99Index = Math.floor(sortedTimings.length * 0.99);

    const peakHeapMB = Math.max(...memorySnapshots, 0);
    const avgHeapMB = memorySnapshots.length > 0
      ? memorySnapshots.reduce((a, b) => a + b, 0) / memorySnapshots.length
      : 0;

    return {
      scenarioId: scenario.id,
      timestamp: new Date().toISOString(),
      iterations: scenario.iterations,
      timing: {
        totalMs,
        avgMs,
        minMs: sortedTimings[0] || 0,
        maxMs: sortedTimings[sortedTimings.length - 1] || 0,
        p50Ms: sortedTimings[p50Index] || 0,
        p95Ms: sortedTimings[p95Index] || 0,
        p99Ms: sortedTimings[p99Index] || 0,
        stdDev,
      },
      throughput: {
        operationsPerSecond: avgMs > 0 ? 1000 / avgMs : 0,
      },
      memory: {
        peakHeapMB,
        avgHeapMB,
      },
      errors,
      success: errors === 0,
    };
  }

  /**
   * Run all registered scenarios
   */
  async runAll(config: BenchmarkSuiteConfig): Promise<BenchmarkSuiteResult> {
    const results: BenchmarkResult[] = [];

    console.log(`\nRunning benchmark suite: ${config.name}`);
    console.log('═'.repeat(60));

    for (const scenario of this.scenarios) {
      console.log(`\n  Running: ${scenario.name}...`);

      const result = await this.runScenario(scenario);
      results.push(result);

      const status = result.success ? '✓' : '✗';
      console.log(`  ${status} Avg: ${result.timing.avgMs.toFixed(2)}ms | P95: ${result.timing.p95Ms.toFixed(2)}ms | Ops/s: ${result.throughput.operationsPerSecond.toFixed(1)}`);
    }

    const passed = results.filter((r) => r.success).length;
    const avgThroughput =
      results.reduce((sum, r) => sum + r.throughput.operationsPerSecond, 0) / results.length;

    const suiteResult: BenchmarkSuiteResult = {
      name: config.name,
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: os.platform(),
        cpuCount: os.cpus().length,
        totalMemoryMB: os.totalmem() / 1024 / 1024,
      },
      results,
      summary: {
        totalScenarios: results.length,
        passed,
        failed: results.length - passed,
        avgThroughput,
      },
    };

    // Compare with baseline if provided
    if (config.baseline) {
      suiteResult.comparison = this.compareWithBaseline(results, config.baseline);
    }

    // Output results
    this.outputResults(suiteResult, config);

    return suiteResult;
  }

  /**
   * Compare results with baseline
   */
  private compareWithBaseline(
    results: BenchmarkResult[],
    baseline: BenchmarkSuiteResult
  ) {
    const improvements: Array<{
      scenarioId: string;
      metric: string;
      baseline: number;
      current: number;
      changePercent: number;
    }> = [];

    const regressions: Array<{
      scenarioId: string;
      metric: string;
      baseline: number;
      current: number;
      changePercent: number;
    }> = [];

    for (const result of results) {
      const baselineResult = baseline.results.find((r) => r.scenarioId === result.scenarioId);

      if (!baselineResult) continue;

      // Compare average timing
      const timingChange = ((result.timing.avgMs - baselineResult.timing.avgMs) / baselineResult.timing.avgMs) * 100;

      if (timingChange < -5) {
        improvements.push({
          scenarioId: result.scenarioId,
          metric: 'avgMs',
          baseline: baselineResult.timing.avgMs,
          current: result.timing.avgMs,
          changePercent: timingChange,
        });
      } else if (timingChange > 5) {
        regressions.push({
          scenarioId: result.scenarioId,
          metric: 'avgMs',
          baseline: baselineResult.timing.avgMs,
          current: result.timing.avgMs,
          changePercent: timingChange,
        });
      }

      // Compare throughput
      const throughputChange =
        ((result.throughput.operationsPerSecond - baselineResult.throughput.operationsPerSecond) /
          baselineResult.throughput.operationsPerSecond) *
        100;

      if (throughputChange > 5) {
        improvements.push({
          scenarioId: result.scenarioId,
          metric: 'operationsPerSecond',
          baseline: baselineResult.throughput.operationsPerSecond,
          current: result.throughput.operationsPerSecond,
          changePercent: throughputChange,
        });
      } else if (throughputChange < -5) {
        regressions.push({
          scenarioId: result.scenarioId,
          metric: 'operationsPerSecond',
          baseline: baselineResult.throughput.operationsPerSecond,
          current: result.throughput.operationsPerSecond,
          changePercent: throughputChange,
        });
      }
    }

    return {
      baselineTimestamp: baseline.timestamp,
      improvements,
      regressions,
    };
  }

  /**
   * Output results in specified format
   */
  private outputResults(result: BenchmarkSuiteResult, config: BenchmarkSuiteConfig): void {
    let output: string;

    switch (config.outputFormat) {
      case 'json':
        output = JSON.stringify(result, null, 2);
        break;
      case 'markdown':
        output = this.formatAsMarkdown(result);
        break;
      case 'console':
      default:
        output = this.formatAsConsole(result);
        break;
    }

    if (config.outputPath) {
      fs.writeFileSync(config.outputPath, output);
      console.log(`\nResults saved to: ${config.outputPath}`);
    } else if (config.outputFormat !== 'console') {
      console.log(output);
    }
  }

  /**
   * Format results as console output
   */
  private formatAsConsole(result: BenchmarkSuiteResult): string {
    const lines: string[] = [];

    lines.push('\n' + '═'.repeat(60));
    lines.push('                    BENCHMARK SUMMARY                        ');
    lines.push('═'.repeat(60));
    lines.push('');
    lines.push(`Suite: ${result.name}`);
    lines.push(`Date: ${result.timestamp}`);
    lines.push(`Node: ${result.environment.nodeVersion} | Platform: ${result.environment.platform}`);
    lines.push(`CPUs: ${result.environment.cpuCount} | Memory: ${result.environment.totalMemoryMB.toFixed(0)}MB`);
    lines.push('');
    lines.push(`Total: ${result.summary.totalScenarios} | Passed: ${result.summary.passed} | Failed: ${result.summary.failed}`);
    lines.push(`Avg Throughput: ${result.summary.avgThroughput.toFixed(1)} ops/s`);

    if (result.comparison) {
      lines.push('');
      lines.push('─'.repeat(60));
      lines.push('COMPARISON WITH BASELINE');
      lines.push('─'.repeat(60));

      if (result.comparison.improvements.length > 0) {
        lines.push('\n  Improvements:');
        for (const imp of result.comparison.improvements) {
          lines.push(`    ✓ ${imp.scenarioId}.${imp.metric}: ${imp.changePercent.toFixed(1)}%`);
        }
      }

      if (result.comparison.regressions.length > 0) {
        lines.push('\n  Regressions:');
        for (const reg of result.comparison.regressions) {
          lines.push(`    ✗ ${reg.scenarioId}.${reg.metric}: +${reg.changePercent.toFixed(1)}%`);
        }
      }
    }

    lines.push('');
    lines.push('═'.repeat(60));

    return lines.join('\n');
  }

  /**
   * Format results as markdown
   */
  private formatAsMarkdown(result: BenchmarkSuiteResult): string {
    const lines: string[] = [];

    lines.push(`# Benchmark Results: ${result.name}`);
    lines.push('');
    lines.push(`**Date:** ${result.timestamp}`);
    lines.push(`**Node:** ${result.environment.nodeVersion}`);
    lines.push(`**Platform:** ${result.environment.platform}`);
    lines.push(`**CPUs:** ${result.environment.cpuCount}`);
    lines.push(`**Memory:** ${result.environment.totalMemoryMB.toFixed(0)}MB`);
    lines.push('');

    lines.push('## Summary');
    lines.push('');
    lines.push(`- Total Scenarios: ${result.summary.totalScenarios}`);
    lines.push(`- Passed: ${result.summary.passed}`);
    lines.push(`- Failed: ${result.summary.failed}`);
    lines.push(`- Avg Throughput: ${result.summary.avgThroughput.toFixed(1)} ops/s`);
    lines.push('');

    lines.push('## Results');
    lines.push('');
    lines.push('| Scenario | Avg (ms) | P95 (ms) | P99 (ms) | Ops/s | Status |');
    lines.push('|----------|----------|----------|----------|-------|--------|');

    for (const r of result.results) {
      const status = r.success ? '✓' : '✗';
      lines.push(
        `| ${r.scenarioId} | ${r.timing.avgMs.toFixed(2)} | ${r.timing.p95Ms.toFixed(2)} | ${r.timing.p99Ms.toFixed(2)} | ${r.throughput.operationsPerSecond.toFixed(1)} | ${status} |`
      );
    }

    if (result.comparison) {
      lines.push('');
      lines.push('## Comparison with Baseline');
      lines.push('');
      lines.push(`Baseline: ${result.comparison.baselineTimestamp}`);
      lines.push('');

      if (result.comparison.improvements.length > 0) {
        lines.push('### Improvements');
        lines.push('');
        for (const imp of result.comparison.improvements) {
          lines.push(`- **${imp.scenarioId}** ${imp.metric}: ${imp.changePercent.toFixed(1)}% faster`);
        }
      }

      if (result.comparison.regressions.length > 0) {
        lines.push('');
        lines.push('### Regressions');
        lines.push('');
        for (const reg of result.comparison.regressions) {
          lines.push(`- **${reg.scenarioId}** ${reg.metric}: ${reg.changePercent.toFixed(1)}% slower`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Clear registered scenarios
   */
  clearScenarios(): void {
    this.scenarios = [];
  }
}

/**
 * Export singleton instance
 */
export const benchmarkRunner = new BenchmarkRunner();
