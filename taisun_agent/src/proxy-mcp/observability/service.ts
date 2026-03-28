/**
 * Observability Service - P5
 *
 * Event tracking, metrics collection, and monitoring
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ObservabilityEvent,
  EventType,
  EventStatus,
  MetricsSummary,
  EventFilter,
} from './types';

const EVENTS_DIR = path.join(process.cwd(), '.taisun', 'observability');
const EVENTS_FILE = path.join(EVENTS_DIR, 'events.jsonl');
const MAX_EVENTS_IN_MEMORY = 1000;

// In-memory event buffer
let eventBuffer: ObservabilityEvent[] = [];
let initialized = false;

/**
 * Initialize observability (create directories if needed)
 */
function ensureInitialized(): void {
  if (initialized) return;

  try {
    if (!fs.existsSync(EVENTS_DIR)) {
      fs.mkdirSync(EVENTS_DIR, { recursive: true });
    }
    initialized = true;
  } catch (error) {
    console.error('[observability] Failed to initialize:', error);
  }
}

/**
 * Record an event
 */
export function recordEvent(
  type: EventType,
  runId: string,
  status: EventStatus,
  options: Partial<Omit<ObservabilityEvent, 'timestamp' | 'type' | 'runId' | 'status'>> = {}
): ObservabilityEvent {
  ensureInitialized();

  const event: ObservabilityEvent = {
    timestamp: new Date().toISOString(),
    type,
    runId,
    status,
    ...options,
  };

  // Add to buffer
  eventBuffer.push(event);

  // Trim buffer if too large
  if (eventBuffer.length > MAX_EVENTS_IN_MEMORY) {
    eventBuffer = eventBuffer.slice(-MAX_EVENTS_IN_MEMORY);
  }

  // Persist to file
  try {
    fs.appendFileSync(EVENTS_FILE, JSON.stringify(event) + '\n');
  } catch (error) {
    console.error('[observability] Failed to persist event:', error);
  }

  return event;
}

/**
 * Create event recorder with timing
 */
export function startTimer(
  type: EventType,
  runId: string,
  options: Partial<Omit<ObservabilityEvent, 'timestamp' | 'type' | 'runId' | 'status' | 'durationMs'>> = {}
): (status?: EventStatus, errorInfo?: { errorType?: string; errorMessage?: string }) => ObservabilityEvent {
  const startTime = Date.now();

  return (status: EventStatus = 'ok', errorInfo?: { errorType?: string; errorMessage?: string }) => {
    const durationMs = Date.now() - startTime;
    return recordEvent(type, runId, status, {
      ...options,
      durationMs,
      ...errorInfo,
    });
  };
}

/**
 * Get events matching filter
 */
export function getEvents(filter: EventFilter = {}): ObservabilityEvent[] {
  let events = [...eventBuffer];

  if (filter.type) {
    events = events.filter((e) => e.type === filter.type);
  }

  if (filter.runId) {
    events = events.filter((e) => e.runId === filter.runId);
  }

  if (filter.status) {
    events = events.filter((e) => e.status === filter.status);
  }

  if (filter.since) {
    events = events.filter((e) => e.timestamp >= filter.since!);
  }

  if (filter.limit) {
    events = events.slice(-filter.limit);
  }

  return events;
}

/**
 * Get metrics summary
 */
export function getMetricsSummary(since?: string): MetricsSummary {
  const events = since
    ? eventBuffer.filter((e) => e.timestamp >= since)
    : eventBuffer;

  const successCount = events.filter((e) => e.status === 'ok').length;
  const failureCount = events.filter((e) => e.status === 'fail').length;
  const totalEvents = events.length;

  // Calculate average duration
  const durationsMs = events
    .filter((e) => e.durationMs !== undefined)
    .map((e) => e.durationMs!);
  const avgDurationMs = durationsMs.length > 0
    ? durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length
    : 0;

  // Count failures by type
  const failuresByType: Record<string, number> = {};
  events
    .filter((e) => e.status === 'fail' && e.errorType)
    .forEach((e) => {
      failuresByType[e.errorType!] = (failuresByType[e.errorType!] || 0) + 1;
    });

  // Count events by type
  const eventsByType = {} as Record<EventType, number>;
  events.forEach((e) => {
    eventsByType[e.type] = (eventsByType[e.type] || 0) + 1;
  });

  return {
    totalEvents,
    successCount,
    failureCount,
    successRate: totalEvents > 0 ? successCount / totalEvents : 0,
    avgDurationMs: Math.round(avgDurationMs * 100) / 100,
    failuresByType,
    eventsByType,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Clear event buffer (for testing)
 */
export function clearEvents(): void {
  eventBuffer = [];
}

/**
 * Get recent events summary (for system_health)
 */
export function getRecentEventsSummary(_limit: number = 100): {
  total: number;
  last24h: MetricsSummary;
  topErrors: Array<{ type: string; count: number }>;
} {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const summary = getMetricsSummary(last24h);

  // Get top errors
  const topErrors = Object.entries(summary.failuresByType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  return {
    total: eventBuffer.length,
    last24h: summary,
    topErrors,
  };
}
