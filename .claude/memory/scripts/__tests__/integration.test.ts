/**
 * AIT42 Memory System - End-to-End Integration Tests
 * Tests complete workflows: record task → update stats → verify consistency
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { execSync } from 'child_process';
import { TaskRecord, AgentStats } from '../types';

// Test directory setup
const TEST_DIR = path.join(__dirname, '__test-temp-e2e__');
const TASKS_DIR = path.join(TEST_DIR, '.claude', 'memory', 'tasks');
const AGENTS_DIR = path.join(TEST_DIR, '.claude', 'memory', 'agents');

const RECORD_SCRIPT = path.join(__dirname, '../record-task.ts');
const UPDATE_SCRIPT = path.join(__dirname, '../update-agent-stats.ts');

beforeAll(() => {
  if (!fs.existsSync(TASKS_DIR)) {
    fs.mkdirSync(TASKS_DIR, { recursive: true });
  }
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
 * Helper to record a task
 */
function recordTask(options: {
  description: string;
  agents: string[];
  success: boolean;
  qualityScore: number;
  taskType?: string;
  durationMs?: number;
}): string {
  const cmdArgs = [
    'npx', 'tsx', RECORD_SCRIPT,
    '--description', options.description,
    '--agents', ...options.agents,
    '--success', options.success.toString(),
    '--quality-score', options.qualityScore.toString()
  ];

  if (options.taskType) {
    cmdArgs.push('--task-type', options.taskType);
  }

  if (options.durationMs !== undefined) {
    cmdArgs.push('--duration-ms', options.durationMs.toString());
  }

  // Join with proper quoting for shell
  const cmd = cmdArgs.map(arg => {
    if (arg.includes(' ') || /[!@#$%^&*()]/.test(arg)) {
      return `'${arg.replace(/'/g, "'\\''")}'`;
    }
    return arg;
  }).join(' ');

  const output = execSync(cmd, { cwd: TEST_DIR, encoding: 'utf8' });
  const match = output.match(/TASK_ID: ([\w-]+)/);

  if (!match) {
    throw new Error('Failed to extract task ID');
  }

  return match[1];
}

/**
 * Helper to update agent stats
 */
function updateAgentStats(options: {
  agent: string;
  qualityScore: number;
  success: boolean;
  taskId: string;
  taskType?: string;
  durationMs?: number;
}): void {
  const cmdArgs = [
    'npx', 'tsx', UPDATE_SCRIPT,
    '--agent', options.agent,
    '--quality-score', options.qualityScore.toString(),
    '--success', options.success.toString(),
    '--task-id', options.taskId
  ];

  if (options.taskType) {
    cmdArgs.push('--task-type', options.taskType);
  }

  if (options.durationMs !== undefined) {
    cmdArgs.push('--duration-ms', options.durationMs.toString());
  }

  const cmd = cmdArgs.join(' ');
  execSync(cmd, { cwd: TEST_DIR, stdio: 'pipe' });
}

/**
 * Helper to read task file
 */
function readTask(taskId: string): TaskRecord {
  const files = fs.readdirSync(TASKS_DIR);
  const taskFile = files.find(f => f.startsWith(taskId));

  if (!taskFile) {
    throw new Error(`Task file not found: ${taskId}`);
  }

  const content = fs.readFileSync(path.join(TASKS_DIR, taskFile), 'utf8');
  return yaml.load(content) as TaskRecord;
}

/**
 * Helper to read agent stats
 */
function readAgentStats(agentName: string): AgentStats {
  const statsPath = path.join(AGENTS_DIR, `${agentName}-stats.yaml`);
  const content = fs.readFileSync(statsPath, 'utf8');
  return yaml.load(content) as AgentStats;
}

describe('E2E Integration - Complete workflow', () => {
  test('should complete full workflow: record task → update stats → verify', () => {
    // Step 1: Record task
    const taskId = recordTask({
      description: 'Create user authentication API',
      agents: ['backend-developer', 'security-tester'],
      success: true,
      qualityScore: 95,
      taskType: 'implementation',
      durationMs: 15000
    });

    // Step 2: Verify task file exists
    const task = readTask(taskId);
    expect(task.id).toBe(taskId);
    expect(task.selected_agents).toEqual(['backend-developer', 'security-tester']);
    expect(task.quality_score).toBe(95);

    // Step 3: Update stats for each agent
    updateAgentStats({
      agent: 'backend-developer',
      qualityScore: 95,
      success: true,
      taskId: taskId,
      taskType: 'implementation',
      durationMs: 15000
    });

    updateAgentStats({
      agent: 'security-tester',
      qualityScore: 95,
      success: true,
      taskId: taskId,
      taskType: 'implementation',
      durationMs: 15000
    });

    // Step 4: Verify stats updated correctly
    const backendStats = readAgentStats('backend-developer');
    expect(backendStats.total_tasks).toBeGreaterThan(0);
    expect(backendStats.recent_tasks[0].task_id).toBe(taskId);
    expect(backendStats.recent_tasks[0].quality_score).toBe(95);

    const securityStats = readAgentStats('security-tester');
    expect(securityStats.total_tasks).toBeGreaterThan(0);
    expect(securityStats.recent_tasks[0].task_id).toBe(taskId);
  });

  test('should handle multi-task workflow with same agents', () => {
    const agent = 'e2e-test-agent';
    const taskIds: string[] = [];

    // Record 3 tasks
    for (let i = 0; i < 3; i++) {
      const taskId = recordTask({
        description: `Task ${i + 1}`,
        agents: [agent],
        success: i < 2, // First 2 succeed, 3rd fails
        qualityScore: 90 - (i * 5), // 90, 85, 80
        taskType: 'implementation',
        durationMs: 1000 + (i * 100)
      });

      taskIds.push(taskId);

      updateAgentStats({
        agent: agent,
        qualityScore: 90 - (i * 5),
        success: i < 2,
        taskId: taskId,
        taskType: 'implementation',
        durationMs: 1000 + (i * 100)
      });
    }

    // Verify final stats
    const stats = readAgentStats(agent);

    expect(stats.total_tasks).toBe(3);
    expect(stats.successful_tasks).toBe(2);
    expect(stats.failed_tasks).toBe(1);
    expect(stats.success_rate).toBeCloseTo(2/3, 2);

    // Verify recent tasks are in reverse chronological order
    expect(stats.recent_tasks[0].task_id).toBe(taskIds[2]); // Most recent
    expect(stats.recent_tasks[1].task_id).toBe(taskIds[1]);
    expect(stats.recent_tasks[2].task_id).toBe(taskIds[0]); // Oldest
  });

  test('should maintain consistency across multiple agents', () => {
    const taskId = recordTask({
      description: 'Multi-agent collaborative task',
      agents: ['agent-a', 'agent-b', 'agent-c'],
      success: true,
      qualityScore: 92,
      taskType: 'implementation',
      durationMs: 20000
    });

    // Update stats for all agents
    const agents = ['agent-a', 'agent-b', 'agent-c'];
    agents.forEach(agent => {
      updateAgentStats({
        agent: agent,
        qualityScore: 92,
        success: true,
        taskId: taskId,
        taskType: 'implementation',
        durationMs: 20000
      });
    });

    // Verify all agents have consistent data
    agents.forEach(agent => {
      const stats = readAgentStats(agent);
      expect(stats.recent_tasks[0].task_id).toBe(taskId);
      expect(stats.recent_tasks[0].quality_score).toBe(92);
      expect(stats.recent_tasks[0].success).toBe(true);
    });
  });
});

describe('E2E Integration - Performance targets', () => {
  test('should complete full workflow within reasonable time', () => {
    const startTime = Date.now();

    // Record task
    const taskId = recordTask({
      description: 'Performance test task',
      agents: ['perf-agent-1', 'perf-agent-2'],
      success: true,
      qualityScore: 90,
      durationMs: 1000
    });

    // Update stats for both agents
    updateAgentStats({
      agent: 'perf-agent-1',
      qualityScore: 90,
      success: true,
      taskId: taskId
    });

    updateAgentStats({
      agent: 'perf-agent-2',
      qualityScore: 90,
      success: true,
      taskId: taskId
    });

    const totalDuration = Date.now() - startTime;

    // Should complete within reasonable time (generous for CI environment)
    expect(totalDuration).toBeLessThan(10000); // 10s for full workflow
  });

  test('should handle 10 sequential tasks efficiently', () => {
    const agent = 'perf-sequential-agent';
    const startTime = Date.now();

    for (let i = 0; i < 10; i++) {
      const taskId = recordTask({
        description: `Sequential task ${i}`,
        agents: [agent],
        success: true,
        qualityScore: 90
      });

      updateAgentStats({
        agent: agent,
        qualityScore: 90,
        success: true,
        taskId: taskId
      });
    }

    const duration = Date.now() - startTime;

    // Should complete 10 tasks within reasonable time (generous for CI)
    expect(duration).toBeLessThan(30000); // 30s for 10 tasks

    // Verify all tasks recorded
    const stats = readAgentStats(agent);
    expect(stats.total_tasks).toBe(10);
    expect(stats.recent_tasks.length).toBe(10);
  });
});

describe('E2E Integration - Data consistency', () => {
  test('should maintain referential integrity between tasks and stats', () => {
    const agent = 'consistency-agent';

    // Create 5 tasks
    const taskIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const taskId = recordTask({
        description: `Consistency task ${i}`,
        agents: [agent],
        success: true,
        qualityScore: 85 + i
      });

      taskIds.push(taskId);

      updateAgentStats({
        agent: agent,
        qualityScore: 85 + i,
        success: true,
        taskId: taskId
      });
    }

    // Verify all task IDs exist in both systems
    const stats = readAgentStats(agent);

    taskIds.forEach(taskId => {
      // Task file should exist
      expect(() => readTask(taskId)).not.toThrow();

      // Task ID should be in recent tasks
      const recentTask = stats.recent_tasks.find(t => t.task_id === taskId);
      expect(recentTask).toBeDefined();
    });
  });

  test('should correctly aggregate quality scores', () => {
    const agent = 'aggregate-agent';
    const qualityScores = [95, 90, 85, 92, 88];

    qualityScores.forEach((score, i) => {
      const taskId = recordTask({
        description: `Aggregate task ${i}`,
        agents: [agent],
        success: true,
        qualityScore: score
      });

      updateAgentStats({
        agent: agent,
        qualityScore: score,
        success: true,
        taskId: taskId
      });
    });

    const stats = readAgentStats(agent);

    // Calculate expected average
    const expectedAvg = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;

    expect(stats.avg_quality_score).toBeCloseTo(expectedAvg, 1);
    expect(stats.total_tasks).toBe(5);
  });

  test('should correctly track success rate over time', () => {
    const agent = 'success-rate-agent';
    const results = [true, true, false, true, false]; // 3 success, 2 fail

    results.forEach((success, i) => {
      const taskId = recordTask({
        description: `Success rate task ${i}`,
        agents: [agent],
        success: success,
        qualityScore: success ? 90 : 50
      });

      updateAgentStats({
        agent: agent,
        qualityScore: success ? 90 : 50,
        success: success,
        taskId: taskId
      });
    });

    const stats = readAgentStats(agent);

    expect(stats.total_tasks).toBe(5);
    expect(stats.successful_tasks).toBe(3);
    expect(stats.failed_tasks).toBe(2);
    expect(stats.success_rate).toBeCloseTo(0.6, 2); // 3/5 = 0.6
  });
});

