/**
 * Context Budget Monitor
 *
 * Based on Anthropic's best practice for preventing context exhaustion:
 * "Monitor token usage proactively to avoid context window overflow"
 *
 * Features:
 * - Token estimation per operation type
 * - Cumulative usage tracking
 * - Multi-threshold warnings (60%, 80%, 90%, 95%)
 * - Automatic compaction recommendations
 * - Integration with self-healing coordinator
 *
 * @see https://www.anthropic.com/engineering/claude-code-best-practices
 */

import { recordEvent, startTimer } from './service';

// Claude context window sizes (approximate)
export const CONTEXT_LIMITS = {
  claude_3_5_sonnet: 200_000,
  claude_3_opus: 200_000,
  claude_opus_4_5: 200_000,
  default: 200_000,
} as const;

// Token estimation multipliers (characters to tokens)
const CHAR_TO_TOKEN_RATIO = 0.25; // ~4 characters per token on average

// Operation token estimates (conservative)
export const OPERATION_TOKEN_ESTIMATES = {
  // File operations
  file_read_small: 500,      // < 100 lines
  file_read_medium: 2000,    // 100-500 lines
  file_read_large: 8000,     // 500-2000 lines
  file_read_huge: 20000,     // > 2000 lines
  file_write: 200,           // Response overhead
  file_edit: 300,            // Response overhead

  // Search operations
  glob_search: 300,          // File list
  grep_search_small: 500,    // Few matches
  grep_search_large: 3000,   // Many matches

  // Shell operations
  bash_simple: 200,          // Short output
  bash_medium: 1000,         // Moderate output
  bash_large: 5000,          // Large output (truncated)

  // Agent operations
  task_spawn: 1000,          // Task prompt
  task_result_small: 2000,   // Simple result
  task_result_large: 10000,  // Comprehensive result

  // User interaction
  user_message_avg: 500,
  assistant_response_avg: 1500,

  // System overhead
  system_prompt: 5000,       // CLAUDE.md, settings, etc.
  tool_definition: 100,      // Per tool
  mcp_server_overhead: 200,  // Per MCP server
} as const;

// Warning thresholds
export const BUDGET_THRESHOLDS = {
  info: 0.60,      // 60% - Start monitoring closely
  warning: 0.80,   // 80% - Consider compaction
  critical: 0.90,  // 90% - Strongly recommend compaction
  emergency: 0.95, // 95% - Must compact immediately
} as const;

export type BudgetLevel = 'ok' | 'info' | 'warning' | 'critical' | 'emergency';

export interface ContextBudgetState {
  sessionId: string;
  modelId: string;
  contextLimit: number;
  estimatedUsed: number;
  estimatedRemaining: number;
  usagePercent: number;
  level: BudgetLevel;
  operationCount: number;
  lastUpdated: string;
  history: ContextOperation[];
}

export interface ContextOperation {
  timestamp: string;
  type: keyof typeof OPERATION_TOKEN_ESTIMATES | 'custom';
  estimatedTokens: number;
  description?: string;
}

export interface BudgetWarning {
  level: BudgetLevel;
  message: string;
  recommendations: string[];
  estimatedSavings?: number;
}

// Session state
let currentSession: ContextBudgetState | null = null;
const MAX_HISTORY_ENTRIES = 100;

/**
 * Initialize a new context budget session
 */
export function initContextBudget(
  sessionId: string,
  modelId: string = 'default'
): ContextBudgetState {
  const contextLimit = CONTEXT_LIMITS[modelId as keyof typeof CONTEXT_LIMITS]
    || CONTEXT_LIMITS.default;

  // Initial system overhead
  const systemOverhead =
    OPERATION_TOKEN_ESTIMATES.system_prompt +
    OPERATION_TOKEN_ESTIMATES.tool_definition * 30 + // ~30 tools
    OPERATION_TOKEN_ESTIMATES.mcp_server_overhead * 10; // ~10 MCP servers

  currentSession = {
    sessionId,
    modelId,
    contextLimit,
    estimatedUsed: systemOverhead,
    estimatedRemaining: contextLimit - systemOverhead,
    usagePercent: systemOverhead / contextLimit,
    level: 'ok',
    operationCount: 0,
    lastUpdated: new Date().toISOString(),
    history: [{
      timestamp: new Date().toISOString(),
      type: 'custom',
      estimatedTokens: systemOverhead,
      description: 'System initialization overhead',
    }],
  };

  recordEvent('context_budget_init', sessionId, 'ok', {
    metadata: {
      modelId,
      contextLimit,
      systemOverhead,
    },
  });

  return currentSession;
}

