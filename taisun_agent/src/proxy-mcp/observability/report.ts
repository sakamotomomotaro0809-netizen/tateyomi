/**
 * Observability Report Generator
 *
 * Generates daily/weekly reports from event logs
 */

import * as fs from 'fs';
import * as path from 'path';
import { ObservabilityEvent } from './types';
import { getCircuitSummary } from '../internal/circuit-breaker';

const EVENTS_DIR = path.join(process.cwd(), '.taisun', 'observability');
const EVENTS_FILE = path.join(EVENTS_DIR, 'events.jsonl');

export interface ReportPeriod {
  start: Date;
  end: Date;
  label: string;
}

export interface McpMetrics {
  name: string;
  callCount: number;
  failureCount: number;
  failureRate: number;
  avgDurationMs: number;
  p95DurationMs: number;
  circuitOpenCount: number;
}

export interface ReportData {
  period: ReportPeriod;
  totalEvents: number;
  successRate: number;
  failureCount: number;
  mcpMetrics: McpMetrics[];
  topErrors: Array<{ type: string; count: number }>;
  topSkills: Array<{ name: string; count: number }>;
  topTools: Array<{ name: string; count: number }>;
  circuitSummary: {
    total: number;
    closed: number;
    open: number;
    halfOpen: number;
  };
  recommendations: string[];
}

/**
 * Load events from JSONL file
 */
function loadEvents(since: Date): ObservabilityEvent[] {
  const events: ObservabilityEvent[] = [];

  try {
    if (!fs.existsSync(EVENTS_FILE)) {
      return events;
    }

    const content = fs.readFileSync(EVENTS_FILE, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      try {
        const event = JSON.parse(line) as ObservabilityEvent;
        const eventTime = new Date(event.timestamp);
        if (eventTime >= since) {
          events.push(event);
        }
      } catch {
        // Skip invalid lines
      }
    }
  } catch (error) {
    console.error('[report] Failed to load events:', error);
  }

  return events;
}

/**
 * Calculate percentile
 */
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Generate report for a time period
 */
