import * as fs from 'fs'
import * as path from 'path'
import type {
  ModelType,
  ProviderType,
  CostRecord,
  BudgetConfig,
  BudgetStatus,
  CostReport,
  ModelCost,
  ModelRoutingConfig,
} from './types'

const DEFAULT_LOG_PATH = path.join(process.cwd(), 'logs', 'cost-tracking.jsonl')
const GLOBAL_LOG_PATH = path.join(
  process.env.HOME ?? process.env.USERPROFILE ?? '~',
  '.claude',
  'global-cost-tracking.jsonl'
)

const DEFAULT_COST_TABLE: Record<ModelType, ModelCost> = {
  'opus': { inputPerMillion: 15, outputPerMillion: 75 },
  'sonnet': { inputPerMillion: 3, outputPerMillion: 15 },
  'haiku': { inputPerMillion: 0.25, outputPerMillion: 1.25 },
  'claude-opus': { inputPerMillion: 5, outputPerMillion: 25, cachedInputPerMillion: 0.5 },
  'claude-sonnet': { inputPerMillion: 3, outputPerMillion: 15, cachedInputPerMillion: 0.3 },
  'claude-haiku': { inputPerMillion: 1, outputPerMillion: 5, cachedInputPerMillion: 0.1 },
  'claude-opus-4-6': { inputPerMillion: 15, outputPerMillion: 75, cachedInputPerMillion: 1.5 },
  'claude-sonnet-4-5': { inputPerMillion: 3, outputPerMillion: 15, cachedInputPerMillion: 0.3 },
  'claude-haiku-4-5': { inputPerMillion: 1, outputPerMillion: 5, cachedInputPerMillion: 0.08 },
  'ollama-qwen3-coder': { inputPerMillion: 0, outputPerMillion: 0 },
  'ollama-glm4': { inputPerMillion: 0, outputPerMillion: 0 },
  'openrouter-free': { inputPerMillion: 0, outputPerMillion: 0 },
  'gpt53-codex': { inputPerMillion: 1.25, outputPerMillion: 10 },
  'codex-cli': { inputPerMillion: 0, outputPerMillion: 0 },
}

const DEFAULT_BUDGET: BudgetConfig = {
  monthlyLimit: 50,
  dailyLimit: 5,
  warningThresholdPercent: 80,
  hardLimitAction: 'fallback-to-free',
  globalMonthlyLimit: 200,
  globalDailyLimit: 15,
  opusDailyLimit: 2,
  opusMonthlyLimit: 30,
}

interface CostTrackerOptions {
  readonly logPath?: string
  readonly globalLogPath?: string
  readonly costTable?: Record<ModelType, ModelCost>
  readonly budget?: BudgetConfig
  readonly projectId?: string
}

export class CostTracker {
  private readonly logPath: string
  private readonly globalLogPath: string
  private readonly costTable: Record<ModelType, ModelCost>
  private readonly budget: BudgetConfig
  private readonly projectId: string
  private records: readonly CostRecord[] = []
  private globalRecords: readonly CostRecord[] = []
  private loaded = false
  private globalLoaded = false

  constructor(options: CostTrackerOptions = {}) {
    this.logPath = options.logPath ?? DEFAULT_LOG_PATH
    this.globalLogPath = options.globalLogPath ?? GLOBAL_LOG_PATH
    this.costTable = options.costTable ?? DEFAULT_COST_TABLE
    this.budget = options.budget ?? DEFAULT_BUDGET
    this.projectId = options.projectId ?? path.basename(process.cwd())
  }

  static fromConfig(config: ModelRoutingConfig, logPath?: string): CostTracker {
    const costTable = Object.entries(config.models).reduce(
      (acc, [key, model]) => ({
        ...acc,
        [key]: model.cost,
      }),
      {} as Record<ModelType, ModelCost>
    )
    return new CostTracker({
      logPath,
      costTable,
      budget: config.budget,
    })
  }

