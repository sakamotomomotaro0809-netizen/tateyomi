/**
 * Observability Module - P5
 *
 * Event tracking, metrics collection, and monitoring
 */

export {
  recordEvent,
  startTimer,
  getEvents,
  getMetricsSummary,
  clearEvents,
  getRecentEventsSummary,
} from './service';

export type {
  ObservabilityEvent,
  EventType,
  EventStatus,
  MetricsSummary,
  EventFilter,
} from './types';

export {
  generateReport,
  formatReportMarkdown,
  getLast24hPeriod,
  getLast7dPeriod,
} from './report';

export type { ReportData, ReportPeriod, McpMetrics } from './report';

export { postReportToIssue, createReportIssue } from './post-to-issue';
