/**
 * AIT42 Memory System - update-agent-stats Integration Tests
 * Tests agent statistics update functionality with focus on ISSUE-001 and ISSUE-002 fixes
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { execSync } from 'child_process';
import { AgentStats } from '../types';

// Test directory setup
const TEST_DIR = path.join(__dirname, '__test-temp-stats__');
const AGENTS_DIR = path.join(TEST_DIR, 'agents');
const SCRIPT_PATH = path.join(__dirname, '../update-agent-stats.ts');

beforeAll(() => {
  if (!fs.existsSync(AGENTS_DIR)) {
    fs.mkdirSync(AGENTS_DIR, { recursive: true });
  }
});

afterAll(() => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

/**
 * Helper to create initial agent stats file
 */
function createInitialStats(agentName: string, overrides: Partial<AgentStats> = {}): string {
  const statsPath = path.join(AGENTS_DIR, `${agentName}-stats.yaml`);
  const initialStats: AgentStats = {
    agent_name: agentName,
    total_tasks: 5,
    successful_tasks: 4,
    failed_tasks: 1,
    success_rate: 0.8,
    avg_quality_score: 90,
    avg_duration_ms: 1000,
    last_updated: new Date().toISOString(),
    recent_tasks: [],
    trends: {
      success_rate_trend: 0,
      quality_score_trend: 0,
      avg_duration_trend: 0
    },
    specializations: {
      implementation: 3,
      'bug-fix': 2
    },
    ...overrides
  };

  fs.writeFileSync(statsPath, yaml.dump(initialStats));
  return statsPath;
}

/**
 * Helper to execute update-agent-stats script
 */
function updateStats(options: {
  agent: string;
  qualityScore: number;
  success: boolean;
  taskId?: string;
  taskType?: string;
  durationMs?: number;
}): void {
  const cmd = [
    'npx',
    'tsx',
    SCRIPT_PATH,
    '--agent', options.agent,
    '--quality-score', options.qualityScore.toString(),
    '--success', options.success.toString(),
    '--task-id', options.taskId || 'test-001',
    '--task-type', options.taskType || 'implementation',
    '--duration-ms', options.durationMs?.toString() || '0'
  ].join(' ');

  // Set CWD to TEST_DIR so stats are written there
  execSync(cmd, { cwd: TEST_DIR, stdio: 'pipe' });
}

/**
 * Helper to read stats file
 */
function readStats(agentName: string): AgentStats {
  const statsPath = path.join(AGENTS_DIR, `${agentName}-stats.yaml`);
  const content = fs.readFileSync(statsPath, 'utf8');
  return yaml.load(content) as AgentStats;
}

