/**
 * Circuit Breaker Unit Tests - P6
 */

import {
  isCallAllowed,
  recordSuccess,
  recordFailure,
  getCircuitState,
  getCircuitSummary,
  resetCircuit,
  resetAllCircuits,
  DEFAULT_CIRCUIT_CONFIG,
} from '../../src/proxy-mcp/internal/circuit-breaker';

describe('Circuit Breaker', () => {
  beforeEach(() => {
    resetAllCircuits();
  });

  describe('initial state', () => {
    it('should start in closed state', () => {
      expect(getCircuitState('test-mcp')).toBe('closed');
    });

    it('should allow calls in closed state', () => {
      expect(isCallAllowed('test-mcp')).toBe(true);
    });
  });

  describe('state transitions', () => {
    it('should transition to open after failure threshold', () => {
      const config = { ...DEFAULT_CIRCUIT_CONFIG, failureThreshold: 3 };

      // Record 3 failures
      recordFailure('test-mcp', config);
      recordFailure('test-mcp', config);
      expect(getCircuitState('test-mcp')).toBe('closed');

      recordFailure('test-mcp', config);
      expect(getCircuitState('test-mcp')).toBe('open');
    });

    it('should block calls in open state', () => {
      const config = { ...DEFAULT_CIRCUIT_CONFIG, failureThreshold: 1 };
      recordFailure('test-mcp', config);

      expect(getCircuitState('test-mcp')).toBe('open');
      expect(isCallAllowed('test-mcp', config)).toBe(false);
    });

    it('should reset failure count on success', () => {
      const config = { ...DEFAULT_CIRCUIT_CONFIG, failureThreshold: 3 };

      recordFailure('test-mcp', config);
      recordFailure('test-mcp', config);
      recordSuccess('test-mcp', config);

      // One more failure should not open circuit (counter was reset)
      recordFailure('test-mcp', config);
      expect(getCircuitState('test-mcp')).toBe('closed');
    });
  });

  describe('half-open state', () => {
    it('should transition to half-open after cooldown', async () => {
      const config = {
        ...DEFAULT_CIRCUIT_CONFIG,
        failureThreshold: 1,
        cooldownMs: 10, // Short cooldown for test
      };

      recordFailure('test-mcp', config);
      expect(getCircuitState('test-mcp')).toBe('open');

      // Wait for cooldown
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Check should transition to half-open
      expect(isCallAllowed('test-mcp', config)).toBe(true);
      expect(getCircuitState('test-mcp')).toBe('half-open');
    });

    it('should close after successful calls in half-open', async () => {
      const config = {
        ...DEFAULT_CIRCUIT_CONFIG,
        failureThreshold: 1,
        cooldownMs: 10,
        successThreshold: 2,
      };

      recordFailure('test-mcp', config);
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Transition to half-open
      isCallAllowed('test-mcp', config);
      expect(getCircuitState('test-mcp')).toBe('half-open');

      // Record successes
      recordSuccess('test-mcp', config);
      recordSuccess('test-mcp', config);

      expect(getCircuitState('test-mcp')).toBe('closed');
    });

    it('should reopen on failure in half-open', async () => {
      const config = {
        ...DEFAULT_CIRCUIT_CONFIG,
        failureThreshold: 1,
        cooldownMs: 10,
      };

      recordFailure('test-mcp', config);
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Transition to half-open
      isCallAllowed('test-mcp', config);
      expect(getCircuitState('test-mcp')).toBe('half-open');

      // Failure in half-open should reopen
      recordFailure('test-mcp', config);
      expect(getCircuitState('test-mcp')).toBe('open');
    });
  });

  describe('disabled circuit', () => {
    it('should always allow calls when disabled', () => {
      const config = { ...DEFAULT_CIRCUIT_CONFIG, enabled: false };

      // Record many failures
      for (let i = 0; i < 10; i++) {
        recordFailure('test-mcp', config);
      }

      expect(isCallAllowed('test-mcp', config)).toBe(true);
    });
  });

  describe('circuit summary', () => {
    it('should return correct summary', () => {
      const config = { ...DEFAULT_CIRCUIT_CONFIG, failureThreshold: 1 };

      // Create circuits in different states
      isCallAllowed('mcp-1'); // closed
      isCallAllowed('mcp-2'); // closed

      recordFailure('mcp-3', config);

      const summary = getCircuitSummary();

      expect(summary.total).toBe(3);
      expect(summary.closed).toBe(2);
      expect(summary.open).toBe(1);
      expect(summary.halfOpen).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset individual circuit', () => {
      recordFailure('test-mcp', { ...DEFAULT_CIRCUIT_CONFIG, failureThreshold: 1 });
      expect(getCircuitState('test-mcp')).toBe('open');

      resetCircuit('test-mcp');
      expect(getCircuitState('test-mcp')).toBe('closed');
    });

    it('should reset all circuits', () => {
      const config = { ...DEFAULT_CIRCUIT_CONFIG, failureThreshold: 1 };
      recordFailure('mcp-1', config);
      recordFailure('mcp-2', config);

      resetAllCircuits();

      expect(getCircuitSummary().total).toBe(0);
    });
  });
});
