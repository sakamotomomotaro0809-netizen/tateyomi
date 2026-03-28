/**
 * Performance System Integration Tests
 *
 * Tests for caching, model selection, rate limiting, and benchmarking.
 */

import { PerformanceService } from '../../src/performance/PerformanceService';
import { BenchmarkRunner } from '../../src/performance/BenchmarkRunner';
import { ModelSelectionCriteria, BenchmarkScenario } from '../../src/performance/types';

describe('Performance System Integration Tests', () => {
  let performanceService: PerformanceService;

  beforeEach(() => {
    performanceService = new PerformanceService();
  });

  describe('Cache Operations', () => {
    it('should cache and retrieve results', () => {
      const key = 'test-key';
      const value = { data: 'test-value' };

      performanceService.cacheResult(key, value);
      const cached = performanceService.getCachedResult(key);

      expect(cached).toEqual(value);
    });

    it('should return undefined for non-existent cache key', () => {
      const cached = performanceService.getCachedResult('non-existent');

      expect(cached).toBeUndefined();
    });

    it('should cache agent selection results', () => {
      const keywords = ['api', 'backend'];
      const agents = ['backend-developer', 'api-developer'];

      performanceService.cacheAgentSelection(keywords, agents);
      const cached = performanceService.getCachedAgentSelection(keywords);

      expect(cached).toEqual(agents);
    });

    it('should return undefined for non-cached agent selection', () => {
      const cached = performanceService.getCachedAgentSelection(['unknown', 'keywords']);

      expect(cached).toBeUndefined();
    });

    it('should clear all caches', () => {
      performanceService.cacheResult('key1', 'value1');
      performanceService.cacheAgentSelection(['test'], ['agent']);

      performanceService.clearCaches();

      expect(performanceService.getCachedResult('key1')).toBeUndefined();
      expect(performanceService.getCachedAgentSelection(['test'])).toBeUndefined();
    });
  });

  describe('Model Selection', () => {
    it('should recommend haiku for trivial tasks', () => {
      const criteria: ModelSelectionCriteria = {
        taskComplexity: 'trivial',
        estimatedTokens: 50,
        requiresReasoning: false,
        isCodeGeneration: false,
      };

      const recommendation = performanceService.recommendModel(criteria);

      expect(recommendation.model).toBe('haiku');
      expect(recommendation.confidence).toBeGreaterThan(0);
      expect(recommendation.estimatedCost).toBeGreaterThan(0);
      expect(recommendation.estimatedLatencyMs).toBeGreaterThan(0);
    });

    it('should recommend sonnet for moderate tasks', () => {
      const criteria: ModelSelectionCriteria = {
        taskComplexity: 'moderate',
        estimatedTokens: 1500,
        requiresReasoning: true,
        isCodeGeneration: true,
      };

      const recommendation = performanceService.recommendModel(criteria);

      expect(recommendation.model).toBe('sonnet');
    });

    it('should recommend opus for expert tasks with reasoning', () => {
      const criteria: ModelSelectionCriteria = {
        taskComplexity: 'expert',
        estimatedTokens: 5000,
        requiresReasoning: true,
        isCodeGeneration: true,
      };

      const recommendation = performanceService.recommendModel(criteria);

      expect(recommendation.model).toBe('opus');
    });

    it('should downgrade from opus to sonnet for urgent tasks', () => {
      const criteria: ModelSelectionCriteria = {
        taskComplexity: 'expert',
        estimatedTokens: 5000,
        requiresReasoning: true,
        isCodeGeneration: true,
        timeConstraint: 'urgent',
      };

      const recommendation = performanceService.recommendModel(criteria);

      expect(recommendation.model).toBe('sonnet');
      expect(recommendation.rationale).toContain('time constraint');
    });

    it('should provide cost estimates', () => {
      const criteria: ModelSelectionCriteria = {
        taskComplexity: 'moderate',
        estimatedTokens: 1000,
        requiresReasoning: false,
        isCodeGeneration: true,
      };

      const recommendation = performanceService.recommendModel(criteria);

      expect(recommendation.estimatedCost).toBeGreaterThan(0);
      expect(recommendation.estimatedLatencyMs).toBeGreaterThan(0);
    });
  });

  describe('Complexity Classification', () => {
    it('should classify trivial tasks', () => {
      const complexity = performanceService.classifyComplexity('list files', 50);

      expect(complexity).toBe('trivial');
    });

    it('should classify simple tasks', () => {
      const complexity = performanceService.classifyComplexity('format code', 300);

      expect(complexity).toBe('simple');
    });

    it('should classify complex tasks with keywords', () => {
      const complexity = performanceService.classifyComplexity(
        'design microservices architecture',
        3000
      );

      expect(['complex', 'expert']).toContain(complexity);
    });

    it('should consider token count in classification', () => {
      const lowTokens = performanceService.classifyComplexity('task', 50);
      const highTokens = performanceService.classifyComplexity('task', 10000);

      expect(lowTokens).toBe('trivial');
      expect(highTokens).toBe('expert');
    });
  });

  describe('Rate Limiting', () => {
    it('should check rate limit status', () => {
      const status = performanceService.checkRateLimit();

      expect(status.requestsRemaining).toBeGreaterThanOrEqual(0);
      expect(status.tokensRemaining).toBeGreaterThanOrEqual(0);
      expect(typeof status.isLimited).toBe('boolean');
      expect(status.resetAtMs).toBeGreaterThan(Date.now());
    });

    it('should record requests', () => {
      const initialStatus = performanceService.checkRateLimit();
      const initialRemaining = initialStatus.requestsRemaining;

      performanceService.recordRequest(100, 500);

      const afterStatus = performanceService.checkRateLimit();

      expect(afterStatus.requestsRemaining).toBeLessThan(initialRemaining);
    });

    it('should acquire and release concurrent slots', () => {
      const acquired = performanceService.acquireConcurrentSlot();

      expect(acquired).toBe(true);

      performanceService.releaseConcurrentSlot();
    });
  });

  describe('Metrics Collection', () => {
    it('should collect performance metrics', () => {
      const metrics = performanceService.getMetrics();

      expect(metrics.timestamp).toBeDefined();
      expect(metrics.apiCalls).toBeDefined();
      expect(metrics.tokens).toBeDefined();
      expect(metrics.cache).toBeDefined();
      expect(metrics.memory).toBeDefined();
    });

    it('should include cache statistics', () => {
      performanceService.cacheResult('test', 'value');
      performanceService.getCachedResult('test');
      performanceService.getCachedResult('non-existent');

      const metrics = performanceService.getMetrics();

      expect(metrics.cache.hits).toBeGreaterThanOrEqual(1);
      expect(metrics.cache.misses).toBeGreaterThanOrEqual(1);
    });

    it('should include memory usage', () => {
      const metrics = performanceService.getMetrics();

      expect(metrics.memory.heapUsedMB).toBeGreaterThan(0);
      expect(metrics.memory.heapTotalMB).toBeGreaterThan(0);
      expect(metrics.memory.rssMemoryMB).toBeGreaterThan(0);
    });
  });

  describe('Optimization Recommendations', () => {
    it('should generate recommendations', () => {
      const recommendations = performanceService.getRecommendations();

      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should have valid recommendation structure', () => {
      // Trigger conditions for recommendations
      for (let i = 0; i < 100; i++) {
        performanceService.getCachedResult(`miss-${i}`);
      }

      const recommendations = performanceService.getRecommendations();

      for (const rec of recommendations) {
        expect(rec.id).toBeDefined();
        expect(['critical', 'high', 'medium', 'low']).toContain(rec.priority);
        expect(rec.category).toBeDefined();
        expect(rec.title).toBeDefined();
        expect(rec.description).toBeDefined();
      }
    });
  });

  describe('Report Generation', () => {
    it('should generate performance report', () => {
      const report = performanceService.generateReport();

      expect(report).toContain('TAISUN v2 Performance Report');
      expect(report).toContain('API Performance');
      expect(report).toContain('Cache Performance');
      expect(report).toContain('Memory Usage');
    });
  });

  describe('Configuration', () => {
    it('should provide configuration', () => {
      const config = performanceService.getConfig();

      expect(config.cache).toBeDefined();
      expect(config.rateLimit).toBeDefined();
      expect(config.parallelExecution).toBeDefined();
      expect(config.modelSelection).toBeDefined();
    });

    it('should have max parallel agents configured', () => {
      const maxParallel = performanceService.getMaxParallelAgents();

      expect(maxParallel).toBeGreaterThan(0);
      expect(maxParallel).toBeLessThanOrEqual(10);
    });
  });
});