describe('update-agent-stats - Basic functionality', () => {
  test('should update stats correctly for successful task', () => {
    const agentName = 'test-agent-basic';
    createInitialStats(agentName);

    updateStats({
      agent: agentName,
      qualityScore: 88,
      success: true,
      taskId: 'test-001',
      durationMs: 1200
    });

    const stats = readStats(agentName);

    // Total tasks: 5 + 1 = 6
    expect(stats.total_tasks).toBe(6);

    // Successful tasks: 4 + 1 = 5
    expect(stats.successful_tasks).toBe(5);

    // Success rate: 5/6 = 0.833...
    expect(stats.success_rate).toBeCloseTo(5/6, 2);

    // Failed tasks unchanged
    expect(stats.failed_tasks).toBe(1);
  });

  test('should update stats correctly for failed task', () => {
    const agentName = 'test-agent-fail';
    createInitialStats(agentName);

    updateStats({
      agent: agentName,
      qualityScore: 50,
      success: false
    });

    const stats = readStats(agentName);

    expect(stats.total_tasks).toBe(6);
    expect(stats.successful_tasks).toBe(4); // Unchanged
    expect(stats.failed_tasks).toBe(2); // 1 + 1
    expect(stats.success_rate).toBeCloseTo(4/6, 2);
  });

  test('should update rolling averages correctly', () => {
    const agentName = 'test-agent-avg';
    createInitialStats(agentName, {
      total_tasks: 5,
      avg_quality_score: 90,
      avg_duration_ms: 1000
    });

    updateStats({
      agent: agentName,
      qualityScore: 88,
      success: true,
      durationMs: 1200
    });

    const stats = readStats(agentName);

    // Expected quality: (90*5 + 88) / 6 = 89.67
    expect(stats.avg_quality_score).toBeCloseTo(89.67, 1);

    // Expected duration: (1000*5 + 1200) / 6 = 1033.33
    expect(stats.avg_duration_ms).toBeCloseTo(1033.33, 1);
  });

  test('should maintain recent tasks list (max 10)', () => {
    const agentName = 'test-agent-recent';
    createInitialStats(agentName, {
      recent_tasks: Array.from({ length: 9 }, (_, i) => ({
        task_id: `old-${i}`,
        quality_score: 90,
        success: true,
        timestamp: new Date().toISOString()
      }))
    });

    updateStats({
      agent: agentName,
      qualityScore: 95,
      success: true,
      taskId: 'new-task'
    });

    const stats = readStats(agentName);

    // Should have 10 tasks (9 old + 1 new)
    expect(stats.recent_tasks.length).toBe(10);

    // New task should be first
    expect(stats.recent_tasks[0].task_id).toBe('new-task');
  });

  test('should trim recent tasks list to 10', () => {
    const agentName = 'test-agent-trim';
    createInitialStats(agentName, {
      recent_tasks: Array.from({ length: 10 }, (_, i) => ({
        task_id: `old-${i}`,
        quality_score: 90,
        success: true,
        timestamp: new Date().toISOString()
      }))
    });

    updateStats({
      agent: agentName,
      qualityScore: 95,
      success: true,
      taskId: 'new-task'
    });

    const stats = readStats(agentName);

    // Should still have 10 tasks (oldest dropped)
    expect(stats.recent_tasks.length).toBe(10);
    expect(stats.recent_tasks[0].task_id).toBe('new-task');
    expect(stats.recent_tasks.find(t => t.task_id === 'old-9')).toBeUndefined();
  });

  test('should update specializations correctly', () => {
    const agentName = 'test-agent-spec';
    createInitialStats(agentName, {
      specializations: {
        implementation: 3,
        'bug-fix': 2
      }
    });

    updateStats({
      agent: agentName,
      qualityScore: 90,
      success: true,
      taskType: 'bug-fix'
    });

    const stats = readStats(agentName);

    expect(stats.specializations['bug-fix']).toBe(3); // 2 + 1
    expect(stats.specializations.implementation).toBe(3); // Unchanged
  });

  test('should add new specialization type', () => {
    const agentName = 'test-agent-newspec';
    createInitialStats(agentName, {
      specializations: {
        implementation: 3
      }
    });

    updateStats({
      agent: agentName,
      qualityScore: 90,
      success: true,
      taskType: 'refactoring'
    });

    const stats = readStats(agentName);

    expect(stats.specializations.refactoring).toBe(1);
    expect(stats.specializations.implementation).toBe(3);
  });
});

describe('update-agent-stats - ISSUE-001: Trend calculation fix', () => {
  test('should calculate quality score trend correctly (was always 0)', () => {
    const agentName = 'test-agent-trend-001';
    createInitialStats(agentName, {
      total_tasks: 5,
      avg_quality_score: 90,
      trends: {
        success_rate_trend: 0,
        quality_score_trend: 0,
        avg_duration_trend: 0
      }
    });

    // Add new task with lower quality (90 -> 88)
    updateStats({
      agent: agentName,
      qualityScore: 88,
      success: true
    });

    const stats = readStats(agentName);

    // New avg: (90*5 + 88) / 6 = 89.67
    expect(stats.avg_quality_score).toBeCloseTo(89.67, 1);

    // Trend: 89.67 - 90 = -0.33 (was incorrectly 0 before fix)
    expect(stats.trends.quality_score_trend).toBeCloseTo(-0.33, 1);
    expect(stats.trends.quality_score_trend).not.toBe(0); // Ensure not zero
  });

  test('should calculate positive quality score trend', () => {
    const agentName = 'test-agent-trend-positive';
    createInitialStats(agentName, {
      total_tasks: 5,
      avg_quality_score: 85
    });

    updateStats({
      agent: agentName,
      qualityScore: 95,
      success: true
    });

    const stats = readStats(agentName);

    // New avg: (85*5 + 95) / 6 = 86.67
    expect(stats.avg_quality_score).toBeCloseTo(86.67, 1);

    // Trend: 86.67 - 85 = +1.67
    expect(stats.trends.quality_score_trend).toBeCloseTo(1.67, 1);
    expect(stats.trends.quality_score_trend).toBeGreaterThan(0);
  });

  test('should calculate duration trend correctly', () => {
    const agentName = 'test-agent-trend-duration';
    createInitialStats(agentName, {
      total_tasks: 5,
      avg_duration_ms: 1000
    });

    updateStats({
      agent: agentName,
      qualityScore: 90,
      success: true,
      durationMs: 1500
    });

    const stats = readStats(agentName);

    // New avg: (1000*5 + 1500) / 6 = 1083.33
    expect(stats.avg_duration_ms).toBeCloseTo(1083.33, 1);

    // Trend: 1083.33 - 1000 = +83.33
    expect(stats.trends.avg_duration_trend).toBeCloseTo(83.33, 1);
  });

  test('should calculate success rate trend correctly', () => {
    const agentName = 'test-agent-trend-success';
    createInitialStats(agentName, {
      total_tasks: 5,
      successful_tasks: 4,
      failed_tasks: 1,
      success_rate: 0.8
    });

    updateStats({
      agent: agentName,
      qualityScore: 90,
      success: false // Add failure
    });

    const stats = readStats(agentName);

    // Old success rate: 4/5 = 0.8
    // New success rate: 4/6 = 0.667
    // Trend: 0.667 - 0.8 = -0.133
    expect(stats.trends.success_rate_trend).toBeCloseTo(-0.133, 2);
  });

  test('should set trends to 0 for first task', () => {
    const agentName = 'test-agent-first';
    createInitialStats(agentName, {
      total_tasks: 0,
      successful_tasks: 0,
      failed_tasks: 0,
      avg_quality_score: 0,
      avg_duration_ms: 0,
      trends: {
        success_rate_trend: 0,
        quality_score_trend: 0,
        avg_duration_trend: 0
      }
    });

    updateStats({
      agent: agentName,
      qualityScore: 95,
      success: true,
      durationMs: 1000
    });

    const stats = readStats(agentName);

    // All trends should be 0 for first task
    expect(stats.trends.quality_score_trend).toBe(0);
    expect(stats.trends.success_rate_trend).toBe(0);
    expect(stats.trends.avg_duration_trend).toBe(0);
  });
});

