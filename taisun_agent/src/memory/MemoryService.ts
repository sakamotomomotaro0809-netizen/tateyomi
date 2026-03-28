/**
 * Memory Service for TAISUN v2
 *
 * Core service for managing agent statistics, task records, and analytics.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import {
  AgentStats,
  AgentSummary,
  DailyTrend,
  ErrorPattern,
  ExportFormat,
  MemoryConfig,
  ReportType,
  SkillUsage,
  SystemStats,
  TaskCategory,
  TaskRecord,
} from './types';

/**
 * Default memory configuration
 */
const DEFAULT_CONFIG: MemoryConfig = {
  version: '2.0',
  maxTasks: 1000,
  retentionDays: 90,
  backupEnabled: true,
  backupPath: '.claude/memory-backup/',
  backupIntervalDays: 7,
  qualityThreshold: {
    excellent: 90,
    good: 75,
    acceptable: 60,
    poor: 0,
  },
  successRateThreshold: {
    preferred: 0.85,
    acceptable: 0.7,
    warning: 0.5,
  },
  recentTasksLimit: 10,
  taskTypes: [
    'implementation',
    'bug-fix',
    'refactoring',
    'testing',
    'documentation',
    'deployment',
    'optimization',
    'security',
    'integration',
    'migration',
    'analysis',
    'design',
  ],
};

/**
 * Memory Service class
 */
export class MemoryService {
  private basePath: string;
  private config: MemoryConfig;
  private agentStatsCache: Map<string, AgentStats> = new Map();

  constructor(basePath: string = '.claude/memory') {
    this.basePath = basePath;
    this.config = this.loadConfig();
  }

  /**
   * Load memory configuration
   */
  private loadConfig(): MemoryConfig {
    const configPath = path.join(this.basePath, 'config.yaml');

    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      const rawConfig = yaml.parse(content);

      return {
        version: rawConfig.version || DEFAULT_CONFIG.version,
        maxTasks: rawConfig.max_tasks || DEFAULT_CONFIG.maxTasks,
        retentionDays: rawConfig.retention_days || DEFAULT_CONFIG.retentionDays,
        backupEnabled: rawConfig.backup_enabled ?? DEFAULT_CONFIG.backupEnabled,
        backupPath: rawConfig.backup_path || DEFAULT_CONFIG.backupPath,
        backupIntervalDays: rawConfig.backup_interval_days || DEFAULT_CONFIG.backupIntervalDays,
        qualityThreshold: rawConfig.quality_threshold || DEFAULT_CONFIG.qualityThreshold,
        successRateThreshold: rawConfig.success_rate_threshold || DEFAULT_CONFIG.successRateThreshold,
        recentTasksLimit: rawConfig.recent_tasks_limit || DEFAULT_CONFIG.recentTasksLimit,
        taskTypes: rawConfig.task_types || DEFAULT_CONFIG.taskTypes,
      };
    }

