/**
 * Observability Report Unit Tests - P6
 */

import {
  generateReport,
  formatReportMarkdown,
  getLast24hPeriod,
  getLast7dPeriod,
  ReportData,
} from '../../src/proxy-mcp/observability/report';

describe('Observability Report', () => {
  describe('getLast24hPeriod', () => {
    it('should return 24h period', () => {
      const period = getLast24hPeriod();

      expect(period.label).toBe('Daily (24h)');
      expect(period.end.getTime() - period.start.getTime()).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('getLast7dPeriod', () => {
    it('should return 7d period', () => {
      const period = getLast7dPeriod();

      expect(period.label).toBe('Weekly (7d)');
      expect(period.end.getTime() - period.start.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });

  describe('generateReport', () => {
    it('should generate valid report structure', () => {
      const period = getLast24hPeriod();
      const report = generateReport(period);

      expect(report.period).toBe(period);
      expect(typeof report.totalEvents).toBe('number');
      expect(typeof report.successRate).toBe('number');
      expect(typeof report.failureCount).toBe('number');
      expect(Array.isArray(report.mcpMetrics)).toBe(true);
      expect(Array.isArray(report.topErrors)).toBe(true);
      expect(Array.isArray(report.topSkills)).toBe(true);
      expect(Array.isArray(report.topTools)).toBe(true);
      expect(report.circuitSummary).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should calculate success rate correctly', () => {
      const period = getLast24hPeriod();
      const report = generateReport(period);

      // Success rate should be between 0 and 1
      expect(report.successRate).toBeGreaterThanOrEqual(0);
      expect(report.successRate).toBeLessThanOrEqual(1);
    });
  });

  describe('formatReportMarkdown', () => {
    it('should format report as markdown', () => {
      const mockData: ReportData = {
        period: {
          start: new Date('2024-01-01T00:00:00Z'),
          end: new Date('2024-01-02T00:00:00Z'),
          label: 'Daily (24h)',
        },
        totalEvents: 100,
        successRate: 0.95,
        failureCount: 5,
        mcpMetrics: [
          {
            name: 'github',
            callCount: 50,
            failureCount: 2,
            failureRate: 0.04,
            avgDurationMs: 200,
            p95DurationMs: 500,
            circuitOpenCount: 0,
          },
        ],
        topErrors: [{ type: 'timeout', count: 3 }],
        topSkills: [{ name: 'commit', count: 20 }],
        topTools: [{ name: 'system_health', count: 30 }],
        circuitSummary: { total: 4, closed: 4, open: 0, halfOpen: 0 },
        recommendations: ['All systems operational'],
      };

      const markdown = formatReportMarkdown(mockData);

      expect(markdown).toContain('# Observability Report: Daily (24h)');
      expect(markdown).toContain('## サマリー');
      expect(markdown).toContain('95.0%');
      expect(markdown).toContain('## 内部MCP別メトリクス');
      expect(markdown).toContain('github');
      expect(markdown).toContain('## 失敗理由トップ');
      expect(markdown).toContain('timeout');
      expect(markdown).toContain('## 上位スキル');
      expect(markdown).toContain('commit');
      expect(markdown).toContain('## Circuit Breaker状態');
      expect(markdown).toContain('## 改善提案');
    });

    it('should include recommendations when success rate is low', () => {
      const mockData: ReportData = {
        period: getLast24hPeriod(),
        totalEvents: 100,
        successRate: 0.9,
        failureCount: 10,
        mcpMetrics: [],
        topErrors: [{ type: 'connection_error', count: 15 }],
        topSkills: [],
        topTools: [],
        circuitSummary: { total: 0, closed: 0, open: 0, halfOpen: 0 },
        recommendations: ['成功率が95%未満です。エラーログを確認してください。'],
      };

      const markdown = formatReportMarkdown(mockData);

      expect(markdown).toContain('成功率が95%未満');
    });
  });
});