describe('E2E Integration - Edge cases', () => {
  test('should handle task with no duration specified', () => {
    const taskId = recordTask({
      description: 'No duration task',
      agents: ['edge-agent-1'],
      success: true,
      qualityScore: 90
      // durationMs not specified (defaults to 0)
    });

    updateAgentStats({
      agent: 'edge-agent-1',
      qualityScore: 90,
      success: true,
      taskId: taskId
      // durationMs not specified (defaults to 0)
    });

    const task = readTask(taskId);
    const stats = readAgentStats('edge-agent-1');

    expect(task.duration_ms).toBe(0);
    expect(stats.avg_duration_ms).toBe(0);
  });

  test('should handle very high quality scores', () => {
    const taskId = recordTask({
      description: 'Perfect task',
      agents: ['edge-agent-2'],
      success: true,
      qualityScore: 100
    });

    updateAgentStats({
      agent: 'edge-agent-2',
      qualityScore: 100,
      success: true,
      taskId: taskId
    });

    const stats = readAgentStats('edge-agent-2');
    expect(stats.avg_quality_score).toBe(100);
  });

  test('should handle very low quality scores', () => {
    const taskId = recordTask({
      description: 'Failed task',
      agents: ['edge-agent-3'],
      success: false,
      qualityScore: 0
    });

    updateAgentStats({
      agent: 'edge-agent-3',
      qualityScore: 0,
      success: false,
      taskId: taskId
    });

    const stats = readAgentStats('edge-agent-3');
    expect(stats.avg_quality_score).toBe(0);
    expect(stats.success_rate).toBe(0);
  });
});