    return DEFAULT_CONFIG;
  }

  /**
   * Get all agent names
   */
  getAgentNames(): string[] {
    const agentsPath = path.join(this.basePath, 'agents');

    if (!fs.existsSync(agentsPath)) {
      return [];
    }

    return fs
      .readdirSync(agentsPath)
      .filter((f) => f.endsWith('-stats.yaml'))
      .map((f) => f.replace('-stats.yaml', ''));
  }

  /**
   * Load agent statistics
   */
  loadAgentStats(agentName: string): AgentStats | null {
    // Check cache first
    if (this.agentStatsCache.has(agentName)) {
      return this.agentStatsCache.get(agentName)!;
    }

    const statsPath = path.join(this.basePath, 'agents', `${agentName}-stats.yaml`);

    if (!fs.existsSync(statsPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(statsPath, 'utf-8');
      const rawStats = yaml.parse(content);

      const stats: AgentStats = {
        agentName: rawStats.agent_name || agentName,
        totalTasks: rawStats.total_tasks || 0,
        successfulTasks: rawStats.successful_tasks || 0,
        failedTasks: rawStats.failed_tasks || 0,
        successRate: rawStats.success_rate || 0,
        avgQualityScore: rawStats.avg_quality_score || 0,
        avgDurationMs: rawStats.avg_duration_ms || 0,
        lastUpdated: rawStats.last_updated || new Date().toISOString(),
        recentTasks: rawStats.recent_tasks || [],
        trends: {
          successRateTrend: rawStats.trends?.success_rate_trend || 0,
          qualityScoreTrend: rawStats.trends?.quality_score_trend || 0,
          avgDurationTrend: rawStats.trends?.avg_duration_trend || 0,
        },
        specializations: rawStats.specializations || {},
        omegaMetrics: rawStats.omega_metrics || this.getDefaultOmegaMetrics(),
        learningMetrics: rawStats.learning_metrics || this.getDefaultLearningMetrics(),
        metadata: rawStats.metadata || this.getDefaultMetadata(),
      };

      this.agentStatsCache.set(agentName, stats);
      return stats;
    } catch (error) {
      console.error(`Failed to load stats for ${agentName}:`, error);
      return null;
    }
  }

  /**
   * Get all agent statistics
   */
  getAllAgentStats(): AgentStats[] {
    const agentNames = this.getAgentNames();
    return agentNames.map((name) => this.loadAgentStats(name)).filter((s): s is AgentStats => s !== null);
  }

  /**
   * Calculate system-wide statistics
   */
  getSystemStats(): SystemStats {
    const allStats = this.getAllAgentStats();

    const totalTasks = allStats.reduce((sum, s) => sum + s.totalTasks, 0);
    const successfulTasks = allStats.reduce((sum, s) => sum + s.successfulTasks, 0);
    const overallSuccessRate = totalTasks > 0 ? successfulTasks / totalTasks : 0;

    const qualityScores = allStats.filter((s) => s.avgQualityScore > 0).map((s) => s.avgQualityScore);
    const avgQualityScore =
      qualityScores.length > 0 ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length : 0;

    // Sort by success rate for top performers
    const sortedBySuccess = [...allStats].sort((a, b) => b.successRate - a.successRate);

    const topPerformers: AgentSummary[] = sortedBySuccess.slice(0, 5).map((s) => ({
      name: s.agentName,
      successRate: s.successRate,
      avgQualityScore: s.avgQualityScore,
      totalTasks: s.totalTasks,
      health: s.metadata.overallHealth,
    }));

    // Find agents needing attention (poor health or low success rate)
    const needsAttention: AgentSummary[] = allStats
      .filter(
        (s) =>
          s.metadata.overallHealth === 'poor' ||
          s.metadata.overallHealth === 'fair' ||
          s.successRate < this.config.successRateThreshold.warning
      )
      .map((s) => ({
        name: s.agentName,
        successRate: s.successRate,
        avgQualityScore: s.avgQualityScore,
        totalTasks: s.totalTasks,
        health: s.metadata.overallHealth,
      }));

    // Calculate task distribution
    const taskDistribution: Record<TaskCategory, number> = {} as Record<TaskCategory, number>;
    for (const stats of allStats) {
      for (const [category, count] of Object.entries(stats.specializations)) {
        taskDistribution[category as TaskCategory] =
          (taskDistribution[category as TaskCategory] || 0) + (count as number);
      }
    }

    return {
      totalAgents: allStats.length,
      totalTasks,
      overallSuccessRate,
      avgQualityScore,
      topPerformers,
      needsAttention,
      taskDistribution,
      dailyTrends: this.calculateDailyTrends(allStats),
      skillUsage: this.calculateSkillUsage(),
      errorPatterns: this.analyzeErrorPatterns(allStats),
    };
  }

  /**
   * Calculate daily trends from agent stats
   */
  private calculateDailyTrends(allStats: AgentStats[]): DailyTrend[] {
    const trends: DailyTrend[] = [];
    const today = new Date();

    // Generate last 30 days of trends
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Aggregate stats for this date (simplified - in real implementation would query task records)
      let totalTasks = 0;
      let successfulTasks = 0;
      let qualitySum = 0;
      let qualityCount = 0;

      for (const stats of allStats) {
        for (const task of stats.recentTasks) {
          if (task.completedAt?.startsWith(dateStr)) {
            totalTasks++;
            if (task.status === 'completed') {
              successfulTasks++;
            }
            if (task.qualityScore !== null) {
              qualitySum += task.qualityScore;
              qualityCount++;
            }
          }
        }
      }

      trends.push({
        date: dateStr,
        totalTasks,
        successfulTasks,
        avgQualityScore: qualityCount > 0 ? qualitySum / qualityCount : 0,
      });
    }

    return trends;
  }

  /**
   * Calculate skill usage statistics
   */
  private calculateSkillUsage(): SkillUsage[] {
    // This would be populated from actual skill invocation logs
    // For now, return sample data structure
    return [];
  }

  /**
   * Analyze error patterns across agents
   */
  private analyzeErrorPatterns(allStats: AgentStats[]): ErrorPattern[] {
    const errorCounts: Map<string, { count: number; agents: Set<string>; lastOccurrence: string }> = new Map();

    for (const stats of allStats) {
      for (const task of stats.recentTasks) {
        if (task.error) {
          const pattern = this.normalizeError(task.error);
          const existing = errorCounts.get(pattern) || {
            count: 0,
            agents: new Set<string>(),
            lastOccurrence: '',
          };

          existing.count++;
          existing.agents.add(stats.agentName);
          if (!existing.lastOccurrence || task.completedAt! > existing.lastOccurrence) {
            existing.lastOccurrence = task.completedAt || '';
          }

          errorCounts.set(pattern, existing);
        }
      }
    }

    return Array.from(errorCounts.entries())
      .map(([pattern, data]) => ({
        pattern,
        count: data.count,
        affectedAgents: Array.from(data.agents),
        lastOccurrence: data.lastOccurrence,
        suggestedFix: this.suggestFix(pattern),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Normalize error message for pattern matching
   */
  private normalizeError(error: string): string {
    // Remove specific file paths, line numbers, etc.
    return error
      .replace(/\/[^\s]+/g, '<path>')
      .replace(/line \d+/gi, 'line <N>')
      .replace(/\d+/g, '<N>')
      .substring(0, 100);
  }

  /**
   * Suggest fix for common error patterns
   */
  private suggestFix(pattern: string): string {
    const fixes: Record<string, string> = {
      timeout: 'Increase timeout or optimize task complexity',
      'not found': 'Verify file/resource existence before operation',
      permission: 'Check file/directory permissions',
      'syntax error': 'Validate input/code before processing',
      'network error': 'Add retry logic and error handling',
    };

    for (const [key, fix] of Object.entries(fixes)) {
      if (pattern.toLowerCase().includes(key)) {
        return fix;
      }
    }

    return 'Review error details and add specific handling';
  }

  /**
   * Export data in various formats
   */
  exportData(format: ExportFormat, outputPath: string): void {
    const systemStats = this.getSystemStats();
    const allAgentStats = this.getAllAgentStats();

    const data = {
      exportDate: new Date().toISOString(),
      system: systemStats,
      agents: allAgentStats,
    };

    let content: string;

    switch (format) {
      case 'json':
        content = JSON.stringify(data, null, 2);
        break;
      case 'yaml':
        content = yaml.stringify(data);
        break;
      case 'csv':
        content = this.convertToCSV(allAgentStats);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    fs.writeFileSync(outputPath, content);
  }

  /**
   * Convert agent stats to CSV format
   */
  private convertToCSV(agents: AgentStats[]): string {
    const headers = [
      'agent_name',
      'total_tasks',
      'successful_tasks',
      'failed_tasks',
      'success_rate',
      'avg_quality_score',
      'avg_duration_ms',
      'health',
      'last_updated',
    ];

    const rows = agents.map((a) => [
      a.agentName,
      a.totalTasks,
      a.successfulTasks,
      a.failedTasks,
      a.successRate.toFixed(4),
      a.avgQualityScore.toFixed(2),
      a.avgDurationMs,
      a.metadata.overallHealth,
      a.lastUpdated,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Generate CLI report
   */
  generateReport(type: ReportType = 'summary'): string {
    const systemStats = this.getSystemStats();

    switch (type) {
      case 'summary':
        return this.generateSummaryReport(systemStats);
      case 'detailed':
        return this.generateDetailedReport(systemStats);
      case 'trends':
        return this.generateTrendsReport(systemStats);
      case 'errors':
        return this.generateErrorsReport(systemStats);
      default:
        return this.generateSummaryReport(systemStats);
    }
  }

  /**
   * Generate summary report
   */
  private generateSummaryReport(stats: SystemStats): string {
    const lines: string[] = [];

    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('                    TAISUN v2 Memory Dashboard                   ');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    lines.push('┌─────────────────────────────────────────────────────────────┐');
    lines.push('│  System Overview                                            │');
    lines.push('├─────────────────────────────────────────────────────────────┤');
    lines.push(`│  Total Agents:        ${String(stats.totalAgents).padStart(6)}                              │`);
    lines.push(`│  Total Tasks:         ${String(stats.totalTasks).padStart(6)}                              │`);
    lines.push(`│  Success Rate:        ${(stats.overallSuccessRate * 100).toFixed(1).padStart(6)}%                             │`);
    lines.push(`│  Avg Quality Score:   ${stats.avgQualityScore.toFixed(1).padStart(6)}                              │`);
    lines.push('└─────────────────────────────────────────────────────────────┘');
    lines.push('');

    if (stats.topPerformers.length > 0) {
      lines.push('┌─────────────────────────────────────────────────────────────┐');
      lines.push('│  Top Performers                                             │');
      lines.push('├─────────────────────────────────────────────────────────────┤');
      for (const agent of stats.topPerformers.slice(0, 5)) {
        const name = agent.name.substring(0, 25).padEnd(25);
        const rate = (agent.successRate * 100).toFixed(1).padStart(6);
        const quality = agent.avgQualityScore.toFixed(1).padStart(5);
        lines.push(`│  ${name} ${rate}%  Q:${quality}  │`);
      }
      lines.push('└─────────────────────────────────────────────────────────────┘');
      lines.push('');
    }

    if (stats.needsAttention.length > 0) {
      lines.push('┌─────────────────────────────────────────────────────────────┐');
      lines.push('│  ⚠ Needs Attention                                          │');
      lines.push('├─────────────────────────────────────────────────────────────┤');
      for (const agent of stats.needsAttention.slice(0, 5)) {
        const name = agent.name.substring(0, 25).padEnd(25);
        const rate = (agent.successRate * 100).toFixed(1).padStart(6);
        const health = agent.health.padEnd(8);
        lines.push(`│  ${name} ${rate}%  ${health} │`);
      }
      lines.push('└─────────────────────────────────────────────────────────────┘');
    }

    lines.push('');
    lines.push(`Report generated: ${new Date().toISOString()}`);

    return lines.join('\n');
  }

  /**
   * Generate detailed report
   */
  private generateDetailedReport(_stats: SystemStats): string {
    const allAgents = this.getAllAgentStats();
    const lines: string[] = [];

    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('                TAISUN v2 Detailed Agent Report                 ');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');

    for (const agent of allAgents) {
      lines.push(`┌─────────────────────────────────────────────────────────────┐`);
      lines.push(`│  ${agent.agentName.padEnd(57)} │`);
      lines.push(`├─────────────────────────────────────────────────────────────┤`);
      lines.push(`│  Tasks: ${agent.totalTasks} (${agent.successfulTasks} success, ${agent.failedTasks} failed)`.padEnd(62) + '│');
      lines.push(`│  Success Rate: ${(agent.successRate * 100).toFixed(1)}%`.padEnd(62) + '│');
      lines.push(`│  Quality Score: ${agent.avgQualityScore.toFixed(1)}`.padEnd(62) + '│');
      lines.push(`│  Health: ${agent.metadata.overallHealth}`.padEnd(62) + '│');
      lines.push(`└─────────────────────────────────────────────────────────────┘`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate trends report
   */
  private generateTrendsReport(stats: SystemStats): string {
    const lines: string[] = [];

    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('                   TAISUN v2 Trends Report                      ');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    lines.push('Daily Activity (Last 30 Days):');
    lines.push('');
    lines.push('Date        Tasks  Success  Avg Quality');
    lines.push('──────────  ─────  ───────  ───────────');

    for (const trend of stats.dailyTrends.slice(-14)) {
      // Show last 14 days
      const date = trend.date;
      const tasks = String(trend.totalTasks).padStart(5);
      const success = String(trend.successfulTasks).padStart(7);
      const quality = trend.avgQualityScore > 0 ? trend.avgQualityScore.toFixed(1).padStart(11) : '        N/A';
      lines.push(`${date}  ${tasks}  ${success}  ${quality}`);
    }

    return lines.join('\n');
  }

  /**
   * Generate errors report
   */
  private generateErrorsReport(stats: SystemStats): string {
    const lines: string[] = [];

    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('                   TAISUN v2 Error Analysis                     ');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');

    if (stats.errorPatterns.length === 0) {
      lines.push('No error patterns detected in recent tasks.');
    } else {
      for (const error of stats.errorPatterns) {
        lines.push(`Pattern: ${error.pattern}`);
        lines.push(`  Count: ${error.count}`);
        lines.push(`  Affected Agents: ${error.affectedAgents.join(', ')}`);
        lines.push(`  Suggested Fix: ${error.suggestedFix}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Get default Omega metrics
   */
  private getDefaultOmegaMetrics(): AgentStats['omegaMetrics'] {
    return {
      performanceBounds: {
        minQualityScore: 0,
        minSuccessRate: 0,
        maxLatencyMs: 0,
        worstCase: {
          qualityScore: 0,
          successRate: 0,
          latencyMs: 0,
        },
      },
      dependencies: {
        omega: 0,
        littleOmega: 0,
        couplingRatio: 1,
        dependenciesList: {
          tools: [],
          agents: [],
          external: [],
        },
        couplingHealth: {
          status: 'good',
          recommendation: '',
        },
      },
      completionProbability: {
        baseOmega: 0,
        byComplexity: {
          low: 0,
          medium: 0,
          high: 0,
        },
        byCategory: {} as Record<TaskCategory, number>,
        confidenceInterval: 0.05,
        sampleSize: 0,
        predictionAccuracy: {
          totalPredictions: 0,
          accuratePredictions: 0,
          accuracyRate: 0,
        },
      },
    };
  }

  /**
   * Get default learning metrics
   */
  private getDefaultLearningMetrics(): AgentStats['learningMetrics'] {
    return {
      learningRate: 0.1,
      qualityTrend: {
        direction: 'stable',
        rate: 0,
      },
      successTrend: {
        direction: 'stable',
        rate: 0,
      },
      specialization: {
        primaryCategory: '',
        specializationScore: 0,
        categories: {} as Record<TaskCategory, number>,
      },
    };
  }

  /**
   * Get default metadata
   */
  private getDefaultMetadata(): AgentStats['metadata'] {
    return {
      lastUpdated: new Date().toISOString(),
      schemaVersion: '2.0.0',
      omegaIntegrationDate: new Date().toISOString().split('T')[0],
      passesQualityGates: {
        minQuality: false,
        minSuccessRate: false,
        acceptableCoupling: true,
      },
      overallHealth: 'unknown',
    };
  }

  /**
   * Save agent statistics
   */
  saveAgentStats(stats: AgentStats): void {
    const agentsPath = path.join(this.basePath, 'agents');

    // Ensure directory exists
    if (!fs.existsSync(agentsPath)) {
      fs.mkdirSync(agentsPath, { recursive: true });
    }

    const statsPath = path.join(agentsPath, `${stats.agentName}-stats.yaml`);

    // Convert to snake_case for YAML
    const yamlData = {
      agent_name: stats.agentName,
      total_tasks: stats.totalTasks,
      successful_tasks: stats.successfulTasks,
      failed_tasks: stats.failedTasks,
      success_rate: stats.successRate,
      avg_quality_score: stats.avgQualityScore,
      avg_duration_ms: stats.avgDurationMs,
      last_updated: new Date().toISOString(),
      recent_tasks: stats.recentTasks.slice(0, this.config.recentTasksLimit),
      trends: {
        success_rate_trend: stats.trends.successRateTrend,
        quality_score_trend: stats.trends.qualityScoreTrend,
        avg_duration_trend: stats.trends.avgDurationTrend,
      },
      specializations: stats.specializations,
      omega_metrics: stats.omegaMetrics,
      learning_metrics: stats.learningMetrics,
      metadata: stats.metadata,
    };

    fs.writeFileSync(statsPath, yaml.stringify(yamlData));

    // Update cache
    stats.lastUpdated = yamlData.last_updated;
    this.agentStatsCache.set(stats.agentName, stats);
  }

  /**
   * Record a new task for an agent
   */
  recordTask(agentName: string, task: TaskRecord): void {
    let stats = this.loadAgentStats(agentName);

    if (!stats) {
      // Create new agent stats
      stats = {
        agentName,
        totalTasks: 0,
        successfulTasks: 0,
        failedTasks: 0,
        successRate: 0,
        avgQualityScore: 0,
        avgDurationMs: 0,
        lastUpdated: new Date().toISOString(),
        recentTasks: [],
        trends: {
          successRateTrend: 0,
          qualityScoreTrend: 0,
          avgDurationTrend: 0,
        },
        specializations: {} as Record<TaskCategory, number>,
        omegaMetrics: this.getDefaultOmegaMetrics(),
        learningMetrics: this.getDefaultLearningMetrics(),
        metadata: this.getDefaultMetadata(),
      };
    }

    // Update task counts
    stats.totalTasks++;
    if (task.status === 'completed') {
      stats.successfulTasks++;
    } else if (task.status === 'failed') {
      stats.failedTasks++;
    }

    // Update success rate
    stats.successRate = stats.successfulTasks / stats.totalTasks;

    // Update average quality score
    if (task.qualityScore !== null) {
      const totalQuality = stats.avgQualityScore * (stats.totalTasks - 1) + task.qualityScore;
      stats.avgQualityScore = totalQuality / stats.totalTasks;
    }

    // Update average duration
    if (task.durationMs !== null) {
      const totalDuration = stats.avgDurationMs * (stats.totalTasks - 1) + task.durationMs;
      stats.avgDurationMs = totalDuration / stats.totalTasks;
    }

    // Update specializations
    stats.specializations[task.category] = (stats.specializations[task.category] || 0) + 1;

    // Add to recent tasks (keep limited)
    stats.recentTasks.unshift(task);
    stats.recentTasks = stats.recentTasks.slice(0, this.config.recentTasksLimit);

    // Update health status
    stats.metadata.overallHealth = this.calculateHealth(stats);
    stats.metadata.passesQualityGates = {
      minQuality: stats.avgQualityScore >= this.config.qualityThreshold.acceptable,
      minSuccessRate: stats.successRate >= this.config.successRateThreshold.acceptable,
      acceptableCoupling: true,
    };

    this.saveAgentStats(stats);
  }

  /**
   * Calculate overall health status
   */
  private calculateHealth(
    stats: AgentStats
  ): 'excellent' | 'good' | 'fair' | 'poor' | 'unknown' {
    if (stats.totalTasks < 3) {
      return 'unknown';
    }

    const qualityScore = stats.avgQualityScore;
    const successRate = stats.successRate;

    if (
      qualityScore >= this.config.qualityThreshold.excellent &&
      successRate >= this.config.successRateThreshold.preferred
    ) {
      return 'excellent';
    }

    if (
      qualityScore >= this.config.qualityThreshold.good &&
      successRate >= this.config.successRateThreshold.acceptable
    ) {
      return 'good';
    }

    if (
      qualityScore >= this.config.qualityThreshold.acceptable &&
      successRate >= this.config.successRateThreshold.warning
    ) {
      return 'fair';
    }

    return 'poor';
  }

  /**
   * Create backup of memory data
   */
  createBackup(): string {
    const backupDir = path.join(this.basePath, '..', this.config.backupPath);

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

    this.exportData('json', backupFile);

    return backupFile;
  }

  /**
   * Cleanup old tasks beyond retention period
   */
  cleanupOldTasks(): number {
    let cleanedCount = 0;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
    const cutoffStr = cutoffDate.toISOString();

    const allAgents = this.getAllAgentStats();

    for (const stats of allAgents) {
      const originalCount = stats.recentTasks.length;
      stats.recentTasks = stats.recentTasks.filter(
        (task) => !task.completedAt || task.completedAt >= cutoffStr
      );

      if (stats.recentTasks.length < originalCount) {
        cleanedCount += originalCount - stats.recentTasks.length;
        this.saveAgentStats(stats);
      }
    }

    return cleanedCount;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.agentStatsCache.clear();
  }

  /**
   * Get configuration
   */
  getConfig(): MemoryConfig {
    return { ...this.config };
  }
}

/**
 * Export singleton instance
 */
export const memoryService = new MemoryService();
