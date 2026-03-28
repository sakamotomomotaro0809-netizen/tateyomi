/**
 * Circuit Breaker Implementation
 *
 * States:
 * - CLOSED: Normal operation, calls go through
 * - OPEN: Failures exceeded threshold, calls fail fast
 * - HALF_OPEN: Testing if service recovered
 */

import { recordEvent } from '../observability';

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  cooldownMs: number;
  halfOpenMaxCalls: number;
  successThreshold: number;
}

export const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  enabled: true,
  failureThreshold: 5,
  cooldownMs: 60000,
  halfOpenMaxCalls: 2,
  successThreshold: 2,
};

interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number;
  halfOpenCalls: number;
  halfOpenSuccesses: number;
}

const circuits: Map<string, CircuitStats> = new Map();

/**
 * Get or create circuit stats for an MCP
 */
function getCircuitStats(mcpName: string): CircuitStats {
  let stats = circuits.get(mcpName);
  if (!stats) {
    stats = {
      state: 'closed',
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      halfOpenCalls: 0,
      halfOpenSuccesses: 0,
    };
    circuits.set(mcpName, stats);
  }
  return stats;
}

/**
 * Check if a call is allowed through the circuit breaker
 */
export function isCallAllowed(mcpName: string, config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG): boolean {
  if (!config.enabled) {
    return true;
  }

  const stats = getCircuitStats(mcpName);

  switch (stats.state) {
    case 'closed':
      return true;

    case 'open': {
      // Check if cooldown has passed
      const now = Date.now();
      if (now - stats.lastFailureTime >= config.cooldownMs) {
        // Transition to half-open
        stats.state = 'half-open';
        stats.halfOpenCalls = 0;
        stats.halfOpenSuccesses = 0;
        recordEvent('internal_mcp_tool_call', `circuit-${mcpName}`, 'ok', {
          metadata: { circuit: 'half-open', mcp: mcpName },
        });
        return true;
      }
      return false;
    }

    case 'half-open': {
      // Allow limited calls in half-open state
      if (stats.halfOpenCalls < config.halfOpenMaxCalls) {
        return true;
      }
      return false;
    }

    default:
      return true;
  }
}

/**
 * Record a successful call
 */
export function recordSuccess(mcpName: string, config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG): void {
  if (!config.enabled) return;

  const stats = getCircuitStats(mcpName);

  switch (stats.state) {
    case 'closed':
      stats.successes++;
      // Reset failure count on success
      stats.failures = 0;
      break;

    case 'half-open':
      stats.halfOpenCalls++;
      stats.halfOpenSuccesses++;
      // Check if we've had enough successes to close
      if (stats.halfOpenSuccesses >= config.successThreshold) {
        stats.state = 'closed';
        stats.failures = 0;
        stats.successes = 0;
        recordEvent('internal_mcp_tool_call', `circuit-${mcpName}`, 'ok', {
          metadata: { circuit: 'closed', mcp: mcpName },
        });
      }
      break;

    case 'open':
      // Shouldn't happen, but handle it
      break;
  }
}

/**
 * Record a failed call
 */
export function recordFailure(mcpName: string, config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG): void {
  if (!config.enabled) return;

  const stats = getCircuitStats(mcpName);
  const now = Date.now();

  switch (stats.state) {
    case 'closed':
      stats.failures++;
      stats.lastFailureTime = now;
      // Check if we've exceeded the threshold
      if (stats.failures >= config.failureThreshold) {
        stats.state = 'open';
        recordEvent('internal_mcp_tool_call', `circuit-${mcpName}`, 'fail', {
          metadata: { circuit: 'open', mcp: mcpName, failures: stats.failures },
        });
      }
      break;

    case 'half-open':
      // Any failure in half-open goes back to open
      stats.state = 'open';
      stats.lastFailureTime = now;
      stats.halfOpenCalls = 0;
      stats.halfOpenSuccesses = 0;
      recordEvent('internal_mcp_tool_call', `circuit-${mcpName}`, 'fail', {
        metadata: { circuit: 'open', mcp: mcpName, reason: 'half-open failure' },
      });
      break;

    case 'open':
      // Already open, just update last failure time
      stats.lastFailureTime = now;
      break;
  }
}

/**
 * Get current circuit state
 */
export function getCircuitState(mcpName: string): CircuitState {
  const stats = getCircuitStats(mcpName);
  return stats.state;
}

/**
 * Get all circuit states for monitoring
 */
export function getAllCircuitStates(): Map<string, CircuitState> {
  const result = new Map<string, CircuitState>();
  for (const [name, stats] of circuits.entries()) {
    result.set(name, stats.state);
  }
  return result;
}

/**
 * Get circuit stats summary
 */
export function getCircuitSummary(): {
  total: number;
  closed: number;
  open: number;
  halfOpen: number;
} {
  let closed = 0;
  let open = 0;
  let halfOpen = 0;

  for (const stats of circuits.values()) {
    switch (stats.state) {
      case 'closed':
        closed++;
        break;
      case 'open':
        open++;
        break;
      case 'half-open':
        halfOpen++;
        break;
    }
  }

  return {
    total: circuits.size,
    closed,
    open,
    halfOpen,
  };
}

/**
 * Reset circuit breaker (for testing)
 */
export function resetCircuit(mcpName: string): void {
  circuits.delete(mcpName);
}

/**
 * Reset all circuits (for testing)
 */
export function resetAllCircuits(): void {
  circuits.clear();
}
