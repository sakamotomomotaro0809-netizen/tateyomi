import type {
  ModelType,
  ProviderType,
  TaskComplexity,
  RoutingCriteria,
  ModelRoutingResult,
  ModelRoutingConfig,
  RoutingRule,
  ProviderConfig,
  CodexSuggestion,
} from './types'
import { CostTracker } from './CostTracker'
import { CodexCliHelper } from './CodexCliHelper'

const OLLAMA_HEALTH_TIMEOUT_MS = 2000
const OLLAMA_DEFAULT_URL = 'http://localhost:11434'

const DEFAULT_FALLBACK_CHAIN: readonly ModelType[] = [
  'claude-opus-4-6',
  'claude-sonnet-4-5',
  'codex-cli',
  'claude-haiku-4-5',
  'ollama-qwen3-coder',
  'openrouter-free',
]

const DEFAULT_ROUTING_RULES: readonly RoutingRule[] = [
  {
    taskComplexity: 'trivial',
    preferredModel: 'ollama-qwen3-coder',
    fallbackModels: ['claude-haiku-4-5', 'openrouter-free'],
    maxCostPerRequest: 0.01,
  },
  {
    taskComplexity: 'simple',
    preferredModel: 'claude-haiku-4-5',
    fallbackModels: ['ollama-qwen3-coder', 'openrouter-free'],
    maxCostPerRequest: 0.05,
  },
  {
    taskComplexity: 'moderate',
    preferredModel: 'claude-sonnet-4-5',
    fallbackModels: ['claude-haiku-4-5', 'ollama-qwen3-coder'],
    maxCostPerRequest: 0.20,
  },
  {
    taskComplexity: 'complex',
    preferredModel: 'claude-sonnet-4-5',
    fallbackModels: ['claude-opus-4-6', 'claude-haiku-4-5'],
    maxCostPerRequest: 0.50,
  },
  {
    taskComplexity: 'expert',
    preferredModel: 'claude-opus-4-6',
    fallbackModels: ['claude-sonnet-4-5'],
    maxCostPerRequest: 2.00,
  },
]

const MODEL_PROVIDER_MAP: Record<ModelType, ProviderType> = {
  'opus': 'anthropic-max',
  'sonnet': 'anthropic-api',
  'haiku': 'anthropic-api',
  'claude-opus': 'anthropic-max',
  'claude-sonnet': 'anthropic-api',
  'claude-haiku': 'anthropic-api',
  'claude-opus-4-6': 'anthropic-max',
  'claude-sonnet-4-5': 'anthropic-api',
  'claude-haiku-4-5': 'anthropic-api',
  'ollama-qwen3-coder': 'ollama',
  'ollama-glm4': 'ollama',
  'openrouter-free': 'openrouter',
  'gpt53-codex': 'openai',
  'codex-cli': 'openai',
}

const CODING_TASK_TYPES: readonly string[] = [
  'coding', 'code-generation', 'refactor', 'bug-fix', 'implementation',
  'code-review', 'test-writing', 'debugging',
]

interface ModelRouterOptions {
  readonly costTracker?: CostTracker
  readonly config?: ModelRoutingConfig
  readonly ollamaUrl?: string
  readonly codexCliHelper?: CodexCliHelper
}

export class ModelRouter {
  private readonly costTracker: CostTracker
  private readonly codexCli: CodexCliHelper
  private readonly routingRules: readonly RoutingRule[]
  private readonly fallbackChain: readonly ModelType[]
  private readonly providers: readonly ProviderConfig[]
  private readonly ollamaUrl: string
  private providerHealthCache: Map<ProviderType, { healthy: boolean; checkedAt: number }> = new Map()
  private readonly healthCacheTtlMs = 30_000

