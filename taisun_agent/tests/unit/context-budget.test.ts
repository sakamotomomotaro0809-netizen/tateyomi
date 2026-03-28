/**
 * Context Budget Monitor Tests
 */

import {
  initContextBudget,
  recordContextUsage,
  estimateTokens,
  estimateFileReadTokens,
  getBudgetLevel,
  getContextBudget,
  getBudgetSummary,
  simulateCompaction,
  getTopConsumers,
  resetContextBudget,
  withContextTracking,
  CONTEXT_LIMITS,
  OPERATION_TOKEN_ESTIMATES,
  BUDGET_THRESHOLDS,
} from '../../src/proxy-mcp/observability/context-budget';

describe('Context Budget Monitor', () => {
  beforeEach(() => {
    resetContextBudget();
  });

  describe('initContextBudget', () => {
    it('should initialize with default model', () => {
      const session = initContextBudget('test-session-1');

      expect(session.sessionId).toBe('test-session-1');
      expect(session.modelId).toBe('default');
      expect(session.contextLimit).toBe(CONTEXT_LIMITS.default);
      expect(session.estimatedUsed).toBeGreaterThan(0);
      expect(session.level).toBe('ok');
      expect(session.operationCount).toBe(0);
    });

    it('should initialize with specific model', () => {
      const session = initContextBudget('test-session-2', 'claude_opus_4_5');

      expect(session.modelId).toBe('claude_opus_4_5');
      expect(session.contextLimit).toBe(CONTEXT_LIMITS.claude_opus_4_5);
    });

    it('should include system overhead in initial usage', () => {
      const session = initContextBudget('test-session-3');

      const expectedOverhead =
        OPERATION_TOKEN_ESTIMATES.system_prompt +
        OPERATION_TOKEN_ESTIMATES.tool_definition * 30 +
        OPERATION_TOKEN_ESTIMATES.mcp_server_overhead * 10;

      expect(session.estimatedUsed).toBe(expectedOverhead);
      expect(session.history.length).toBe(1);
      expect(session.history[0].description).toContain('System initialization');
    });
  });

  describe('recordContextUsage', () => {
    it('should record standard operation types', () => {
      initContextBudget('test-session');
      const initialUsage = getContextBudget()!.estimatedUsed;

      recordContextUsage('file_read_medium');

      const state = getContextBudget()!;
      expect(state.estimatedUsed).toBe(initialUsage + OPERATION_TOKEN_ESTIMATES.file_read_medium);
      expect(state.operationCount).toBe(1);
    });

    it('should record custom token amounts', () => {
      initContextBudget('test-session');
      const initialUsage = getContextBudget()!.estimatedUsed;

      recordContextUsage('custom', 5000, 'Large API response');

      const state = getContextBudget()!;
      expect(state.estimatedUsed).toBe(initialUsage + 5000);
    });

    it('should auto-initialize session if not exists', () => {
      expect(getContextBudget()).toBeNull();

      recordContextUsage('bash_simple');

      expect(getContextBudget()).not.toBeNull();
    });

    it('should return warning when threshold exceeded', () => {
      const session = initContextBudget('test-session');
      // Use 85% of context
      const tokensToUse = session.contextLimit * 0.85 - session.estimatedUsed;

      const warning = recordContextUsage('custom', tokensToUse, 'Large operation');

      expect(warning).not.toBeNull();
      expect(warning!.level).toBe('warning');
      expect(warning!.recommendations.length).toBeGreaterThan(0);
    });

    it('should return null when under threshold', () => {
      initContextBudget('test-session');

      const warning = recordContextUsage('file_read_small');

      expect(warning).toBeNull();
    });
  });

  describe('estimateTokens', () => {
    it('should estimate tokens from string content', () => {
      const content = 'Hello world'; // 11 characters
      const tokens = estimateTokens(content);

      // ~4 chars per token = ~3 tokens
      expect(tokens).toBeGreaterThanOrEqual(2);
      expect(tokens).toBeLessThanOrEqual(4);
    });

    it('should handle empty string', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('should handle large content', () => {
      const content = 'x'.repeat(10000);
      const tokens = estimateTokens(content);

      // 10000 chars * 0.25 = 2500 tokens
      expect(tokens).toBe(2500);
    });
  });

  describe('estimateFileReadTokens', () => {
    it('should return small estimate for < 100 lines', () => {
      expect(estimateFileReadTokens(50)).toBe(OPERATION_TOKEN_ESTIMATES.file_read_small);
      expect(estimateFileReadTokens(99)).toBe(OPERATION_TOKEN_ESTIMATES.file_read_small);
    });

    it('should return medium estimate for 100-499 lines', () => {
      expect(estimateFileReadTokens(100)).toBe(OPERATION_TOKEN_ESTIMATES.file_read_medium);
      expect(estimateFileReadTokens(499)).toBe(OPERATION_TOKEN_ESTIMATES.file_read_medium);
    });

    it('should return large estimate for 500-1999 lines', () => {
      expect(estimateFileReadTokens(500)).toBe(OPERATION_TOKEN_ESTIMATES.file_read_large);
      expect(estimateFileReadTokens(1999)).toBe(OPERATION_TOKEN_ESTIMATES.file_read_large);
    });

    it('should return huge estimate for >= 2000 lines', () => {
      expect(estimateFileReadTokens(2000)).toBe(OPERATION_TOKEN_ESTIMATES.file_read_huge);
      expect(estimateFileReadTokens(10000)).toBe(OPERATION_TOKEN_ESTIMATES.file_read_huge);
    });
  });

  describe('getBudgetLevel', () => {
    it('should return ok for < 60%', () => {
      expect(getBudgetLevel(0.0)).toBe('ok');
      expect(getBudgetLevel(0.5)).toBe('ok');
      expect(getBudgetLevel(0.59)).toBe('ok');
    });

    it('should return info for 60-79%', () => {
      expect(getBudgetLevel(0.60)).toBe('info');
      expect(getBudgetLevel(0.70)).toBe('info');
      expect(getBudgetLevel(0.79)).toBe('info');
    });

    it('should return warning for 80-89%', () => {
      expect(getBudgetLevel(0.80)).toBe('warning');
      expect(getBudgetLevel(0.85)).toBe('warning');
      expect(getBudgetLevel(0.89)).toBe('warning');
    });

    it('should return critical for 90-94%', () => {
      expect(getBudgetLevel(0.90)).toBe('critical');
      expect(getBudgetLevel(0.92)).toBe('critical');
      expect(getBudgetLevel(0.94)).toBe('critical');
    });

    it('should return emergency for >= 95%', () => {
      expect(getBudgetLevel(0.95)).toBe('emergency');
      expect(getBudgetLevel(0.99)).toBe('emergency');
      expect(getBudgetLevel(1.0)).toBe('emergency');
    });
  });

  describe('getBudgetSummary', () => {
    it('should return message when no session', () => {
      const summary = getBudgetSummary();
      expect(summary).toContain('No active context budget session');
    });

    it('should return formatted summary', () => {
      initContextBudget('test-session');

      const summary = getBudgetSummary();

      expect(summary).toMatch(/🟢/); // ok level
      expect(summary).toContain('Context:');
      expect(summary).toContain('% used');
      expect(summary).toContain('remaining');
      expect(summary).toContain('operations');
    });

    it('should show correct level indicator', () => {
      const session = initContextBudget('test-session');

      // Push to warning level
      const tokensToUse = session.contextLimit * 0.85 - session.estimatedUsed;
      recordContextUsage('custom', tokensToUse);

      const summary = getBudgetSummary();
      expect(summary).toMatch(/🟡/); // warning level
    });
  });

  describe('simulateCompaction', () => {
    it('should reduce usage by specified percentage', () => {
      initContextBudget('test-session');
      recordContextUsage('custom', 100000); // Add significant usage

      const beforeState = getContextBudget()!;
      const beforeUsed = beforeState.estimatedUsed;

      simulateCompaction(50);

      const afterState = getContextBudget()!;
      expect(afterState.estimatedUsed).toBe(beforeUsed * 0.5);
    });

    it('should update remaining and percentage', () => {
      initContextBudget('test-session');
      recordContextUsage('custom', 100000);

      simulateCompaction(50);

      const state = getContextBudget()!;
      expect(state.estimatedRemaining).toBe(state.contextLimit - state.estimatedUsed);
      expect(state.usagePercent).toBe(state.estimatedUsed / state.contextLimit);
    });

    it('should add compaction to history', () => {
      initContextBudget('test-session');
      recordContextUsage('custom', 50000);

      simulateCompaction(40);

      const state = getContextBudget()!;
      const lastHistory = state.history[state.history.length - 1];
      expect(lastHistory.description).toContain('Compaction');
      expect(lastHistory.estimatedTokens).toBeLessThan(0);
    });
  });

  describe('getTopConsumers', () => {
    it('should return empty array when no session', () => {
      expect(getTopConsumers()).toEqual([]);
    });

    it('should return top consumers sorted by total tokens', () => {
      initContextBudget('test-session');

      // Add various operations
      recordContextUsage('file_read_large');
      recordContextUsage('file_read_large');
      recordContextUsage('file_read_small');
      recordContextUsage('bash_simple');
      recordContextUsage('bash_simple');
      recordContextUsage('bash_simple');

      const consumers = getTopConsumers(3);

      expect(consumers.length).toBeGreaterThan(0);
      // file_read_large should be at top (2 * 8000 = 16000)
      expect(consumers[0].type).toBe('file_read_large');
      expect(consumers[0].count).toBe(2);
    });

    it('should limit results', () => {
      initContextBudget('test-session');

      // Add many different operation types
      recordContextUsage('file_read_small');
      recordContextUsage('file_read_medium');
      recordContextUsage('file_read_large');
      recordContextUsage('bash_simple');
      recordContextUsage('bash_medium');

      const consumers = getTopConsumers(2);
      expect(consumers.length).toBeLessThanOrEqual(2);
    });
  });

  describe('withContextTracking', () => {
    it('should execute operation and track usage', async () => {
      initContextBudget('test-session');

      const { result, warning } = await withContextTracking(
        'bash_simple',
        async () => 'test result'
      );

      expect(result).toBe('test result');
      expect(warning).toBeNull();
      expect(getContextBudget()!.operationCount).toBe(1);
    });

    it('should propagate errors', async () => {
      initContextBudget('test-session');

      await expect(
        withContextTracking('bash_simple', async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');
    });
  });

  describe('threshold constants', () => {
    it('should have correct threshold values', () => {
      expect(BUDGET_THRESHOLDS.info).toBe(0.60);
      expect(BUDGET_THRESHOLDS.warning).toBe(0.80);
      expect(BUDGET_THRESHOLDS.critical).toBe(0.90);
      expect(BUDGET_THRESHOLDS.emergency).toBe(0.95);
    });
  });

  describe('context limits', () => {
    it('should have reasonable context limits', () => {
      expect(CONTEXT_LIMITS.default).toBeGreaterThanOrEqual(100000);
      expect(CONTEXT_LIMITS.claude_opus_4_5).toBeGreaterThanOrEqual(100000);
    });
  });

  describe('history management', () => {
    it('should trim history when exceeding limit', () => {
      initContextBudget('test-session');

      // Add many operations (more than MAX_HISTORY_ENTRIES = 100)
      for (let i = 0; i < 150; i++) {
        recordContextUsage('bash_simple');
      }

      const state = getContextBudget()!;
      expect(state.history.length).toBeLessThanOrEqual(100);
    });
  });
});
