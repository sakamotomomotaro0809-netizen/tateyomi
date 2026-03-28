import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { CostTracker } from '../../src/performance/CostTracker'

const TEST_LOG_DIR = path.join(__dirname, '../../tmp-test-logs')
const TEST_LOG_PATH = path.join(TEST_LOG_DIR, 'cost-tracking.jsonl')
const TEST_GLOBAL_LOG_PATH = path.join(TEST_LOG_DIR, 'global-cost-tracking.jsonl')

describe('CostTracker', () => {
  let tracker: CostTracker

  beforeEach(() => {
    fs.mkdirSync(TEST_LOG_DIR, { recursive: true })
    tracker = new CostTracker({
      logPath: TEST_LOG_PATH,
      globalLogPath: TEST_GLOBAL_LOG_PATH,
      projectId: 'test-project',
    })
  })

  afterEach(() => {
    fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true })
  })

  describe('calculateCost', () => {
    it('should calculate cost for claude-opus', () => {
      const cost = tracker.calculateCost('claude-opus', 1_000_000, 1_000_000)
      expect(cost).toBe(30) // $5 input + $25 output
    })

    it('should calculate cost for claude-sonnet', () => {
      const cost = tracker.calculateCost('claude-sonnet', 1_000_000, 1_000_000)
      expect(cost).toBe(18) // $3 input + $15 output
    })

    it('should calculate cost for claude-haiku', () => {
      const cost = tracker.calculateCost('claude-haiku', 1_000_000, 1_000_000)
      expect(cost).toBe(6) // $1 input + $5 output
    })

    it('should return 0 for ollama models', () => {
      const cost = tracker.calculateCost('ollama-qwen3-coder', 1_000_000, 1_000_000)
      expect(cost).toBe(0)
    })

    it('should return 0 for openrouter-free', () => {
      const cost = tracker.calculateCost('openrouter-free', 500_000, 500_000)
      expect(cost).toBe(0)
    })

    it('should calculate cost for gpt53-codex', () => {
      const cost = tracker.calculateCost('gpt53-codex', 1_000_000, 1_000_000)
      expect(cost).toBe(11.25) // $1.25 input + $10 output
    })

    it('should handle zero tokens', () => {
      const cost = tracker.calculateCost('claude-opus', 0, 0)
      expect(cost).toBe(0)
    })
  })

  describe('recordUsage', () => {
    it('should record usage to project log', () => {
      tracker.recordUsage('claude-sonnet', 'anthropic-api', 1000, 500, 0)
      expect(fs.existsSync(TEST_LOG_PATH)).toBe(true)
      const content = fs.readFileSync(TEST_LOG_PATH, 'utf-8').trim()
      const record = JSON.parse(content)
      expect(record.model).toBe('claude-sonnet')
      expect(record.provider).toBe('anthropic-api')
      expect(record.inputTokens).toBe(1000)
      expect(record.outputTokens).toBe(500)
    })

    it('should record usage to global log', () => {
      tracker.recordUsage('claude-opus', 'anthropic-max', 2000, 1000, 0)
      expect(fs.existsSync(TEST_GLOBAL_LOG_PATH)).toBe(true)
    })

    it('should append multiple records', () => {
      tracker.recordUsage('claude-sonnet', 'anthropic-api', 100, 50, 0)
      tracker.recordUsage('claude-haiku', 'anthropic-api', 200, 100, 0)
      const lines = fs.readFileSync(TEST_LOG_PATH, 'utf-8').trim().split('\n')
      expect(lines.length).toBe(2)
    })
  })

  describe('checkBudget', () => {
    it('should return not over budget when no usage', () => {
      const status = tracker.checkBudget()
      expect(status.isOverBudget).toBe(false)
      expect(status.dailySpend).toBe(0)
      expect(status.monthlySpend).toBe(0)
    })

    it('should return correct budget status after usage', () => {
      tracker.recordUsage('claude-opus', 'anthropic-max', 100_000, 50_000, 0)
      const status = tracker.checkBudget()
      expect(status.dailySpend).toBeGreaterThan(0)
      expect(status.monthlySpend).toBeGreaterThan(0)
    })
  })

  describe('getDailySpend', () => {
    it('should return 0 with no records', () => {
      expect(tracker.getDailySpend()).toBe(0)
    })

    it('should sum daily costs', () => {
      tracker.recordUsage('claude-sonnet', 'anthropic-api', 1_000_000, 1_000_000, 0)
      expect(tracker.getDailySpend()).toBe(18)
    })
  })

  describe('getMonthlySpend', () => {
    it('should return 0 with no records', () => {
      expect(tracker.getMonthlySpend()).toBe(0)
    })
  })

  describe('getCostReport', () => {
    it('should generate day report', () => {
      tracker.recordUsage('claude-sonnet', 'anthropic-api', 1000, 500, 0)
      const report = tracker.getCostReport('day')
      expect(report.period).toBe('day')
      expect(report.requestCount).toBe(1)
      expect(report.totalCost).toBeGreaterThan(0)
    })

    it('should generate month report', () => {
      const report = tracker.getCostReport('month')
      expect(report.period).toBe('month')
      expect(report.requestCount).toBe(0)
    })
  })
})
