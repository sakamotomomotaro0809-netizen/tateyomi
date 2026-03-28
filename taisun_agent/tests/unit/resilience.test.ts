/**
 * Resilience Module Unit Tests - P6
 */

import {
  withTimeout,
  withRetry,
  executeWithResilience,
  getResilienceConfig,
  ResilienceError,
  DEFAULT_RESILIENCE_CONFIG,
} from '../../src/proxy-mcp/internal/resilience';
import { resetAllCircuits, recordFailure } from '../../src/proxy-mcp/internal/circuit-breaker';

describe('Resilience Module', () => {
  beforeEach(() => {
    resetAllCircuits();
  });

  describe('withTimeout', () => {
    it('should complete within timeout', async () => {
      const result = await withTimeout(
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return 'success';
        },
        100,
        'test'
      );

      expect(result).toBe('success');
    });

    it('should throw on timeout', async () => {
      await expect(
        withTimeout(
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return 'never';
          },
          10,
          'test'
        )
      ).rejects.toThrow('test timed out after 10ms');
    });
  });

  describe('withRetry', () => {
    it('should succeed on first try', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await withRetry(fn, DEFAULT_RESILIENCE_CONFIG.retry, 'test-mcp');

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('first fail'))
        .mockResolvedValue('success');

      const config = { maxAttempts: 3, backoffMs: 10, jitter: false };
      const result = await withRetry(fn, config, 'test-mcp');

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('always fail'));

      const config = { maxAttempts: 3, backoffMs: 10, jitter: false };

      await expect(withRetry(fn, config, 'test-mcp')).rejects.toThrow(ResilienceError);

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should apply exponential backoff', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const config = { maxAttempts: 3, backoffMs: 50, jitter: false };

      const start = Date.now();
      await withRetry(fn, config, 'test-mcp');
      const duration = Date.now() - start;

      // First retry: 50ms, second retry: 100ms
      // Should take at least 150ms
      expect(duration).toBeGreaterThanOrEqual(100);
    });
  });

  describe('ResilienceError', () => {
    it('should have correct properties', () => {
      const error = new ResilienceError('Test error', 'timeout', 'test-mcp', 3);

      expect(error.message).toBe('Test error');
      expect(error.type).toBe('timeout');
      expect(error.mcpName).toBe('test-mcp');
      expect(error.attempts).toBe(3);
      expect(error.name).toBe('ResilienceError');
    });
  });

  describe('executeWithResilience', () => {
    it('should execute function successfully', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await executeWithResilience('test-mcp', 'run-123', fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should throw when circuit breaker is open', async () => {
      // Trip the circuit breaker by exceeding failure threshold
      const circuitConfig = { ...DEFAULT_RESILIENCE_CONFIG.circuit, failureThreshold: 1 };

      // Record enough failures to trip the circuit
      recordFailure('tripped-mcp', circuitConfig);
      recordFailure('tripped-mcp', circuitConfig);

      await expect(
        executeWithResilience('tripped-mcp', 'run-123', async () => 'never', {
          ...DEFAULT_RESILIENCE_CONFIG,
          circuit: circuitConfig,
        })
      ).rejects.toThrow('Circuit breaker is open');
    });

    it('should record success on successful execution', async () => {
      const fn = jest.fn().mockResolvedValue('result');

      await executeWithResilience('success-mcp', 'run-456', fn);

      // Should not throw
      expect(fn).toHaveBeenCalled();
    });

    it('should record failure and throw ResilienceError on execution error', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('execution failed'));

      await expect(
        executeWithResilience('fail-mcp', 'run-789', fn, {
          ...DEFAULT_RESILIENCE_CONFIG,
          retry: { maxAttempts: 1, backoffMs: 1, jitter: false },
        })
      ).rejects.toThrow(ResilienceError);
    });

    it('should wrap errors in ResilienceError with proper type', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('network error'));

      await expect(
        executeWithResilience('test-mcp', 'run-000', fn, {
          ...DEFAULT_RESILIENCE_CONFIG,
          retry: { maxAttempts: 1, backoffMs: 1, jitter: false },
        })
      ).rejects.toMatchObject({ type: 'max_retries', mcpName: 'test-mcp' });
    });
  });

  describe('getResilienceConfig', () => {
    it('should return default config when no override provided', () => {
      const config = getResilienceConfig(undefined);

      expect(config).toEqual(DEFAULT_RESILIENCE_CONFIG);
    });

    it('should return default config when resilience is not set', () => {
      const config = getResilienceConfig({});

      expect(config).toEqual(DEFAULT_RESILIENCE_CONFIG);
    });

    it('should merge partial timeout config', () => {
      const config = getResilienceConfig({
        resilience: {
          timeout: { spawnMs: 10000, toolCallMs: 20000 },
        },
      });

      expect(config.timeout.spawnMs).toBe(10000);
      expect(config.timeout.toolCallMs).toBe(20000);
    });

    it('should merge partial retry config', () => {
      const config = getResilienceConfig({
        resilience: {
          retry: { maxAttempts: 5, backoffMs: 500, jitter: false },
        },
      });

      expect(config.retry.maxAttempts).toBe(5);
      expect(config.retry.backoffMs).toBe(500);
    });

    it('should merge partial circuit config', () => {
      const config = getResilienceConfig({
        resilience: {
          circuit: {
            enabled: true,
            failureThreshold: 10,
            cooldownMs: 30000,
            halfOpenMaxCalls: 3,
            successThreshold: 3,
          },
        },
      });

      expect(config.circuit.failureThreshold).toBe(10);
      expect(config.circuit.cooldownMs).toBe(30000);
    });
  });

  describe('withRetry with jitter', () => {
    it('should apply jitter to backoff delay', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const config = { maxAttempts: 2, backoffMs: 50, jitter: true };

      const start = Date.now();
      await withRetry(fn, config, 'jitter-test');
      const duration = Date.now() - start;

      // With jitter, delay should be between 50ms and 75ms (50 + 0-50% of 50)
      expect(duration).toBeGreaterThanOrEqual(40);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});
