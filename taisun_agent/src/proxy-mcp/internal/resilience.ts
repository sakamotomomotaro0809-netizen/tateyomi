/**
 * Resilience Module - Timeout, Retry, and Circuit Breaker Integration
 *
 * Provides fault-tolerant execution for internal MCP calls
 */

import {
  CircuitBreakerConfig,
  DEFAULT_CIRCUIT_CONFIG,
  isCallAllowed,
  recordSuccess,
  recordFailure,
} from './circuit-breaker';
import { recordEvent, startTimer } from '../observability';

/**
 * Timeout configuration
 */
export interface TimeoutConfig {
  spawnMs: number;
  toolCallMs: number;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  backoffMs: number;
  jitter: boolean;
}

/**
 * Full resilience configuration
 */
export interface ResilienceConfig {
  timeout: TimeoutConfig;
  retry: RetryConfig;
  circuit: CircuitBreakerConfig;
}

export const DEFAULT_RESILIENCE_CONFIG: ResilienceConfig = {
  timeout: {
    spawnMs: 5000,
    toolCallMs: 15000,
  },
  retry: {
    maxAttempts: 2,
    backoffMs: 250,
    jitter: true,
  },
  circuit: DEFAULT_CIRCUIT_CONFIG,
};

/**
 * Error class for resilience failures
 */
export class ResilienceError extends Error {
  constructor(
    message: string,
    public readonly type: 'timeout' | 'circuit_open' | 'max_retries' | 'execution',
    public readonly mcpName: string,
    public readonly attempts: number = 0
  ) {
    super(message);
    this.name = 'ResilienceError';
  }
}

/**
 * Calculate delay with optional jitter
 */
function calculateDelay(baseMs: number, attempt: number, jitter: boolean): number {
  // Exponential backoff
  const delay = baseMs * Math.pow(2, attempt);

  if (jitter) {
    // Add random jitter (0-50% of delay)
    return delay + Math.random() * delay * 0.5;
  }

  return delay;
}

/**
 * Create a timeout promise
 */
function createTimeout<T>(ms: number, message: string): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

/**
 * Execute a function with timeout
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  label: string = 'operation'
): Promise<T> {
  return Promise.race([fn(), createTimeout<T>(timeoutMs, `${label} timed out after ${timeoutMs}ms`)]);
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
  mcpName: string
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < config.maxAttempts - 1) {
        const delay = calculateDelay(config.backoffMs, attempt, config.jitter);
        await new Promise((resolve) => setTimeout(resolve, delay));

        recordEvent('internal_mcp_tool_call', mcpName, 'ok', {
          metadata: { retry: true, attempt: attempt + 1 },
        });
      }
    }
  }

  throw new ResilienceError(
    `Max retries (${config.maxAttempts}) exceeded: ${lastError?.message}`,
    'max_retries',
    mcpName,
    config.maxAttempts
  );
}

/**
 * Execute an internal MCP call with full resilience (timeout, retry, circuit breaker)
 */
export async function executeWithResilience<T>(
  mcpName: string,
  runId: string,
  fn: () => Promise<T>,
  config: ResilienceConfig = DEFAULT_RESILIENCE_CONFIG
): Promise<T> {
  const endTimer = startTimer('internal_mcp_tool_call', runId, { mcpName });

  // Check circuit breaker first
  if (!isCallAllowed(mcpName, config.circuit)) {
    endTimer('fail', { errorType: 'circuit_open' });
    throw new ResilienceError(
      `Circuit breaker is open for ${mcpName}`,
      'circuit_open',
      mcpName
    );
  }

  try {
    // Execute with timeout and retry
    const result = await withRetry(
      () => withTimeout(fn, config.timeout.toolCallMs, `${mcpName} call`),
      config.retry,
      mcpName
    );

    // Record success
    recordSuccess(mcpName, config.circuit);
    endTimer('ok');

    return result;
  } catch (error) {
    // Record failure
    recordFailure(mcpName, config.circuit);

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorType = error instanceof ResilienceError ? error.type : 'execution';

    endTimer('fail', { errorType, errorMessage });

    if (error instanceof ResilienceError) {
      throw error;
    }

    throw new ResilienceError(errorMessage, errorType, mcpName);
  }
}

/**
 * Get resilience config for a specific MCP (can be overridden in internal-mcps.json)
 */
export function getResilienceConfig(
  mcpConfig: { resilience?: Partial<ResilienceConfig> } | undefined
): ResilienceConfig {
  if (!mcpConfig?.resilience) {
    return DEFAULT_RESILIENCE_CONFIG;
  }

  return {
    timeout: {
      ...DEFAULT_RESILIENCE_CONFIG.timeout,
      ...mcpConfig.resilience.timeout,
    },
    retry: {
      ...DEFAULT_RESILIENCE_CONFIG.retry,
      ...mcpConfig.resilience.retry,
    },
    circuit: {
      ...DEFAULT_RESILIENCE_CONFIG.circuit,
      ...mcpConfig.resilience.circuit,
    },
  };
}
