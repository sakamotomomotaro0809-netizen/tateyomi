import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { ModelRouter } from '../../src/performance/ModelRouter'
import { CostTracker } from '../../src/performance/CostTracker'
import { CodexCliHelper } from '../../src/performance/CodexCliHelper'
import type { RoutingCriteria, TaskComplexity } from '../../src/performance/types'

const TEST_LOG_DIR = path.join(__dirname, '../../tmp-integration-logs')
const TEST_LOG_PATH = path.join(TEST_LOG_DIR, 'cost-tracking.jsonl')
const TEST_GLOBAL_LOG_PATH = path.join(TEST_LOG_DIR, 'global-cost-tracking.jsonl')

describe('Model Routing Integration', () => {
  let costTracker: CostTracker
  let router: ModelRouter

  beforeEach(() => {
    fs.mkdirSync(TEST_LOG_DIR, { recursive: true })
    costTracker = new CostTracker({
      logPath: TEST_LOG_PATH,
      globalLogPath: TEST_GLOBAL_LOG_PATH,
      projectId: 'integration-test',
    })
    router = new ModelRouter({ costTracker })
  })

  afterEach(() => {
    fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true })
  })

  describe('Full routing pipeline', () => {
    it('should route and record cost for each complexity tier', async () => {
      const tiers: TaskComplexity[] = ['trivial', 'simple', 'moderate', 'complex', 'expert']

      for (const tier of tiers) {
        const criteria: RoutingCriteria = { taskComplexity: tier, estimatedTokens: 1000 }
        const result = await router.route(criteria)

        expect(result.model).toBeDefined()
        expect(result.provider).toBeDefined()
        expect(typeof result.estimatedCost).toBe('number')

        costTracker.recordUsage(result.model, result.provider, 1000, 500, 0)
      }

      const report = costTracker.getCostReport('day')
      expect(report.requestCount).toBe(5)
    })
  })

  describe('Budget enforcement', () => {
    it('should fall back to free model when budget exceeded', async () => {
      const overBudgetTracker = new CostTracker({
        logPath: TEST_LOG_PATH,
        globalLogPath: TEST_GLOBAL_LOG_PATH,
        projectId: 'budget-test',
        budget: {
          monthlyLimit: 0.001,
          dailyLimit: 0.001,
          warningThresholdPercent: 50,
          hardLimitAction: 'fallback-to-free',
        },
      })

      overBudgetTracker.recordUsage('claude-opus', 'anthropic-max', 1_000_000, 1_000_000, 0)

      const budgetRouter = new ModelRouter({ costTracker: overBudgetTracker })
      const result = await budgetRouter.route({ taskComplexity: 'expert', estimatedTokens: 5000 })

      expect(result.reason).toContain('Budget')
    })
  })

  describe('Fallback chain', () => {
    it('should have complete fallback chain', () => {
      let current: any = 'claude-opus'
      const chain: string[] = [current]

      while (current) {
        current = router.getFallbackModel(current)
        if (current) chain.push(current)
      }

      expect(chain.length).toBeGreaterThanOrEqual(3)
      expect(chain[0]).toBe('claude-opus')
    })
  })

  describe('Codex suggestion with cost tracking', () => {
    it('should integrate codex suggestion with router', async () => {
      const criteria: RoutingCriteria = {
        taskComplexity: 'complex',
        taskCategory: 'coding',
        estimatedTokens: 5000,
      }
      const suggestion = await router.suggestCodex(criteria, 'Implement auth system')

      expect(suggestion).toHaveProperty('shouldSuggest')
      expect(suggestion).toHaveProperty('currentEstimatedCost')
      expect(suggestion.codexEstimatedCost).toBe(0)
    })
  })

  describe('Provider health caching', () => {
    it('should cache health check results', async () => {
      const health1 = await router.checkProviderHealth('anthropic-api')
      const health2 = await router.checkProviderHealth('anthropic-api')
      expect(health1).toBe(health2)
    })

    it('should clear cache on demand', async () => {
      await router.checkProviderHealth('anthropic-api')
      router.clearHealthCache()
      const health = await router.checkProviderHealth('anthropic-api')
      expect(typeof health).toBe('boolean')
    })
  })

  describe('Cost report after routing', () => {
    it('should generate accurate cost report', async () => {
      for (let i = 0; i < 3; i++) {
        costTracker.recordUsage('claude-sonnet', 'anthropic-api', 2000, 1000, 0)
      }
      costTracker.recordUsage('claude-haiku', 'anthropic-api', 500, 250, 0)

      const report = costTracker.getCostReport('day')
      expect(report.requestCount).toBe(4)
      expect(report.totalCost).toBeGreaterThan(0)
      expect(report.byModel['claude-sonnet']).toBeGreaterThan(0)
    })
  })
})