export function generateReport(period: ReportPeriod): ReportData {
  const events = loadEvents(period.start);
  const filteredEvents = events.filter(
    (e) => new Date(e.timestamp) >= period.start && new Date(e.timestamp) <= period.end
  );

  // Basic metrics
  const successCount = filteredEvents.filter((e) => e.status === 'ok').length;
  const failureCount = filteredEvents.filter((e) => e.status === 'fail').length;
  const totalEvents = filteredEvents.length;
  const successRate = totalEvents > 0 ? successCount / totalEvents : 0;

  // MCP metrics
  const mcpEvents = new Map<string, ObservabilityEvent[]>();
  for (const event of filteredEvents) {
    if (event.mcpName) {
      const list = mcpEvents.get(event.mcpName) || [];
      list.push(event);
      mcpEvents.set(event.mcpName, list);
    }
  }

  const mcpMetrics: McpMetrics[] = [];
  for (const [name, events] of mcpEvents.entries()) {
    const failures = events.filter((e) => e.status === 'fail').length;
    const durations = events.filter((e) => e.durationMs !== undefined).map((e) => e.durationMs!);
    const circuitOpenEvents = events.filter(
      (e) => e.metadata && (e.metadata as Record<string, unknown>).circuit === 'open'
    );

    mcpMetrics.push({
      name,
      callCount: events.length,
      failureCount: failures,
      failureRate: events.length > 0 ? failures / events.length : 0,
      avgDurationMs: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      p95DurationMs: percentile(durations, 95),
      circuitOpenCount: circuitOpenEvents.length,
    });
  }

  // Top errors
  const errorCounts = new Map<string, number>();
  for (const event of filteredEvents) {
    if (event.status === 'fail' && event.errorType) {
      errorCounts.set(event.errorType, (errorCounts.get(event.errorType) || 0) + 1);
    }
  }
  const topErrors = [...errorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  // Top skills
  const skillCounts = new Map<string, number>();
  for (const event of filteredEvents) {
    if (event.type === 'skill_run' && event.skillName) {
      skillCounts.set(event.skillName, (skillCounts.get(event.skillName) || 0) + 1);
    }
  }
  const topSkills = [...skillCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Top tools
  const toolCounts = new Map<string, number>();
  for (const event of filteredEvents) {
    if (event.toolName) {
      toolCounts.set(event.toolName, (toolCounts.get(event.toolName) || 0) + 1);
    }
  }
  const topTools = [...toolCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Circuit summary
  const circuitSummary = getCircuitSummary();

  // Generate recommendations
  const recommendations: string[] = [];
  if (successRate < 0.95) {
    recommendations.push('成功率が95%未満です。エラーログを確認してください。');
  }
  if (topErrors.length > 0 && topErrors[0].count > 10) {
    recommendations.push(`最頻出エラー「${topErrors[0].type}」(${topErrors[0].count}件)の調査を推奨。`);
  }
  if (circuitSummary.open > 0) {
    recommendations.push(`${circuitSummary.open}個のMCPがCircuit Openです。復旧を確認してください。`);
  }
  for (const mcp of mcpMetrics) {
    if (mcp.p95DurationMs > 5000) {
      recommendations.push(`${mcp.name}のp95レイテンシが${Math.round(mcp.p95DurationMs)}msです。パフォーマンス改善を検討。`);
    }
  }

  return {
    period,
    totalEvents,
    successRate,
    failureCount,
    mcpMetrics,
    topErrors,
    topSkills,
    topTools,
    circuitSummary,
    recommendations: recommendations.slice(0, 3),
  };
}

/**
 * Format report as Markdown
 */
export function formatReportMarkdown(data: ReportData): string {
  const lines: string[] = [];

  lines.push(`# Observability Report: ${data.period.label}`);
  lines.push('');
  lines.push(`**期間:** ${data.period.start.toISOString()} 〜 ${data.period.end.toISOString()}`);
  lines.push('');

  // Summary
  lines.push('## サマリー');
  lines.push('');
  lines.push(`| 項目 | 値 |`);
  lines.push(`|------|-----|`);
  lines.push(`| 総イベント数 | ${data.totalEvents} |`);
  lines.push(`| 成功率 | ${(data.successRate * 100).toFixed(1)}% |`);
  lines.push(`| 失敗数 | ${data.failureCount} |`);
  lines.push('');

  // MCP metrics
  if (data.mcpMetrics.length > 0) {
    lines.push('## 内部MCP別メトリクス');
    lines.push('');
    lines.push('| MCP | 呼出数 | 失敗率 | 平均 | p95 | Circuit Open |');
    lines.push('|-----|--------|--------|------|-----|--------------|');
    for (const mcp of data.mcpMetrics) {
      lines.push(
        `| ${mcp.name} | ${mcp.callCount} | ${(mcp.failureRate * 100).toFixed(1)}% | ${Math.round(mcp.avgDurationMs)}ms | ${Math.round(mcp.p95DurationMs)}ms | ${mcp.circuitOpenCount} |`
      );
    }
    lines.push('');
  }

  // Top errors
  if (data.topErrors.length > 0) {
    lines.push('## 失敗理由トップ');
    lines.push('');
    for (const error of data.topErrors) {
      lines.push(`- **${error.type}**: ${error.count}件`);
    }
    lines.push('');
  }

  // Top skills
  if (data.topSkills.length > 0) {
    lines.push('## 上位スキル');
    lines.push('');
    for (const skill of data.topSkills) {
      lines.push(`- ${skill.name}: ${skill.count}件`);
    }
    lines.push('');
  }

  // Circuit summary
  lines.push('## Circuit Breaker状態');
  lines.push('');
  lines.push(`- Closed: ${data.circuitSummary.closed}`);
  lines.push(`- Open: ${data.circuitSummary.open}`);
  lines.push(`- Half-Open: ${data.circuitSummary.halfOpen}`);
  lines.push('');

  // Recommendations
  if (data.recommendations.length > 0) {
    lines.push('## 改善提案');
    lines.push('');
    for (const rec of data.recommendations) {
      lines.push(`- ${rec}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push(`_Generated at ${new Date().toISOString()}_`);

  return lines.join('\n');
}

/**
 * Get report period for 24 hours
 */
export function getLast24hPeriod(): ReportPeriod {
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return { start, end, label: 'Daily (24h)' };
}

/**
 * Get report period for 7 days
 */
export function getLast7dPeriod(): ReportPeriod {
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { start, end, label: 'Weekly (7d)' };
}