describe('E2E Integration - Concurrent operations', () => {
  test('should handle concurrent task recordings', async () => {
    const tasks = Array.from({ length: 5 }, (_, i) =>
      new Promise<string>((resolve) => {
        const taskId = recordTask({
          description: `Concurrent task ${i}`,
          agents: ['concurrent-agent'],
          success: true,
          qualityScore: 90
        });

        updateAgentStats({
          agent: 'concurrent-agent',
          qualityScore: 90,
          success: true,
          taskId: taskId
        });

        resolve(taskId);
      })
    );

    const taskIds = await Promise.all(tasks);

    // All task IDs should be unique
    const uniqueIds = new Set(taskIds);
    expect(uniqueIds.size).toBe(5);

    // All tasks should be recorded
    const stats = readAgentStats('concurrent-agent');
    expect(stats.total_tasks).toBe(5);
    expect(stats.recent_tasks.length).toBe(5);
  });
});

describe('E2E Integration - Specialization tracking', () => {
  test('should track specializations across multiple task types', () => {
    const agent = 'specialist-agent';
    const taskTypes = [
      'implementation',
      'implementation',
      'bug-fix',
      'refactoring',
      'implementation',
      'bug-fix'
    ];

    taskTypes.forEach((taskType, i) => {
      const taskId = recordTask({
        description: `${taskType} task ${i}`,
        agents: [agent],
        success: true,
        qualityScore: 90,
        taskType: taskType
      });

      updateAgentStats({
        agent: agent,
        qualityScore: 90,
        success: true,
        taskId: taskId,
        taskType: taskType
      });
    });

    const stats = readAgentStats(agent);

    expect(stats.specializations.implementation).toBe(3);
    expect(stats.specializations['bug-fix']).toBe(2);
    expect(stats.specializations.refactoring).toBe(1);
  });
});

describe('E2E Integration - Trend calculation validation', () => {
  test('should correctly calculate trends over multiple tasks', () => {
    const agent = 'trend-agent';

    // Task 1: Quality 80
    let taskId = recordTask({
      description: 'Task 1',
      agents: [agent],
      success: true,
      qualityScore: 80
    });
    updateAgentStats({
      agent: agent,
      qualityScore: 80,
      success: true,
      taskId: taskId
    });

    // Task 2: Quality 85 (trend should be positive)
    taskId = recordTask({
      description: 'Task 2',
      agents: [agent],
      success: true,
      qualityScore: 85
    });
    updateAgentStats({
      agent: agent,
      qualityScore: 85,
      success: true,
      taskId: taskId
    });

    let stats = readAgentStats(agent);
    expect(stats.trends.quality_score_trend).toBeGreaterThan(0);

    // Task 3: Quality 75 (trend should be negative)
    taskId = recordTask({
      description: 'Task 3',
      agents: [agent],
      success: true,
      qualityScore: 75
    });
    updateAgentStats({
      agent: agent,
      qualityScore: 75,
      success: true,
      taskId: taskId
    });

    stats = readAgentStats(agent);
    expect(stats.trends.quality_score_trend).toBeLessThan(0);
  });
});