describe('Benchmark Runner Integration Tests', () => {
  let runner: BenchmarkRunner;

  beforeEach(() => {
    runner = new BenchmarkRunner();
  });

  afterEach(() => {
    runner.clearScenarios();
  });

  describe('Scenario Registration', () => {
    it('should register scenarios', () => {
      const scenario: BenchmarkScenario = {
        id: 'test-scenario',
        name: 'Test Scenario',
        description: 'A test scenario',
        category: 'cache',
        iterations: 10,
        warmupIterations: 2,
        timeout: 1000,
        run: async () => ({ success: true }),
      };

      runner.registerScenario(scenario);
      // No error means success
    });
  });

  describe('Scenario Execution', () => {
    it('should run a simple scenario', async () => {
      const scenario: BenchmarkScenario = {
        id: 'simple-test',
        name: 'Simple Test',
        description: 'A simple test',
        category: 'cache',
        iterations: 5,
        warmupIterations: 1,
        timeout: 1000,
        run: async () => {
          // Simple operation
          const arr = Array(100).fill(0).map((_, i) => i);
          return { sum: arr.reduce((a, b) => a + b, 0) };
        },
      };

      const result = await runner.runScenario(scenario);

      expect(result.scenarioId).toBe('simple-test');
      expect(result.iterations).toBe(5);
      expect(result.timing.avgMs).toBeGreaterThan(0);
      expect(result.throughput.operationsPerSecond).toBeGreaterThan(0);
      expect(result.success).toBe(true);
      expect(result.errors).toBe(0);
    });

    it('should handle scenario with setup and teardown', async () => {
      let setupCalled = false;
      let teardownCalled = false;

      const scenario: BenchmarkScenario = {
        id: 'setup-teardown-test',
        name: 'Setup Teardown Test',
        description: 'Test with setup and teardown',
        category: 'cache',
        iterations: 3,
        warmupIterations: 1,
        timeout: 1000,
        setup: async () => {
          setupCalled = true;
        },
        teardown: async () => {
          teardownCalled = true;
        },
        run: async () => ({ success: true }),
      };

      await runner.runScenario(scenario);

      expect(setupCalled).toBe(true);
      expect(teardownCalled).toBe(true);
    });

    it('should calculate timing statistics', async () => {
      const scenario: BenchmarkScenario = {
        id: 'timing-test',
        name: 'Timing Test',
        description: 'Test timing statistics',
        category: 'cache',
        iterations: 20,
        warmupIterations: 5,
        timeout: 1000,
        run: async () => {
          // Variable delay to test statistics
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));
          return { success: true };
        },
      };

      const result = await runner.runScenario(scenario);

      expect(result.timing.minMs).toBeLessThanOrEqual(result.timing.avgMs);
      expect(result.timing.avgMs).toBeLessThanOrEqual(result.timing.maxMs);
      expect(result.timing.p50Ms).toBeLessThanOrEqual(result.timing.p95Ms);
      expect(result.timing.p95Ms).toBeLessThanOrEqual(result.timing.p99Ms);
    });
  });

  describe('Suite Execution', () => {
    it('should run multiple scenarios', async () => {
      const scenarios: BenchmarkScenario[] = [
        {
          id: 'scenario-1',
          name: 'Scenario 1',
          description: 'First scenario',
          category: 'cache',
          iterations: 5,
          warmupIterations: 1,
          timeout: 1000,
          run: async () => ({ success: true }),
        },
        {
          id: 'scenario-2',
          name: 'Scenario 2',
          description: 'Second scenario',
          category: 'memory',
          iterations: 5,
          warmupIterations: 1,
          timeout: 1000,
          run: async () => ({ success: true }),
        },
      ];

      for (const s of scenarios) {
        runner.registerScenario(s);
      }

      const result = await runner.runAll({
        name: 'Test Suite',
        description: 'Test benchmark suite',
        scenarios,
        outputFormat: 'console',
      });

      expect(result.name).toBe('Test Suite');
      expect(result.results.length).toBe(2);
      expect(result.summary.totalScenarios).toBe(2);
      expect(result.summary.passed).toBe(2);
      expect(result.summary.failed).toBe(0);
    });

    it('should include environment information', async () => {
      const scenario: BenchmarkScenario = {
        id: 'env-test',
        name: 'Environment Test',
        description: 'Test environment info',
        category: 'cache',
        iterations: 1,
        warmupIterations: 0,
        timeout: 1000,
        run: async () => ({ success: true }),
      };

      runner.registerScenario(scenario);

      const result = await runner.runAll({
        name: 'Env Test Suite',
        description: 'Test environment',
        scenarios: [scenario],
        outputFormat: 'console',
      });

      expect(result.environment.nodeVersion).toBeDefined();
      expect(result.environment.platform).toBeDefined();
      expect(result.environment.cpuCount).toBeGreaterThan(0);
      expect(result.environment.totalMemoryMB).toBeGreaterThan(0);
    });
  });
});