  calculateCost(
    model: ModelType,
    inputTokens: number,
    outputTokens: number,
    cachedTokens = 0
  ): number {
    const costs = this.costTable[model]
    if (!costs) {
      return 0
    }
    const regularInputTokens = inputTokens - cachedTokens
    const inputCost = (regularInputTokens / 1_000_000) * costs.inputPerMillion
    const cachedCost = (cachedTokens / 1_000_000) * (costs.cachedInputPerMillion ?? costs.inputPerMillion)
    const outputCost = (outputTokens / 1_000_000) * costs.outputPerMillion
    return inputCost + cachedCost + outputCost
  }

  recordUsage(
    model: ModelType,
    provider: ProviderType,
    inputTokens: number,
    outputTokens: number,
    cachedTokens = 0,
    taskType?: string
  ): CostRecord {
    const cost = this.calculateCost(model, inputTokens, outputTokens, cachedTokens)
    const record: CostRecord = {
      timestamp: new Date().toISOString(),
      model,
      provider,
      inputTokens,
      outputTokens,
      cachedTokens,
      cost,
      taskType,
      projectId: this.projectId,
    }
    this.records = [...this.records, record]
    this.globalRecords = [...this.globalRecords, record]
    this.appendToLog(record)
    this.appendToGlobalLog(record)
    return record
  }

  getDailySpend(date?: Date): number {
    const targetDate = date ?? new Date()
    const dayStart = new Date(targetDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(targetDate)
    dayEnd.setHours(23, 59, 59, 999)

    return this.getRecordsInRange(dayStart, dayEnd)
      .reduce((sum, r) => sum + r.cost, 0)
  }

  getMonthlySpend(date?: Date): number {
    const targetDate = date ?? new Date()
    const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
    const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999)

    return this.getRecordsInRange(monthStart, monthEnd)
      .reduce((sum, r) => sum + r.cost, 0)
  }

  getGlobalDailySpend(date?: Date): number {
    const targetDate = date ?? new Date()
    const dayStart = new Date(targetDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(targetDate)
    dayEnd.setHours(23, 59, 59, 999)

    return this.getGlobalRecordsInRange(dayStart, dayEnd)
      .reduce((sum, r) => sum + r.cost, 0)
  }

  getGlobalMonthlySpend(date?: Date): number {
    const targetDate = date ?? new Date()
    const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
    const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999)

    return this.getGlobalRecordsInRange(monthStart, monthEnd)
      .reduce((sum, r) => sum + r.cost, 0)
  }

  getOpusDailySpend(date?: Date): number {
    const targetDate = date ?? new Date()
    const dayStart = new Date(targetDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(targetDate)
    dayEnd.setHours(23, 59, 59, 999)

    return this.getGlobalRecordsInRange(dayStart, dayEnd)
      .filter((r) => r.model === 'claude-opus')
      .reduce((sum, r) => sum + r.cost, 0)
  }

  getOpusMonthlySpend(date?: Date): number {
    const targetDate = date ?? new Date()
    const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
    const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999)

    return this.getGlobalRecordsInRange(monthStart, monthEnd)
      .filter((r) => r.model === 'claude-opus')
      .reduce((sum, r) => sum + r.cost, 0)
  }

  checkBudget(): BudgetStatus {
    const dailySpend = this.getDailySpend()
    const monthlySpend = this.getMonthlySpend()
    const percentUsed = (monthlySpend / this.budget.monthlyLimit) * 100

    const globalDailySpend = this.getGlobalDailySpend()
    const globalMonthlySpend = this.getGlobalMonthlySpend()
    const opusDailySpend = this.getOpusDailySpend()

    const isProjectOverBudget = dailySpend >= this.budget.dailyLimit || monthlySpend >= this.budget.monthlyLimit
    const isGlobalOverBudget =
      (this.budget.globalDailyLimit != null && globalDailySpend >= this.budget.globalDailyLimit) ||
      (this.budget.globalMonthlyLimit != null && globalMonthlySpend >= this.budget.globalMonthlyLimit)
    const isOpusOverLimit =
      this.budget.opusDailyLimit != null && opusDailySpend >= this.budget.opusDailyLimit

    return {
      isOverBudget: isProjectOverBudget || isGlobalOverBudget,
      dailySpend,
      monthlySpend,
      dailyRemaining: Math.max(0, this.budget.dailyLimit - dailySpend),
      monthlyRemaining: Math.max(0, this.budget.monthlyLimit - monthlySpend),
      percentUsed,
      globalDailySpend,
      globalMonthlySpend,
      isGlobalOverBudget,
      opusDailySpend,
      isOpusOverLimit,
    }
  }

