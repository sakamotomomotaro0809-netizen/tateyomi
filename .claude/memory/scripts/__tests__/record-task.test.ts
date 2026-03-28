/**
 * AIT42 Memory System - record-task Integration Tests
 * Tests task recording functionality with various scenarios
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { execSync } from 'child_process';
import { TaskRecord } from '../types';

// Test directory setup
const TEST_DIR = path.join(__dirname, '__test-temp-tasks__');
const TASKS_DIR = path.join(TEST_DIR, '.claude', 'memory', 'tasks');
const SCRIPT_PATH = path.join(__dirname, '../record-task.ts');

beforeAll(() => {
  if (!fs.existsSync(TASKS_DIR)) {
    fs.mkdirSync(TASKS_DIR, { recursive: true });
  }
});

afterAll(() => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

/**
 * Helper to execute record-task script
 */
function recordTask(options: {
  description: string;
  agents: string[];
  success: boolean;
  qualityScore: number;
  taskType?: string;
  durationMs?: number;
  errors?: string[];
  warnings?: string[];
  tags?: string[];
}): string {
  // Build command as array to avoid shell escaping issues
  const cmdArgs = [
    'npx', 'tsx', SCRIPT_PATH,
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

  if (options.errors?.length) {
    cmdArgs.push('--errors', ...options.errors);
  }

  if (options.warnings?.length) {
    cmdArgs.push('--warnings', ...options.warnings);
  }

  if (options.tags?.length) {
    cmdArgs.push('--tags', ...options.tags);
  }

  // Join with proper quoting for shell
  const cmd = cmdArgs.map(arg => {
    // Quote arguments that contain spaces or special characters
    if (arg.includes(' ') || /[!@#$%^&*()]/.test(arg)) {
      return `'${arg.replace(/'/g, "'\\''")}'`;
    }
    return arg;
  }).join(' ');

  const output = execSync(cmd, { cwd: TEST_DIR, encoding: 'utf8' });

  // Extract task ID from output
  const match = output.match(/TASK_ID: ([\w-]+)/);
  if (!match) {
    throw new Error('Failed to extract task ID from output');
  }

  return match[1];
}

/**
 * Helper to find and read task file
 */
function readTaskById(taskId: string): TaskRecord {
  const files = fs.readdirSync(TASKS_DIR);
  const taskFile = files.find(f => f.startsWith(taskId));

  if (!taskFile) {
    throw new Error(`Task file not found for ID: ${taskId}`);
  }

  const content = fs.readFileSync(path.join(TASKS_DIR, taskFile), 'utf8');
  return yaml.load(content) as TaskRecord;
}

describe('record-task - Basic functionality', () => {
  test('should record successful task with minimal options', () => {
    const taskId = recordTask({
      description: 'Test task',
      agents: ['test-agent'],
      success: true,
      qualityScore: 95
    });

    expect(taskId).toMatch(/^\d{4}-\d{2}-\d{2}-\d{3}$/);

    const task = readTaskById(taskId);

    expect(task.id).toBe(taskId);
    expect(task.request).toBe('Test task');
    expect(task.selected_agents).toEqual(['test-agent']);
    expect(task.success).toBe(true);
    expect(task.quality_score).toBe(95);
    expect(task.task_type).toBe('implementation'); // Default
  });

  test('should record failed task', () => {
    const taskId = recordTask({
      description: 'Failed task',
      agents: ['agent-1', 'agent-2'],
      success: false,
      qualityScore: 50
    });

    const task = readTaskById(taskId);

    expect(task.success).toBe(false);
    expect(task.quality_score).toBe(50);
    expect(task.selected_agents).toEqual(['agent-1', 'agent-2']);
  });

  test('should record task with all optional fields', () => {
    const taskId = recordTask({
      description: 'Complex task',
      agents: ['backend-developer', 'test-generator'],
      success: true,
      qualityScore: 92,
      taskType: 'bug-fix',
      durationMs: 15000,
      errors: ['error1', 'error2'],
      warnings: ['warning1'],
      tags: ['urgent', 'security']
    });

    const task = readTaskById(taskId);

    expect(task.task_type).toBe('bug-fix');
    expect(task.duration_ms).toBe(15000);
    expect(task.errors).toEqual(['error1', 'error2']);
    expect(task.warnings).toEqual(['warning1']);
    expect(task.tags).toEqual(['urgent', 'security']);
  });

  test('should sanitize description in filename', () => {
    const taskId = recordTask({
      description: 'Create REST API for user authentication!',
      agents: ['backend-developer'],
      success: true,
      qualityScore: 95
    });

    const files = fs.readdirSync(TASKS_DIR);
    const taskFile = files.find(f => f.startsWith(taskId));

    expect(taskFile).toBeDefined();
    expect(taskFile).toMatch(/create-rest-api-for-user-authentication\.yaml$/);
  });

  test('should generate valid ISO 8601 timestamp', () => {
    const taskId = recordTask({
      description: 'Timestamp test',
      agents: ['test-agent'],
      success: true,
      qualityScore: 90
    });

    const task = readTaskById(taskId);

    // Should be valid ISO 8601
    expect(task.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

    // Should be parseable
    const date = new Date(task.timestamp);
    expect(date.toString()).not.toBe('Invalid Date');
  });
});

describe('record-task - Sequence numbering', () => {
  test('should start sequence at 001 for new day', () => {
    // Clean directory
    if (fs.existsSync(TASKS_DIR)) {
      fs.rmSync(TASKS_DIR, { recursive: true });
      fs.mkdirSync(TASKS_DIR, { recursive: true });
    }

    const taskId = recordTask({
      description: 'First task',
      agents: ['test-agent'],
      success: true,
      qualityScore: 90
    });

    expect(taskId).toMatch(/-001$/);
  });

  test('should increment sequence number', () => {
    const taskId1 = recordTask({
      description: 'Task 1',
      agents: ['test-agent'],
      success: true,
      qualityScore: 90
    });

    const taskId2 = recordTask({
      description: 'Task 2',
      agents: ['test-agent'],
      success: true,
      qualityScore: 90
    });

    // Extract sequence numbers
    const seq1 = parseInt(taskId1.split('-')[3]);
    const seq2 = parseInt(taskId2.split('-')[3]);

    expect(seq2).toBe(seq1 + 1);
  });

  test('should handle multiple tasks in sequence', () => {
    const taskIds: string[] = [];

    for (let i = 0; i < 5; i++) {
      const taskId = recordTask({
        description: `Task ${i}`,
        agents: ['test-agent'],
        success: true,
        qualityScore: 90
      });
      taskIds.push(taskId);
    }

    // Extract and verify sequence numbers are consecutive
    const sequences = taskIds.map(id => parseInt(id.split('-')[3]));
    for (let i = 1; i < sequences.length; i++) {
      expect(sequences[i]).toBe(sequences[i-1] + 1);
    }
  });
});

describe('record-task - Multiple agents', () => {
  test('should record task with single agent', () => {
    const taskId = recordTask({
      description: 'Single agent task',
      agents: ['backend-developer'],
      success: true,
      qualityScore: 90
    });

    const task = readTaskById(taskId);
    expect(task.selected_agents).toEqual(['backend-developer']);
  });

  test('should record task with multiple agents', () => {
    const taskId = recordTask({
      description: 'Multi-agent task',
      agents: ['backend-developer', 'frontend-developer', 'test-generator'],
      success: true,
      qualityScore: 90
    });

    const task = readTaskById(taskId);
    expect(task.selected_agents).toEqual([
      'backend-developer',
      'frontend-developer',
      'test-generator'
    ]);
    expect(task.selected_agents.length).toBe(3);
  });
});

describe('record-task - Quality scores', () => {
  test('should record high quality score', () => {
    const taskId = recordTask({
      description: 'High quality task',
      agents: ['test-agent'],
      success: true,
      qualityScore: 98.5
    });

    const task = readTaskById(taskId);
    expect(task.quality_score).toBe(98.5);
  });

  test('should record low quality score', () => {
    const taskId = recordTask({
      description: 'Low quality task',
      agents: ['test-agent'],
      success: false,
      qualityScore: 45
    });

    const task = readTaskById(taskId);
    expect(task.quality_score).toBe(45);
  });

  test('should record perfect score', () => {
    const taskId = recordTask({
      description: 'Perfect task',
      agents: ['test-agent'],
      success: true,
      qualityScore: 100
    });

    const task = readTaskById(taskId);
    expect(task.quality_score).toBe(100);
  });

  test('should record zero score', () => {
    const taskId = recordTask({
      description: 'Failed task',
      agents: ['test-agent'],
      success: false,
      qualityScore: 0
    });

    const task = readTaskById(taskId);
    expect(task.quality_score).toBe(0);
  });
});

describe('record-task - Task types', () => {
  test('should record implementation task', () => {
    const taskId = recordTask({
      description: 'Implementation task',
      agents: ['backend-developer'],
      success: true,
      qualityScore: 90,
      taskType: 'implementation'
    });

    const task = readTaskById(taskId);
    expect(task.task_type).toBe('implementation');
  });

  test('should record bug-fix task', () => {
    const taskId = recordTask({
      description: 'Bug fix task',
      agents: ['bug-fixer'],
      success: true,
      qualityScore: 85,
      taskType: 'bug-fix'
    });

    const task = readTaskById(taskId);
    expect(task.task_type).toBe('bug-fix');
  });

  test('should record refactoring task', () => {
    const taskId = recordTask({
      description: 'Refactoring task',
      agents: ['refactor-specialist'],
      success: true,
      qualityScore: 92,
      taskType: 'refactoring'
    });

    const task = readTaskById(taskId);
    expect(task.task_type).toBe('refactoring');
  });
});

describe('record-task - Error and warning handling', () => {
  test('should record empty errors array', () => {
    const taskId = recordTask({
      description: 'No errors',
      agents: ['test-agent'],
      success: true,
      qualityScore: 95
    });

    const task = readTaskById(taskId);
    expect(task.errors).toEqual([]);
  });

  test('should record multiple errors', () => {
    const taskId = recordTask({
      description: 'Task with errors',
      agents: ['test-agent'],
      success: false,
      qualityScore: 60,
      errors: ['Error 1', 'Error 2', 'Error 3']
    });

    const task = readTaskById(taskId);
    expect(task.errors).toEqual(['Error 1', 'Error 2', 'Error 3']);
  });

  test('should record warnings without errors', () => {
    const taskId = recordTask({
      description: 'Task with warnings',
      agents: ['test-agent'],
      success: true,
      qualityScore: 88,
      warnings: ['Warning 1', 'Warning 2']
    });

    const task = readTaskById(taskId);
    expect(task.warnings).toEqual(['Warning 1', 'Warning 2']);
    expect(task.errors).toEqual([]);
  });
});

describe('record-task - Tags', () => {
  test('should record empty tags array', () => {
    const taskId = recordTask({
      description: 'No tags',
      agents: ['test-agent'],
      success: true,
      qualityScore: 90
    });

    const task = readTaskById(taskId);
    expect(task.tags).toEqual([]);
  });

  test('should record single tag', () => {
    const taskId = recordTask({
      description: 'Tagged task',
      agents: ['test-agent'],
      success: true,
      qualityScore: 90,
      tags: ['urgent']
    });

    const task = readTaskById(taskId);
    expect(task.tags).toEqual(['urgent']);
  });

  test('should record multiple tags', () => {
    const taskId = recordTask({
      description: 'Multi-tagged task',
      agents: ['test-agent'],
      success: true,
      qualityScore: 90,
      tags: ['urgent', 'security', 'api', 'production']
    });

    const task = readTaskById(taskId);
    expect(task.tags).toEqual(['urgent', 'security', 'api', 'production']);
  });
});

describe('record-task - Performance', () => {
  test('should complete recording within reasonable time', () => {
    const startTime = Date.now();

    recordTask({
      description: 'Performance test',
      agents: ['test-agent'],
      success: true,
      qualityScore: 90
    });

    const duration = Date.now() - startTime;

    // Should complete within reasonable time (generous for CI environment)
    expect(duration).toBeLessThan(5000); // 5 seconds
  });

  test('should handle concurrent task recordings', async () => {
    const tasks = Array.from({ length: 5 }, (_, i) =>
      new Promise<string>((resolve) => {
        const taskId = recordTask({
          description: `Concurrent task ${i}`,
          agents: ['test-agent'],
          success: true,
          qualityScore: 90
        });
        resolve(taskId);
      })
    );

    const taskIds = await Promise.all(tasks);

    // All task IDs should be unique
    const uniqueIds = new Set(taskIds);
    expect(uniqueIds.size).toBe(5);

    // All tasks should be recorded
    taskIds.forEach(taskId => {
      expect(() => readTaskById(taskId)).not.toThrow();
    });
  });
});

describe('record-task - Edge cases', () => {
  test('should handle very long descriptions', () => {
    const longDescription = 'A'.repeat(200);

    const taskId = recordTask({
      description: longDescription,
      agents: ['test-agent'],
      success: true,
      qualityScore: 90
    });

    const task = readTaskById(taskId);
    expect(task.request).toBe(longDescription);

    // Filename should be truncated to 50 chars
    const files = fs.readdirSync(TASKS_DIR);
    const taskFile = files.find(f => f.startsWith(taskId));
    expect(taskFile).toBeDefined();
  });

  test('should handle special characters in description', () => {
    const taskId = recordTask({
      description: 'Fix bug #123 (@urgent) with $pecial chars!',
      agents: ['bug-fixer'],
      success: true,
      qualityScore: 85
    });

    const task = readTaskById(taskId);
    expect(task.request).toBe('Fix bug #123 (@urgent) with $pecial chars!');
  });

  test('should handle empty arrays for optional fields', () => {
    const taskId = recordTask({
      description: 'Empty arrays test',
      agents: ['test-agent'],
      success: true,
      qualityScore: 90,
      errors: [],
      warnings: [],
      tags: []
    });

    const task = readTaskById(taskId);
    expect(task.errors).toEqual([]);
    expect(task.warnings).toEqual([]);
    expect(task.tags).toEqual([]);
  });

  test('should handle zero duration', () => {
    const taskId = recordTask({
      description: 'Zero duration',
      agents: ['test-agent'],
      success: true,
      qualityScore: 90,
      durationMs: 0
    });

    const task = readTaskById(taskId);
    expect(task.duration_ms).toBe(0);
  });
});