  constructor(options: ModelRouterOptions = {}) {
    this.costTracker = options.costTracker ?? new CostTracker()
    this.codexCli = options.codexCliHelper ?? new CodexCliHelper()
    this.routingRules = options.config?.routingRules ?? DEFAULT_ROUTING_RULES
    this.fallbackChain = options.config?.fallbackChain ?? DEFAULT_FALLBACK_CHAIN
    this.providers = options.config?.providers ?? []
    this.ollamaUrl = options.ollamaUrl ?? OLLAMA_DEFAULT_URL
  }

  async route(criteria: RoutingCriteria): Promise<ModelRoutingResult> {
    const budgetStatus = this.costTracker.checkBudget()

    if (budgetStatus.isOverBudget) {
      return this.buildFreeModelResult('Budget exceeded, routing to free model')
    }

    const rule = this.findRoutingRule(criteria.taskComplexity)
    if (!rule) {
      return this.buildDefaultResult('No routing rule found, using default')
    }

    let preferredModel = rule.preferredModel

    if (preferredModel === 'claude-opus' && budgetStatus.isOpusOverLimit) {
      preferredModel = 'claude-sonnet'
    }

    const isPreferredAvailable = await this.isModelAvailable(preferredModel)
    if (isPreferredAvailable) {
      return this.buildResult(
        preferredModel,
        `Matched rule for ${criteria.taskComplexity} complexity`,
        criteria.estimatedTokens
      )
    }

    for (const fallback of rule.fallbackModels) {
      if (fallback === 'claude-opus' && budgetStatus.isOpusOverLimit) {
        continue
      }
      const isAvailable = await this.isModelAvailable(fallback)
      if (isAvailable) {
        return this.buildResult(
          fallback,
          `Fallback: ${preferredModel} unavailable, using ${fallback}`,
          criteria.estimatedTokens
        )
      }
    }

    return this.buildFreeModelResult('All preferred models unavailable')
  }

  private isCodingTask(criteria: RoutingCriteria): boolean {
    if (criteria.taskCategory === 'coding') {
      return true
    }
    if (criteria.taskType && CODING_TASK_TYPES.includes(criteria.taskType)) {
      return true
    }
    return false
  }

  async checkProviderHealth(provider: ProviderType): Promise<boolean> {
    const cached = this.providerHealthCache.get(provider)
    const now = Date.now()
    if (cached && (now - cached.checkedAt) < this.healthCacheTtlMs) {
      return cached.healthy
    }

    let healthy = false

    try {
      if (provider === 'ollama') {
        healthy = await this.checkOllamaHealth()
      } else if (provider === 'anthropic-max' || provider === 'anthropic-api') {
        healthy = !!process.env.ANTHROPIC_API_KEY
      } else if (provider === 'openai') {
        healthy = !!process.env.OPENAI_API_KEY
      } else if (provider === 'openrouter') {
        healthy = !!process.env.OPENROUTER_API_KEY
      }
    } catch {
      healthy = false
    }

    this.providerHealthCache.set(provider, { healthy, checkedAt: now })
    return healthy
  }

  getFallbackModel(currentModel: ModelType): ModelType | null {
    const currentIndex = this.fallbackChain.indexOf(currentModel)
    if (currentIndex === -1 || currentIndex >= this.fallbackChain.length - 1) {
      return null
    }
    return this.fallbackChain[currentIndex + 1]
  }

  getRoutingRules(): readonly RoutingRule[] {
    return this.routingRules
  }

  clearHealthCache(): void {
    this.providerHealthCache.clear()
  }