  isWarningThreshold(): boolean {
    const status = this.checkBudget()
    return status.percentUsed >= this.budget.warningThresholdPercent
  }

  getCostReport(period: 'day' | 'week' | 'month'): CostReport {
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'day':
        startDate = new Date(now)
        startDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 7)
        startDate.setHours(0, 0, 0, 0)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
    }

    const records = this.getRecordsInRange(startDate, now)
    const totalCost = records.reduce((sum, r) => sum + r.cost, 0)

    const byModel = records.reduce((acc, r) => ({
      ...acc,
      [r.model]: (acc[r.model] ?? 0) + r.cost,
    }), {} as Record<string, number>)

    const byProvider = records.reduce((acc, r) => ({
      ...acc,
      [r.provider]: (acc[r.provider] ?? 0) + r.cost,
    }), {} as Record<string, number>)

    return {
      period,
      totalCost,
      byModel,
      byProvider,
      requestCount: records.length,
      averageCostPerRequest: records.length > 0 ? totalCost / records.length : 0,
      budgetStatus: this.checkBudget(),
    }
  }

  getRecords(): readonly CostRecord[] {
    this.ensureLoaded()
    return this.records
  }

  getBudgetConfig(): BudgetConfig {
    return this.budget
  }

  private getRecordsInRange(start: Date, end: Date): readonly CostRecord[] {
    this.ensureLoaded()
    return this.records.filter((r) => {
      const ts = new Date(r.timestamp)
      return ts >= start && ts <= end
    })
  }

  private getGlobalRecordsInRange(start: Date, end: Date): readonly CostRecord[] {
    this.ensureGlobalLoaded()
    return this.globalRecords.filter((r) => {
      const ts = new Date(r.timestamp)
      return ts >= start && ts <= end
    })
  }

  private ensureLoaded(): void {
    if (this.loaded) {
      return
    }
    this.loaded = true
    try {
      if (!fs.existsSync(this.logPath)) {
        return
      }
      const content = fs.readFileSync(this.logPath, 'utf-8')
      const lines = content.trim().split('\n').filter(Boolean)
      this.records = lines.map((line) => JSON.parse(line) as CostRecord)
    } catch (error) {
      console.error('Failed to load cost tracking log:', (error as Error).message)
    }
  }

  private ensureGlobalLoaded(): void {
    if (this.globalLoaded) {
      return
    }
    this.globalLoaded = true
    try {
      if (!fs.existsSync(this.globalLogPath)) {
        return
      }
      const content = fs.readFileSync(this.globalLogPath, 'utf-8')
      const lines = content.trim().split('\n').filter(Boolean)
      this.globalRecords = lines.map((line) => JSON.parse(line) as CostRecord)
    } catch (error) {
      console.error('Failed to load global cost tracking log:', (error as Error).message)
    }
  }

  private appendToLog(record: CostRecord): void {
    try {
      const dir = path.dirname(this.logPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.appendFileSync(this.logPath, JSON.stringify(record) + '\n')
    } catch (error) {
      console.error('Failed to write cost tracking log:', (error as Error).message)
    }
  }

  private appendToGlobalLog(record: CostRecord): void {
    try {
      const dir = path.dirname(this.globalLogPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.appendFileSync(this.globalLogPath, JSON.stringify(record) + '\n')
    } catch (error) {
      console.error('Failed to write global cost tracking log:', (error as Error).message)
    }
  }
}
