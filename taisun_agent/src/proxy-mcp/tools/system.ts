/**
 * System Tools - Health check and system status
 *
 * P6: Enhanced with circuit breaker, rollout status, and recommendations
 */

import { ToolResult } from '../types';
import { getRecentEventsSummary, generateReport, getLast24hPeriod } from '../observability';
import { getEnabledMcps, getAllMcps, getRolloutSummary } from '../internal/registry';
import { getCircuitSummary, getAllCircuitStates } from '../internal/circuit-breaker';

const startTime = Date.now();

export function systemHealth(): ToolResult {
  const uptime = Date.now() - startTime;

  // Get MCP status
  const allMcps = getAllMcps();
  const enabledMcps = getEnabledMcps();

  // Get rollout status
  const rolloutSummary = getRolloutSummary();

  // Get circuit breaker status
  const circuitSummary = getCircuitSummary();
  const circuitStates = getAllCircuitStates();

  // Get observability metrics
  let metrics;
  try {
    metrics = getRecentEventsSummary(100);
  } catch {
    metrics = null;
  }

  // Get recommendations from recent report
  let recommendations: string[] = [];
  try {
    const period = getLast24hPeriod();
    const report = generateReport(period);
    recommendations = report.recommendations;
  } catch {
    // Ignore report generation errors
  }

  // Determine overall health status
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  const issues: string[] = [];

  // Check circuit breaker status
  if (circuitSummary.open > 0) {
    status = 'degraded';
    issues.push(`${circuitSummary.open} MCP(s) circuit open`);
  }

  // Check success rate (only if there are events to evaluate)
  const totalEvents = metrics?.last24h?.successCount + metrics?.last24h?.failureCount || 0;
  if (totalEvents > 0) {
    if (metrics && metrics.last24h.successRate < 0.9) {
      status = 'unhealthy';
      issues.push(`Low success rate: ${Math.round(metrics.last24h.successRate * 100)}%`);
    } else if (metrics && metrics.last24h.successRate < 0.95) {
      if (status === 'healthy') status = 'degraded';
      issues.push(`Warning: success rate ${Math.round(metrics.last24h.successRate * 100)}%`);
    }
  }
  // Note: No events (cold start) is not considered unhealthy

  // Build per-MCP status
  const mcpStatus = enabledMcps.map((mcp) => {
    const circuitState = circuitStates.get(mcp.name) || 'closed';
    const rollout = rolloutSummary.mcps.find((r) => r.name === mcp.name);
    return {
      name: mcp.name,
      enabled: true,
      circuit: circuitState,
      rollout: rollout?.mode || 'full',
      canaryPercent: rollout?.canaryPercent,
    };
  });

  return {
    success: true,
    data: {
      status,
      issues: issues.length > 0 ? issues : undefined,
      uptime,
      version: '0.2.0',
      timestamp: new Date().toISOString(),
      mcps: {
        total: allMcps.length,
        enabled: enabledMcps.length,
        status: mcpStatus,
      },
      circuits: {
        total: circuitSummary.total,
        closed: circuitSummary.closed,
        open: circuitSummary.open,
        halfOpen: circuitSummary.halfOpen,
      },
      rollout: {
        overlayActive: rolloutSummary.overlayActive,
        mcps: rolloutSummary.mcps,
      },
      metrics: metrics
        ? {
            totalEvents: metrics.total,
            last24h: {
              success: metrics.last24h.successCount,
              failure: metrics.last24h.failureCount,
              successRate: Math.round(metrics.last24h.successRate * 100) + '%',
              avgDurationMs: metrics.last24h.avgDurationMs,
            },
            topErrors: metrics.topErrors,
          }
        : null,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
    },
  };
}
