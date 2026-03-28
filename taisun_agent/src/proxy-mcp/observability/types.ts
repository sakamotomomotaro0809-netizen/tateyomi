/**
 * Observability Types - P5
 *
 * Types for event tracking, metrics, and monitoring
 */

/**
 * Event types for observability
 */
export type EventType =
  | 'skill_run'
  | 'router_route'
  | 'internal_mcp_start'
  | 'internal_mcp_tool_call'
  | 'supervisor_pause'
  | 'supervisor_resume'
  | 'supervisor_step'
  | 'memory_add'
  | 'memory_search'
  | 'url_bundle_normalize'
  | 'pipeline_tabs_skillize'
  | 'error'
  // Context Budget Monitor events
  | 'context_budget_init'
  | 'context_budget_warning'
  | 'context_budget_critical'
  | 'context_budget_emergency'
  | 'context_budget_compaction'
  | 'context_operation';

/**
 * Event status
 */
export type EventStatus = 'ok' | 'fail';

/**
 * Observability event
 */
export interface ObservabilityEvent {
  timestamp: string;
  type: EventType;
  runId: string;
  status: EventStatus;
  durationMs?: number;
  skillName?: string;
  mcpName?: string;
  toolName?: string;
  errorType?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Metrics summary
 */
export interface MetricsSummary {
  totalEvents: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgDurationMs: number;
  failuresByType: Record<string, number>;
  eventsByType: Record<EventType, number>;
  lastUpdated: string;
}

/**
 * Event filter options
 */
export interface EventFilter {
  type?: EventType;
  runId?: string;
  status?: EventStatus;
  since?: string;
  limit?: number;
}