/**
 * Record a context-consuming operation
 */
export function recordContextUsage(
  operationType: keyof typeof OPERATION_TOKEN_ESTIMATES | 'custom',
  customTokens?: number,
  description?: string
): BudgetWarning | null {
  if (!currentSession) {
    currentSession = initContextBudget(`auto-${Date.now()}`, 'default');
  }

  const tokens = operationType === 'custom'
    ? (customTokens || 0)
    : OPERATION_TOKEN_ESTIMATES[operationType];

  // Update state
  currentSession.estimatedUsed += tokens;
  currentSession.estimatedRemaining = currentSession.contextLimit - currentSession.estimatedUsed;
  currentSession.usagePercent = currentSession.estimatedUsed / currentSession.contextLimit;
  currentSession.operationCount++;
  currentSession.lastUpdated = new Date().toISOString();

  // Add to history
  currentSession.history.push({
    timestamp: new Date().toISOString(),
    type: operationType,
    estimatedTokens: tokens,
    description,
  });

  // Trim history if needed
  if (currentSession.history.length > MAX_HISTORY_ENTRIES) {
    currentSession.history = currentSession.history.slice(-MAX_HISTORY_ENTRIES);
  }

  // Determine level
  currentSession.level = getBudgetLevel(currentSession.usagePercent);

  // Generate warning if needed
  return checkBudgetWarning(currentSession);
}

/**
 * Estimate tokens from content length
 */
export function estimateTokens(content: string): number {
  return Math.ceil(content.length * CHAR_TO_TOKEN_RATIO);
}

/**
 * Estimate file read tokens based on line count
 */
export function estimateFileReadTokens(lineCount: number): number {
  if (lineCount < 100) return OPERATION_TOKEN_ESTIMATES.file_read_small;
  if (lineCount < 500) return OPERATION_TOKEN_ESTIMATES.file_read_medium;
  if (lineCount < 2000) return OPERATION_TOKEN_ESTIMATES.file_read_large;
  return OPERATION_TOKEN_ESTIMATES.file_read_huge;
}

/**
 * Get current budget level from usage percentage
 */
export function getBudgetLevel(usagePercent: number): BudgetLevel {
  if (usagePercent >= BUDGET_THRESHOLDS.emergency) return 'emergency';
  if (usagePercent >= BUDGET_THRESHOLDS.critical) return 'critical';
  if (usagePercent >= BUDGET_THRESHOLDS.warning) return 'warning';
  if (usagePercent >= BUDGET_THRESHOLDS.info) return 'info';
  return 'ok';
}

/**
 * Check if budget warning should be issued
 */
export function checkBudgetWarning(state: ContextBudgetState): BudgetWarning | null {
  const { level, usagePercent, estimatedRemaining } = state;

  if (level === 'ok') return null;

  const percentUsed = Math.round(usagePercent * 100);
  const remainingK = Math.round(estimatedRemaining / 1000);

  const baseRecommendations = [
    'Run /compact to summarize conversation history',
    'Use partial file reads (offset, limit) instead of full reads',
    'Suppress verbose output with > /dev/null 2>&1',
    'Use grep to extract only relevant lines from logs',
  ];

  switch (level) {
    case 'info':
      return {
        level,
        message: `Context usage at ${percentUsed}% (~${remainingK}K tokens remaining)`,
        recommendations: [
          'Consider planning for compaction soon',
          ...baseRecommendations.slice(1, 2),
        ],
      };

    case 'warning':
      recordEvent('context_budget_warning', state.sessionId, 'ok', {
        metadata: { level, percentUsed, estimatedRemaining },
      });
      return {
        level,
        message: `Context usage at ${percentUsed}% - Consider compaction (~${remainingK}K tokens remaining)`,
        recommendations: baseRecommendations.slice(0, 3),
        estimatedSavings: Math.round(state.estimatedUsed * 0.5),
      };

    case 'critical':
      recordEvent('context_budget_critical', state.sessionId, 'ok', {
        metadata: { level, percentUsed, estimatedRemaining },
      });
      return {
        level,
        message: `Context usage at ${percentUsed}% - Compaction strongly recommended (~${remainingK}K tokens remaining)`,
        recommendations: [
          '** STRONGLY RECOMMENDED: Run /compact now **',
          ...baseRecommendations,
          'Start a new session for large tasks',
        ],
        estimatedSavings: Math.round(state.estimatedUsed * 0.6),
      };

    case 'emergency':
      recordEvent('context_budget_emergency', state.sessionId, 'fail', {
        metadata: { level, percentUsed, estimatedRemaining },
        errorType: 'CONTEXT_EXHAUSTION_IMMINENT',
        errorMessage: `Only ${remainingK}K tokens remaining`,
      });
      return {
        level,
        message: `CRITICAL: Context at ${percentUsed}% - Immediate action required (~${remainingK}K tokens remaining)`,
        recommendations: [
          '*** URGENT: Run /compact immediately ***',
          'Stop reading large files',
          'Minimize tool output',
          'Consider starting a new session',
          'Save current progress before context exhaustion',
        ],
        estimatedSavings: Math.round(state.estimatedUsed * 0.7),
      };
  }

  return null;
}