describe('update-agent-stats - ISSUE-002: New agent initialization', () => {
  test('should create stats file for brand new agent', () => {
    const agentName = 'brand-new-agent';
    const statsPath = path.join(AGENTS_DIR, `${agentName}-stats.yaml`);

    // Ensure file doesn't exist
    if (fs.existsSync(statsPath)) {
      fs.unlinkSync(statsPath);
    }

    updateStats({
      agent: agentName,
      qualityScore: 95,
      success: true,
      taskId: 'first-task'
    });

    // File should now exist
    expect(fs.existsSync(statsPath)).toBe(true);

    const stats = readStats(agentName);

    expect(stats.agent_name).toBe(agentName);
    expect(stats.total_tasks).toBe(1);
    expect(stats.successful_tasks).toBe(1);
    expect(stats.failed_tasks).toBe(0);
    expect(stats.success_rate).toBe(1.0);
    expect(stats.avg_quality_score).toBe(95);
  });

  test('should initialize all fields correctly for new agent', () => {
    const agentName = 'new-agent-init';
    const statsPath = path.join(AGENTS_DIR, `${agentName}-stats.yaml`);

    if (fs.existsSync(statsPath)) {
      fs.unlinkSync(statsPath);
    }

    updateStats({
      agent: agentName,
      qualityScore: 88,
      success: false,
      taskType: 'testing',
      durationMs: 2000
    });

    const stats = readStats(agentName);

    expect(stats.total_tasks).toBe(1);
    expect(stats.successful_tasks).toBe(0);
    expect(stats.failed_tasks).toBe(1);
    expect(stats.success_rate).toBe(0);
    expect(stats.avg_quality_score).toBe(88);
    expect(stats.avg_duration_ms).toBe(2000);
    expect(stats.recent_tasks.length).toBe(1);
    expect(stats.specializations.testing).toBe(1);
    expect(stats.trends.quality_score_trend).toBe(0);
  });
});

describe('update-agent-stats - Performance', () => {
  test('should complete update within reasonable time', () => {
    const agentName = 'test-agent-perf';
    createInitialStats(agentName);

    const startTime = Date.now();

    updateStats({
      agent: agentName,
      qualityScore: 90,
      success: true
    });

    const duration = Date.now() - startTime;

    // Should complete within reasonable time (generous for CI environment)
    expect(duration).toBeLessThan(5000); // 5 seconds
  });
});

describe('update-agent-stats - Error handling', () => {
  test('should handle invalid quality score gracefully', () => {
    const agentName = 'test-agent-error';
    createInitialStats(agentName);

    // This should handle NaN gracefully
    expect(() => {
      updateStats({
        agent: agentName,
        qualityScore: NaN,
        success: true
      });
    }).not.toThrow();
  });

  test('should handle concurrent updates with locks', async () => {
    const agentName = 'test-agent-concurrent';
    createInitialStats(agentName, { total_tasks: 0 });

    // Launch 5 concurrent updates
    const updates = Array.from({ length: 5 }, (_, i) =>
      new Promise<void>((resolve) => {
        updateStats({
          agent: agentName,
          qualityScore: 90,
          success: true,
          taskId: `concurrent-${i}`
        });
        resolve();
      })
    );

    await Promise.all(updates);

    const stats = readStats(agentName);

    // All 5 updates should have been applied
    expect(stats.total_tasks).toBe(5);
  });
});
