/**
 * Performance System Types for TAISUN v2
 *
 * Type definitions for performance optimization, caching, and benchmarking.
 */

/**
 * Model type for task execution
 * Legacy: 'opus' | 'sonnet' | 'haiku' (used by existing PerformanceService)
 * Extended: 'claude-*' + Ollama/OpenRouter/Codex (used by LLM Auto-Switching System)
 */
export type ModelType =
  | 'opus' | 'sonnet' | 'haiku'
  | 'claude-opus' | 'claude-sonnet' | 'claude-haiku'
  | 'claude-opus-4-6' | 'claude-sonnet-4-5' | 'claude-haiku-4-5'
  | 'ollama-qwen3-coder' | 'ollama-glm4'
  | 'openrouter-free'
  | 'gpt53-codex'
  | 'codex-cli';

/**
 * Provider type for LLM routing
 */
export type ProviderType =
  | 'anthropic-max'
  | 'anthropic-api'
  | 'ollama'
  | 'openrouter'
  | 'openai';

/**
 * Task category for routing decisions
 */
export type TaskCategory = 'coding' | 'research' | 'analysis' | 'writing' | 'general';

/**
 * Task complexity level
 */
export type TaskComplexity = 'trivial' | 'simple' | 'moderate' | 'complex' | 'expert';

/**
 * Cache entry with TTL
 */
export interface CacheEntry<T> {
  value: T;
  createdAt: number;
  expiresAt: number;
  hitCount: number;
  lastAccessed: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  maxSize: number;
  defaultTTLMs: number;
  cleanupIntervalMs: number;
  enabled: boolean;
}

/**
 * Agent selection cache entry
 */
export interface AgentSelectionCache {
  keywords: string[];
  selectedAgents: string[];
  score: number;
  timestamp: number;
}

/**
 * Model selection criteria
 */
export interface ModelSelectionCriteria {
  taskComplexity: TaskComplexity;
  estimatedTokens: number;
  requiresReasoning: boolean;
  isCodeGeneration: boolean;
  timeConstraint?: 'urgent' | 'normal' | 'relaxed';
}

/**
 * Model recommendation result
 */
export interface ModelRecommendation {
  model: ModelType;
  confidence: number;
  rationale: string;
  estimatedCost: number;
  estimatedLatencyMs: number;
}

/**
 * Performance metrics snapshot
 */
export interface PerformanceMetrics {
  timestamp: string;
  apiCalls: {
    total: number;
    successful: number;
    failed: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
  };
  tokens: {
    inputTotal: number;
    outputTotal: number;
    avgPerRequest: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
    evictions: number;
  };
  agents: {
    totalExecutions: number;
    parallelExecutions: number;
    avgExecutionTimeMs: number;
    queueDepth: number;
  };
  memory: {
    heapUsedMB: number;
    heapTotalMB: number;
    externalMB: number;
    rssMemoryMB: number;
  };
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  concurrentRequests: number;
  burstAllowance: number;
}

/**
 * Rate limit status
 */
export interface RateLimitStatus {
  requestsRemaining: number;
  tokensRemaining: number;
  resetAtMs: number;
  isLimited: boolean;
  waitTimeMs: number;
}

/**
 * Benchmark scenario
 */
export interface BenchmarkScenario {
  id: string;
  name: string;
  description: string;
  category: 'agent-selection' | 'task-execution' | 'cache' | 'api' | 'memory';
  iterations: number;
  warmupIterations: number;
  timeout: number;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  run: () => Promise<unknown>;
}

/**
 * Benchmark result
 */
export interface BenchmarkResult {
  scenarioId: string;
  timestamp: string;
  iterations: number;
  timing: {
    totalMs: number;
    avgMs: number;
    minMs: number;
    maxMs: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    stdDev: number;
  };
  throughput: {
    operationsPerSecond: number;
    mbPerSecond?: number;
  };
  memory: {
    peakHeapMB: number;
    avgHeapMB: number;
  };
  errors: number;
  success: boolean;
}

/**
 * Benchmark suite configuration
 */
export interface BenchmarkSuiteConfig {
  name: string;
  description: string;
  scenarios: BenchmarkScenario[];
  outputFormat: 'json' | 'markdown' | 'console';
  outputPath?: string;
  baseline?: BenchmarkSuiteResult;
}

/**
 * Benchmark suite result
 */
export interface BenchmarkSuiteResult {
  name: string;
  timestamp: string;
  environment: {
    nodeVersion: string;
    platform: string;
    cpuCount: number;
    totalMemoryMB: number;
  };
  results: BenchmarkResult[];
  summary: {
    totalScenarios: number;
    passed: number;
    failed: number;
    avgThroughput: number;
  };
  comparison?: {
    baselineTimestamp: string;
    improvements: Array<{
      scenarioId: string;
      metric: string;
      baseline: number;
      current: number;
      changePercent: number;
    }>;
    regressions: Array<{
      scenarioId: string;
      metric: string;
      baseline: number;
      current: number;
      changePercent: number;
    }>;
  };
}

/**
 * Optimization recommendation
 */