/**
 * Get current context budget state
 */
export function getContextBudget(): ContextBudgetState | null {
  return currentSession;
}

/**
 * Get budget summary for display
 */
export function getBudgetSummary(): string {
  if (!currentSession) {
    return 'No active context budget session';
  }

  const { level, usagePercent, estimatedUsed, estimatedRemaining, operationCount } = currentSession;
  const percentUsed = Math.round(usagePercent * 100);
  const usedK = Math.round(estimatedUsed / 1000);
  const remainingK = Math.round(estimatedRemaining / 1000);

  const levelIndicator = {
    ok: '🟢',
    info: '🔵',
    warning: '🟡',
    critical: '🟠',
    emergency: '🔴',
  }[level];

  return `${levelIndicator} Context: ${percentUsed}% used (${usedK}K / ${currentSession.contextLimit / 1000}K tokens) | ${remainingK}K remaining | ${operationCount} operations`;
}

/**
 * Simulate compaction (reduce tracked usage)
 */
export function simulateCompaction(reductionPercent: number = 50): void {
  if (!currentSession) return;

  const reduction = currentSession.estimatedUsed * (reductionPercent / 100);
  currentSession.estimatedUsed -= reduction;
  currentSession.estimatedRemaining = currentSession.contextLimit - currentSession.estimatedUsed;
  currentSession.usagePercent = currentSession.estimatedUsed / currentSession.contextLimit;
  currentSession.level = getBudgetLevel(currentSession.usagePercent);
  currentSession.lastUpdated = new Date().toISOString();

  // Add compaction to history
  currentSession.history.push({
    timestamp: new Date().toISOString(),
    type: 'custom',
    estimatedTokens: -reduction,
    description: `Compaction (${reductionPercent}% reduction)`,
  });

  recordEvent('context_budget_compaction', currentSession.sessionId, 'ok', {
    metadata: {
      reductionPercent,
      tokensReclaimed: reduction,
      newUsagePercent: Math.round(currentSession.usagePercent * 100),
    },
  });
}

/**
 * Get top context consumers
 */
export function getTopConsumers(limit: number = 10): Array<{
  type: string;
  totalTokens: number;
  count: number;
  avgTokens: number;
}> {
  if (!currentSession) return [];

  const consumers: Record<string, { total: number; count: number }> = {};

  currentSession.history.forEach((op) => {
    if (op.estimatedTokens > 0) {
      if (!consumers[op.type]) {
        consumers[op.type] = { total: 0, count: 0 };
      }
      consumers[op.type].total += op.estimatedTokens;
      consumers[op.type].count++;
    }
  });

  return Object.entries(consumers)
    .map(([type, data]) => ({
      type,
      totalTokens: data.total,
      count: data.count,
      avgTokens: Math.round(data.total / data.count),
    }))
    .sort((a, b) => b.totalTokens - a.totalTokens)
    .slice(0, limit);
}

/**
 * Reset session (for testing)
 */
export function resetContextBudget(): void {
  currentSession = null;
}

/**
 * Context-aware operation wrapper
 */
export async function withContextTracking<T>(
  operationType: keyof typeof OPERATION_TOKEN_ESTIMATES,
  operation: () => Promise<T>,
  description?: string
): Promise<{ result: T; warning: BudgetWarning | null }> {
  const endTimer = startTimer('context_operation', currentSession?.sessionId || 'unknown', {
    metadata: { operationType },
  });

  try {
    const result = await operation();
    const warning = recordContextUsage(operationType, undefined, description);
    endTimer('ok');
    return { result, warning };
  } catch (error) {
    endTimer('fail', {
      errorType: 'CONTEXT_OPERATION_FAILED',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// Export types for event recording
export type ContextEventType =
  | 'context_budget_init'
  | 'context_budget_warning'
  | 'context_budget_critical'
  | 'context_budget_emergency'
  | 'context_budget_compaction'
  | 'context_operation';
