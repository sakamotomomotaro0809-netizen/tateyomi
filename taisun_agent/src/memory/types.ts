/**
 * Memory System Types for TAISUN v2
 *
 * Type definitions for agent statistics, task records, and analytics.
 */

/**
 * Quality threshold levels
 */
export interface QualityThreshold {
  excellent: number;
  good: number;
  acceptable: number;
  poor: number;
}

/**
 * Success rate thresholds for agent selection
 */
export interface SuccessRateThreshold {
  preferred: number;
  acceptable: number;
  warning: number;
}

/**
 * Memory system configuration
 */
export interface MemoryConfig {
  version: string;
  maxTasks: number;
  retentionDays: number;
  backupEnabled: boolean;
  backupPath: string;
  backupIntervalDays: number;
  qualityThreshold: QualityThreshold;
  successRateThreshold: SuccessRateThreshold;
  recentTasksLimit: number;
  taskTypes: string[];
}

/**
 * Task status
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

/**
 * Task complexity level
 */
export type ComplexityLevel = 'low' | 'medium' | 'high';

/**
 * Task category
 */
export type TaskCategory =
  | 'implementation'
  | 'bug-fix'
  | 'refactoring'
  | 'testing'
  | 'documentation'
  | 'deployment'
  | 'optimization'
  | 'security'
  | 'integration'
  | 'migration'
  | 'analysis'
  | 'design';

/**
 * Individual task record
 */
export interface TaskRecord {
  id: string;
  agentName: string;
  description: string;
  category: TaskCategory;
  complexity: number; // 1-10
  status: TaskStatus;
  qualityScore: number | null;
  durationMs: number | null;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
  metadata: Record<string, unknown>;
}

/**
 * Omega performance bounds
 */
export interface OmegaPerformanceBounds {
  minQualityScore: number;
  minSuccessRate: number;
  maxLatencyMs: number;
  worstCase: {
    qualityScore: number;
    successRate: number;
    latencyMs: number;
  };
}

/**
 * Dependency analysis
 */
export interface DependencyAnalysis {
  omega: number; // Total dependencies
  littleOmega: number; // Unique dependencies
  couplingRatio: number;
  dependenciesList: {
    tools: string[];
    agents: string[];
    external: string[];
  };
  couplingHealth: {
    status: 'good' | 'fair' | 'poor';
    recommendation: string;
  };
}

/**
 * Completion probability by various factors
 */
export interface CompletionProbability {
  baseOmega: number;
  byComplexity: {
    low: number;
    medium: number;
    high: number;
  };
  byCategory: Record<TaskCategory, number>;
  confidenceInterval: number;
  sampleSize: number;
  predictionAccuracy: {
    totalPredictions: number;
    accuratePredictions: number;
    accuracyRate: number;
  };
}

/**
 * Omega metrics for an agent
 */
export interface OmegaMetrics {
  performanceBounds: OmegaPerformanceBounds;
  dependencies: DependencyAnalysis;
  completionProbability: CompletionProbability;
}

/**
 * Learning metrics for an agent
 */
export interface LearningMetrics {
  learningRate: number;
  qualityTrend: {
    direction: 'improving' | 'stable' | 'declining';
    rate: number;
  };
  successTrend: {
    direction: 'improving' | 'stable' | 'declining';
    rate: number;
  };
  specialization: {
    primaryCategory: TaskCategory | '';
    specializationScore: number;
    categories: Record<TaskCategory, number>;
  };
}

/**
 * Agent statistics
 */
export interface AgentStats {
  agentName: string;
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  successRate: number;
  avgQualityScore: number;
  avgDurationMs: number;
  lastUpdated: string;
  recentTasks: TaskRecord[];
  trends: {
    successRateTrend: number;
    qualityScoreTrend: number;
    avgDurationTrend: number;
  };
  specializations: Record<TaskCategory, number>;
  omegaMetrics: OmegaMetrics;
  learningMetrics: LearningMetrics;
  metadata: {
    lastUpdated: string;
    schemaVersion: string;
    omegaIntegrationDate: string;
    passesQualityGates: {
      minQuality: boolean;
      minSuccessRate: boolean;
      acceptableCoupling: boolean;
    };
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  };
}

/**
 * Aggregated system statistics
 */
export interface SystemStats {
  totalAgents: number;
  totalTasks: number;
  overallSuccessRate: number;
  avgQualityScore: number;
  topPerformers: AgentSummary[];
  needsAttention: AgentSummary[];
  taskDistribution: Record<TaskCategory, number>;
  dailyTrends: DailyTrend[];
  skillUsage: SkillUsage[];
  errorPatterns: ErrorPattern[];
}

/**
 * Agent summary for reports
 */
export interface AgentSummary {
  name: string;
  successRate: number;
  avgQualityScore: number;
  totalTasks: number;
  health: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
}

/**
 * Daily trend data point
 */
export interface DailyTrend {
  date: string;
  totalTasks: number;
  successfulTasks: number;
  avgQualityScore: number;
}

/**
 * Skill usage statistics
 */
export interface SkillUsage {
  skillName: string;
  usageCount: number;
  successRate: number;
  avgDurationMs: number;
}

/**
 * Error pattern analysis
 */
export interface ErrorPattern {
  pattern: string;
  count: number;
  affectedAgents: string[];
  lastOccurrence: string;
  suggestedFix: string;
}

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'csv' | 'yaml';

/**
 * Report type options
 */
export type ReportType = 'summary' | 'detailed' | 'trends' | 'errors';