export interface OptimizationRecommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'cache' | 'model' | 'parallel' | 'api' | 'memory';
  title: string;
  description: string;
  estimatedImpact: string;
  implementation: string;
  effort: 'low' | 'medium' | 'high';
}

/**
 * Performance configuration
 */
export interface PerformanceConfig {
  cache: CacheConfig;
  rateLimit: RateLimitConfig;
  parallelExecution: {
    maxParallelAgents: number;
    maxParallelTasks: number;
    queueTimeout: number;
  };
  modelSelection: {
    defaultModel: ModelType;
    preferHaikuFor: string[];
    preferOpusFor: string[];
    complexityThresholds: {
      trivial: number;
      simple: number;
      moderate: number;
      complex: number;
    };
  };
  monitoring: {
    enabled: boolean;
    sampleRatePercent: number;
    metricsRetentionDays: number;
  };
}

// ====================================================================
// LLM Auto-Switching System Types
// ====================================================================

/**
 * Provider configuration
 */
export interface ProviderConfig {
  readonly name: ProviderType;
  readonly priority: number;
  readonly baseUrl: string;
  readonly apiKeyEnv?: string;
  readonly enabled: boolean;
  readonly healthEndpoint?: string;
}

/**
 * Model cost definition
 */
export interface ModelCost {
  readonly inputPerMillion: number;
  readonly outputPerMillion: number;
  readonly cachedInputPerMillion?: number;
}

/**
 * Model configuration
 */
export interface ModelConfig {
  readonly id: string;
  readonly provider: ProviderType;
  readonly displayName: string;
  readonly cost: ModelCost;
  readonly maxTokens: number;
  readonly supportsCaching?: boolean;
}

/**
 * Routing rule for task complexity
 */
export interface RoutingRule {
  readonly taskComplexity: TaskComplexity;
  readonly preferredModel: ModelType;
  readonly fallbackModels: readonly ModelType[];
  readonly maxCostPerRequest?: number;
}

/**
 * Budget configuration
 */
export interface BudgetConfig {
  readonly monthlyLimit: number;
  readonly dailyLimit: number;
  readonly warningThresholdPercent: number;
  readonly hardLimitAction: 'fallback-to-free' | 'block' | 'warn';
  readonly globalMonthlyLimit?: number;
  readonly globalDailyLimit?: number;
  readonly opusDailyLimit?: number;
  readonly opusMonthlyLimit?: number;
}

/**
 * Cost record for tracking
 */
export interface CostRecord {
  readonly timestamp: string;
  readonly model: ModelType;
  readonly provider: ProviderType;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cachedTokens: number;
  readonly cost: number;
  readonly taskType?: string;
  readonly projectId?: string;
}

/**
 * Budget status
 */
export interface BudgetStatus {
  readonly isOverBudget: boolean;
  readonly dailySpend: number;
  readonly monthlySpend: number;
  readonly dailyRemaining: number;
  readonly monthlyRemaining: number;
  readonly percentUsed: number;
  readonly globalDailySpend?: number;
  readonly globalMonthlySpend?: number;
  readonly isGlobalOverBudget?: boolean;
  readonly opusDailySpend?: number;
  readonly isOpusOverLimit?: boolean;
}

/**
 * Routing criteria for ModelRouter (distinct from ModelSelectionCriteria used by PerformanceService)
 */
export interface RoutingCriteria {
  readonly taskComplexity: TaskComplexity;
  readonly taskType?: string;
  readonly taskCategory?: TaskCategory;
  readonly estimatedTokens?: number;
  readonly requiresStreaming?: boolean;
  readonly requiresCaching?: boolean;
}

/**
 * Model routing result
 */
export interface ModelRoutingResult {
  readonly model: ModelType;
  readonly provider: ProviderType;
  readonly reason: string;
  readonly estimatedCost: number;
  readonly fallbackAvailable: boolean;
}

/**
 * Codex CLI suggestion
 */
export interface CodexSuggestion {
  readonly shouldSuggest: boolean;
  readonly reason: string;
  readonly currentModel: ModelType;
  readonly currentEstimatedCost: number;
  readonly codexEstimatedCost: number;
  readonly savingsPercent: number;
  readonly isCodexAvailable: boolean;
  readonly cliCommand?: string;
  readonly cliRateLimitInfo?: CodexCliRateLimit;
}

/**
 * Codex CLI rate limit info
 */
export interface CodexCliRateLimit {
  readonly usedInWindow: number;
  readonly maxInWindow: number;
  readonly windowHours: number;
  readonly isNearLimit: boolean;
}

/**
 * Model routing configuration
 */
export interface ModelRoutingConfig {
  readonly providers: readonly ProviderConfig[];
  readonly models: Record<ModelType, ModelConfig>;
  readonly routingRules: readonly RoutingRule[];
  readonly budget: BudgetConfig;
  readonly fallbackChain: readonly ModelType[];
}

/**
 * Cost report
 */
export interface CostReport {
  readonly period: 'day' | 'week' | 'month';
  readonly totalCost: number;
  readonly byModel: Record<string, number>;
  readonly byProvider: Record<string, number>;
  readonly requestCount: number;
  readonly averageCostPerRequest: number;
  readonly budgetStatus: BudgetStatus;
}
