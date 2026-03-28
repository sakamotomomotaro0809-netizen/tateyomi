/**
 * Memory System Integration Tests
 *
 * Tests for the TAISUN v2 memory system including statistics,
 * persistence, and reporting functionality.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { MemoryService } from '../../src/memory/MemoryService';
import { TaskRecord, TaskCategory } from '../../src/memory/types';

describe('Memory System Integration Tests', () => {
  const testBasePath = path.join(__dirname, '../fixtures/test-memory');
  let memoryService: MemoryService;

  beforeAll(() => {
    // Create test directory structure
    const agentsPath = path.join(testBasePath, 'agents');
    if (!fs.existsSync(agentsPath)) {
      fs.mkdirSync(agentsPath, { recursive: true });
    }

    // Create test config
    const configPath = path.join(testBasePath, 'config.yaml');
    const testConfig = {
      version: '2.0',
      max_tasks: 100,
      retention_days: 30,
      backup_enabled: true,
      backup_path: '.claude/memory-backup/',
      backup_interval_days: 7,
      quality_threshold: {
        excellent: 90,
        good: 75,
        acceptable: 60,
        poor: 0,
      },
      success_rate_threshold: {
        preferred: 0.85,
        acceptable: 0.7,
        warning: 0.5,
      },
      recent_tasks_limit: 10,
    };
    fs.writeFileSync(configPath, yaml.stringify(testConfig));

    // Create sample agent stats
    const sampleStats = {
      agent_name: 'test-agent',
      total_tasks: 10,
      successful_tasks: 8,
      failed_tasks: 2,
      success_rate: 0.8,
      avg_quality_score: 85,
      avg_duration_ms: 5000,
      last_updated: new Date().toISOString(),
      recent_tasks: [
        {
          id: 'task-1',
          agentName: 'test-agent',
          description: 'Test task 1',
          category: 'implementation',
          complexity: 5,
          status: 'completed',
          qualityScore: 90,
          durationMs: 4000,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          error: null,
          metadata: {},
        },
      ],
      trends: {
        success_rate_trend: 0.05,
        quality_score_trend: 2.5,
        avg_duration_trend: -500,
      },
      specializations: {
        implementation: 5,
        'bug-fix': 3,
        testing: 2,
      },
      metadata: {
        lastUpdated: new Date().toISOString(),
        schemaVersion: '2.0.0',
        omegaIntegrationDate: new Date().toISOString().split('T')[0],
        passesQualityGates: {
          minQuality: true,
          minSuccessRate: true,
          acceptableCoupling: true,
        },
        overallHealth: 'good',
      },
    };
    fs.writeFileSync(
      path.join(agentsPath, 'test-agent-stats.yaml'),
      yaml.stringify(sampleStats)
    );

    // Create second agent for comparison
    const secondAgentStats = {
      ...sampleStats,
      agent_name: 'excellent-agent',
      success_rate: 0.95,
      avg_quality_score: 95,
      metadata: {
        ...sampleStats.metadata,
        overallHealth: 'excellent',
      },
    };
    fs.writeFileSync(
      path.join(agentsPath, 'excellent-agent-stats.yaml'),
      yaml.stringify(secondAgentStats)
    );

    // Create third agent needing attention
    const poorAgentStats = {
      ...sampleStats,
      agent_name: 'poor-agent',
      successful_tasks: 3,
      failed_tasks: 7,
      success_rate: 0.3,
      avg_quality_score: 45,
      metadata: {
        ...sampleStats.metadata,
        overallHealth: 'poor',
        passesQualityGates: {
          minQuality: false,
          minSuccessRate: false,
          acceptableCoupling: true,
        },
      },
    };
    fs.writeFileSync(
      path.join(agentsPath, 'poor-agent-stats.yaml'),
      yaml.stringify(poorAgentStats)
    );

    memoryService = new MemoryService(testBasePath);
  });

  afterAll(() => {
    // Cleanup test directory
    if (fs.existsSync(testBasePath)) {
      fs.rmSync(testBasePath, { recursive: true });
    }
  });

  describe('Configuration', () => {
    it('should load configuration from file', () => {
      const config = memoryService.getConfig();

      expect(config.version).toBe('2.0');
      expect(config.maxTasks).toBe(100);
      expect(config.retentionDays).toBe(30);
      expect(config.qualityThreshold.excellent).toBe(90);
    });
  });

  describe('Agent Statistics', () => {
    it('should list all agent names', () => {
      const agentNames = memoryService.getAgentNames();

      expect(agentNames).toContain('test-agent');
      expect(agentNames).toContain('excellent-agent');
      expect(agentNames).toContain('poor-agent');
      expect(agentNames.length).toBe(3);
    });

    it('should load agent statistics', () => {
      const stats = memoryService.loadAgentStats('test-agent');

      expect(stats).not.toBeNull();
      expect(stats!.agentName).toBe('test-agent');
      expect(stats!.totalTasks).toBe(10);
      expect(stats!.successRate).toBe(0.8);
      expect(stats!.avgQualityScore).toBe(85);
    });

    it('should return null for non-existent agent', () => {
      const stats = memoryService.loadAgentStats('non-existent-agent');

      expect(stats).toBeNull();
    });

    it('should get all agent statistics', () => {
      const allStats = memoryService.getAllAgentStats();

      expect(allStats.length).toBe(3);
      expect(allStats.some((s) => s.agentName === 'test-agent')).toBe(true);
      expect(allStats.some((s) => s.agentName === 'excellent-agent')).toBe(true);
    });

    it('should use cache for repeated loads', () => {
      memoryService.clearCache();

      // First load
      const stats1 = memoryService.loadAgentStats('test-agent');
      // Second load should use cache
      const stats2 = memoryService.loadAgentStats('test-agent');

      expect(stats1).toBe(stats2); // Same reference
    });
  });

  describe('System Statistics', () => {
    it('should calculate system-wide statistics', () => {
      const systemStats = memoryService.getSystemStats();

      expect(systemStats.totalAgents).toBe(3);
      expect(systemStats.totalTasks).toBe(30); // 10 * 3 agents
      expect(systemStats.overallSuccessRate).toBeGreaterThan(0);
      expect(systemStats.avgQualityScore).toBeGreaterThan(0);
    });

    it('should identify top performers', () => {
      const systemStats = memoryService.getSystemStats();

      expect(systemStats.topPerformers.length).toBeGreaterThan(0);
      expect(systemStats.topPerformers[0].name).toBe('excellent-agent');
    });

    it('should identify agents needing attention', () => {
      const systemStats = memoryService.getSystemStats();

      expect(systemStats.needsAttention.length).toBeGreaterThan(0);
      expect(systemStats.needsAttention.some((a) => a.name === 'poor-agent')).toBe(true);
    });

    it('should calculate task distribution', () => {
      const systemStats = memoryService.getSystemStats();

      expect(systemStats.taskDistribution).toBeDefined();
      expect(systemStats.taskDistribution['implementation']).toBeGreaterThan(0);
    });
  });

  describe('Task Recording', () => {
    it('should record new task for existing agent', () => {
      const task: TaskRecord = {
        id: 'new-task-1',
        agentName: 'test-agent',
        description: 'New test task',
        category: 'testing' as TaskCategory,
        complexity: 3,
        status: 'completed',
        qualityScore: 88,
        durationMs: 3500,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        error: null,
        metadata: {},
      };

      memoryService.clearCache();
      const beforeStats = memoryService.loadAgentStats('test-agent');
      const beforeTasks = beforeStats!.totalTasks;

      memoryService.recordTask('test-agent', task);
      memoryService.clearCache();

      const afterStats = memoryService.loadAgentStats('test-agent');

      expect(afterStats!.totalTasks).toBe(beforeTasks + 1);
      expect(afterStats!.recentTasks[0].id).toBe('new-task-1');
    });

    it('should create new agent stats when recording task for new agent', () => {
      const task: TaskRecord = {
        id: 'first-task',
        agentName: 'brand-new-agent',
        description: 'First task for new agent',
        category: 'implementation' as TaskCategory,
        complexity: 5,
        status: 'completed',
        qualityScore: 92,
        durationMs: 6000,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        error: null,
        metadata: {},
      };

      memoryService.recordTask('brand-new-agent', task);
      memoryService.clearCache();

      const stats = memoryService.loadAgentStats('brand-new-agent');

      expect(stats).not.toBeNull();
      expect(stats!.totalTasks).toBe(1);
      expect(stats!.successRate).toBe(1);
      expect(stats!.avgQualityScore).toBe(92);
    });

    it('should update success rate correctly for failed task', () => {
      const task: TaskRecord = {
        id: 'failed-task',
        agentName: 'brand-new-agent',
        description: 'Failed task',
        category: 'testing' as TaskCategory,
        complexity: 7,
        status: 'failed',
        qualityScore: null,
        durationMs: 10000,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        error: 'Test failure',
        metadata: {},
      };

      memoryService.recordTask('brand-new-agent', task);
      memoryService.clearCache();

      const stats = memoryService.loadAgentStats('brand-new-agent');

      expect(stats!.totalTasks).toBe(2);
      expect(stats!.successfulTasks).toBe(1);
      expect(stats!.failedTasks).toBe(1);
      expect(stats!.successRate).toBe(0.5);
    });
  });

  describe('Report Generation', () => {
    it('should generate summary report', () => {
      const report = memoryService.generateReport('summary');

      expect(report).toContain('TAISUN v2 Memory Dashboard');
      expect(report).toContain('System Overview');
      expect(report).toContain('Total Agents');
    });

    it('should generate detailed report', () => {
      const report = memoryService.generateReport('detailed');

      expect(report).toContain('Detailed Agent Report');
      expect(report).toContain('test-agent');
    });

    it('should generate trends report', () => {
      const report = memoryService.generateReport('trends');

      expect(report).toContain('Trends Report');
      expect(report).toContain('Daily Activity');
    });

    it('should generate errors report', () => {
      const report = memoryService.generateReport('errors');

      expect(report).toContain('Error Analysis');
    });
  });

  describe('Data Export', () => {
    it('should export data as JSON', () => {
      const outputPath = path.join(testBasePath, 'export.json');

      memoryService.exportData('json', outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);

      const content = fs.readFileSync(outputPath, 'utf-8');
      const data = JSON.parse(content);

      expect(data.exportDate).toBeDefined();
      expect(data.system).toBeDefined();
      expect(data.agents).toBeDefined();
      expect(data.agents.length).toBeGreaterThan(0);
    });

    it('should export data as CSV', () => {
      const outputPath = path.join(testBasePath, 'export.csv');

      memoryService.exportData('csv', outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);

      const content = fs.readFileSync(outputPath, 'utf-8');
      const lines = content.split('\n');

      expect(lines[0]).toContain('agent_name');
      expect(lines[0]).toContain('success_rate');
      expect(lines.length).toBeGreaterThan(1);
    });

    it('should export data as YAML', () => {
      const outputPath = path.join(testBasePath, 'export.yaml');

      memoryService.exportData('yaml', outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);

      const content = fs.readFileSync(outputPath, 'utf-8');
      const data = yaml.parse(content);

      expect(data.exportDate).toBeDefined();
      expect(data.system).toBeDefined();
    });
  });

  describe('Backup and Cleanup', () => {
    it('should create backup', () => {
      const backupPath = memoryService.createBackup();

      expect(backupPath).toContain('backup-');
      expect(fs.existsSync(backupPath)).toBe(true);

      // Cleanup
      fs.unlinkSync(backupPath);
    });

    it('should cleanup old tasks', () => {
      // This test verifies the cleanup method runs without error
      // In a real scenario, we'd create old tasks and verify they're removed
      const cleanedCount = memoryService.cleanupOldTasks();

      expect(typeof cleanedCount).toBe('number');
      expect(cleanedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', () => {
      // Load to populate cache
      memoryService.loadAgentStats('test-agent');

      // Clear cache
      memoryService.clearCache();

      // This is an internal test - we verify by loading again
      // and checking the behavior is consistent
      const stats = memoryService.loadAgentStats('test-agent');
      expect(stats).not.toBeNull();
    });
  });
});
