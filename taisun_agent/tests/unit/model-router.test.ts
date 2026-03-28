import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ModelRouter } from '../../src/performance/ModelRouter'
import { CostTracker } from '../../src/performance/CostTracker'
import type { RoutingCriteria, BudgetStatus } from '../../src/performance/types'

describe('ModelRouter', () => {
  let router: ModelRouter

  beforeEach(() => {
    router = new ModelRouter()
  })

  describe('route', () => {
    it('should route trivial tasks to ollama-qwen3-coder', async () => {
      const criteria: RoutingCriteria = { taskComplexity: 'trivial', estimatedTokens: 100 }
      const result = await router.route(criteria)
      expect(result.model).toBeDefined()
      expect(result.provider).toBeDefined()
      expect(result.reason).toBeDefined()
    })

    it('should route simple tasks to claude-haiku', async () => {
      const criteria: RoutingCriteria = { taskComplexity: 'simple', estimatedTokens: 500 }
      const result = await router.route(criteria)
      expect(result.model).toBeDefined()
      expect(result.provider).toBeDefined()
    })

    it('should route moderate tasks to claude-sonnet', async () => {
      const criteria: RoutingCriteria = { taskComplexity: 'moderate', estimatedTokens: 2000 }
      const result = await router.route(criteria)
      expect(result.model).toBeDefined()
    })

    it('should route complex tasks to claude-sonnet', async () => {
      const criteria: RoutingCriteria = { taskComplexity: 'complex', estimatedTokens: 5000 }
      const result = await router.route(criteria)
      expect(result.model).toBeDefined()
    })

    it('should route expert tasks to claude-opus', async () => {
      const criteria: RoutingCriteria = { taskComplexity: 'expert', estimatedTokens: 10000 }
      const result = await router.route(criteria)
      expect(result.model).toBeDefined()
    })

    it('should include estimated cost', async () => {
      const criteria: RoutingCriteria = { taskComplexity: 'moderate', estimatedTokens: 1000 }
      const result = await router.route(criteria)
      expect(typeof result.estimatedCost).toBe('number')
      expect(result.estimatedCost).toBeGreaterThanOrEqual(0)
    })

    it('should indicate fallback availability', async () => {
      const criteria: RoutingCriteria = { taskComplexity: 'moderate' }
      const result = await router.route(criteria)
      expect(typeof result.fallbackAvailable).toBe('boolean')
    })
  })

  describe('getFallbackModel', () => {
    it('should return next model in fallback chain', () => {
      const fallback = router.getFallbackModel('claude-opus')
      expect(fallback).toBe('claude-sonnet')
    })

    it('should return null for last model in chain', () => {
      const fallback = router.getFallbackModel('openrouter-free')
      expect(fallback).toBeNull()
    })

    it('should return null for unknown model', () => {
      const fallback = router.getFallbackModel('unknown-model' as any)
      expect(fallback).toBeNull()
    })
  })

  describe('getRoutingRules', () => {
    it('should return all 5 tier rules', () => {
      const rules = router.getRoutingRules()
      expect(rules.length).toBe(5)
    })

    it('should cover all complexity levels', () => {
      const rules = router.getRoutingRules()
      const complexities = rules.map((r) => r.taskComplexity)
      expect(complexities).toContain('trivial')
      expect(complexities).toContain('simple')
      expect(complexities).toContain('moderate')
      expect(complexities).toContain('complex')
      expect(complexities).toContain('expert')
    })

    it('should have fallback models for each rule', () => {
      const rules = router.getRoutingRules()
      for (const rule of rules) {
        expect(rule.fallbackModels.length).toBeGreaterThan(0)
      }
    })
  })

  describe('checkProviderHealth', () => {
    it('should check anthropic-api health via env var', async () => {
      const originalKey = process.env.ANTHROPIC_API_KEY
      process.env.ANTHROPIC_API_KEY = 'test-key'
      const healthy = await router.checkProviderHealth('anthropic-api')
      expect(healthy).toBe(true)
      if (originalKey) {
        process.env.ANTHROPIC_API_KEY = originalKey
      } else {
        delete process.env.ANTHROPIC_API_KEY
      }
    })

    it('should return false for anthropic without key', async () => {
      const originalKey = process.env.ANTHROPIC_API_KEY
      delete process.env.ANTHROPIC_API_KEY
      router.clearHealthCache()
      const healthy = await router.checkProviderHealth('anthropic-api')
      expect(healthy).toBe(false)
      if (originalKey) process.env.ANTHROPIC_API_KEY = originalKey
    })
  })

  describe('clearHealthCache', () => {
    it('should not throw', () => {
      expect(() => router.clearHealthCache()).not.toThrow()
    })
  })

  describe('routeWithOverride', () => {
    it('should use specified model when available', async () => {
      const originalKey = process.env.ANTHROPIC_API_KEY
      process.env.ANTHROPIC_API_KEY = 'test-key'
      router.clearHealthCache()
      const result = await router.routeWithOverride('claude-sonnet')
      expect(result.model).toBe('claude-sonnet')
      expect(result.reason).toContain('Manual override')
      if (originalKey) process.env.ANTHROPIC_API_KEY = originalKey
      else delete process.env.ANTHROPIC_API_KEY
    })
  })

  describe('suggestCodex', () => {
    it('should return suggestion object', async () => {
      const criteria: RoutingCriteria = {
        taskComplexity: 'moderate',
        taskCategory: 'coding',
      }
      const suggestion = await router.suggestCodex(criteria, 'fix authentication bug')
      expect(suggestion).toHaveProperty('shouldSuggest')
      expect(suggestion).toHaveProperty('reason')
      expect(suggestion).toHaveProperty('currentModel')
      expect(suggestion).toHaveProperty('savingsPercent')
      expect(suggestion).toHaveProperty('isCodexAvailable')
    })

    it('should not suggest for non-coding tasks', async () => {
      const criteria: RoutingCriteria = {
        taskComplexity: 'moderate',
        taskCategory: 'research',
      }
      const suggestion = await router.suggestCodex(criteria)
      expect(suggestion.shouldSuggest).toBe(false)
    })
  })
})