  async suggestCodex(
    criteria: RoutingCriteria,
    taskDescription?: string
  ): Promise<CodexSuggestion> {
    const isCodexAvailable = this.codexCli.isCliInstalled()
    const normalResult = await this.route(criteria)
    const currentCost = normalResult.estimatedCost
    const codexCost = 0

    const savingsPercent = currentCost > 0 ? 100 : 0

    const isCoding = this.isCodingTask(criteria)
    const isRelevantComplexity = criteria.taskComplexity === 'moderate'
      || criteria.taskComplexity === 'complex'
      || criteria.taskComplexity === 'expert'

    const rateLimit = this.codexCli.getRateLimit()

    const shouldSuggest = isCoding
      && isRelevantComplexity
      && isCodexAvailable
      && !rateLimit.isNearLimit

    let reason: string
    if (!isCoding) {
      reason = 'コーディングタスクではないため、現行モデルを推奨'
    } else if (!isRelevantComplexity) {
      reason = 'タスク複雑度が低いため、現行モデルで十分'
    } else if (!isCodexAvailable) {
      reason = 'Codex CLIが未インストール（npm install -g @openai/codex で導入可能）'
    } else if (rateLimit.isNearLimit) {
      reason = `Codex CLIレート制限に近づいています（${rateLimit.usedInWindow}/${rateLimit.maxInWindow}回、${rateLimit.windowHours}時間枠）`
    } else {
      reason = `コーディングタスク検出: Codex CLIで100%コスト削減（Pro契約に含まれるため$0）`
        + ` 現行: ${normalResult.model} $${currentCost.toFixed(4)}/リクエスト`
        + ` | 残り${rateLimit.maxInWindow - rateLimit.usedInWindow}回/${rateLimit.windowHours}h`
    }

    const cliCommand = taskDescription
      ? this.codexCli.buildCliCommand(taskDescription)
      : undefined

    return {
      shouldSuggest,
      reason,
      currentModel: normalResult.model,
      currentEstimatedCost: currentCost,
      codexEstimatedCost: codexCost,
      savingsPercent,
      isCodexAvailable,
      cliCommand,
      cliRateLimitInfo: rateLimit,
    }
  }

  async routeWithOverride(
    model: ModelType,
    criteria?: RoutingCriteria
  ): Promise<ModelRoutingResult> {
    const isAvailable = await this.isModelAvailable(model)
    if (!isAvailable) {
      const fallback = this.getFallbackModel(model)
      const fallbackModel = fallback ?? 'claude-sonnet'
      return this.buildResult(
        fallbackModel,
        `Manual override: ${model} unavailable, fell back to ${fallbackModel}`,
        criteria?.estimatedTokens
      )
    }

    return this.buildResult(
      model,
      `Manual override: user selected ${model}`,
      criteria?.estimatedTokens
    )
  }

  private async isModelAvailable(model: ModelType): Promise<boolean> {
    const provider = MODEL_PROVIDER_MAP[model]
    if (!provider) {
      return false
    }
    return this.checkProviderHealth(provider)
  }

  private findRoutingRule(complexity: TaskComplexity): RoutingRule | undefined {
    return this.routingRules.find((r) => r.taskComplexity === complexity)
  }

  private estimateCost(model: ModelType, estimatedTokens?: number): number {
    const tokens = estimatedTokens ?? 1000
    return this.costTracker.calculateCost(model, tokens, tokens)
  }

  private buildResult(
    model: ModelType,
    reason: string,
    estimatedTokens?: number
  ): ModelRoutingResult {
    const provider = MODEL_PROVIDER_MAP[model]
    const fallbackModel = this.getFallbackModel(model)
    return {
      model,
      provider,
      reason,
      estimatedCost: this.estimateCost(model, estimatedTokens),
      fallbackAvailable: fallbackModel !== null,
    }
  }

  private buildDefaultResult(reason: string): ModelRoutingResult {
    return this.buildResult('claude-sonnet', reason)
  }

  private buildFreeModelResult(reason: string): ModelRoutingResult {
    return this.buildResult('ollama-qwen3-coder', reason)
  }

  private async checkOllamaHealth(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(
        () => controller.abort(),
        OLLAMA_HEALTH_TIMEOUT_MS
      )

      const response = await fetch(`${this.ollamaUrl}/api/tags`, {
        signal: controller.signal,
      })

      clearTimeout(timeout)
      return response.ok
    } catch {
      return false
    }
  }
}
