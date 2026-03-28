/**
 * Workflow Phase 3 - Parallel Execution Tests
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  startWorkflow,
  transitionToNextPhase,
  getStatus,
} from '../../src/proxy-mcp/workflow/engine';
import { clearState, setStateDir, resetStateDir } from '../../src/proxy-mcp/workflow/store';
import { clearCache, setWorkflowsDir, resetWorkflowsDir } from '../../src/proxy-mcp/workflow/registry';
import type { WorkflowDefinition } from '../../src/proxy-mcp/workflow/types';

// テスト用のディレクトリ（OSの一時ディレクトリを使用して権限問題を回避）
const TEMP_BASE = path.join(os.tmpdir(), 'taisun-test-parallel-' + process.pid);
const WORKFLOW_DIR = path.join(TEMP_BASE, 'config', 'workflows');
const TEST_WORKFLOW_PATH = path.join(WORKFLOW_DIR, 'test_parallel_v1.json');
const TEST_FILES_DIR = path.join(TEMP_BASE, 'test-parallel-temp');

// テストがスキップされるべきかどうかをチェック
let canRunTests = true;
let skipReason = '';

describe('Workflow Phase 3 - Parallel Execution', () => {
  // 一時ディレクトリのセットアップ（全テスト開始前）
  beforeAll(() => {
    try {
      fs.mkdirSync(TEMP_BASE, { recursive: true });
      fs.mkdirSync(WORKFLOW_DIR, { recursive: true });
      fs.mkdirSync(TEST_FILES_DIR, { recursive: true });

      const testFile = path.join(TEMP_BASE, '.write-test');
      fs.writeFileSync(testFile, 'test', 'utf-8');
      fs.unlinkSync(testFile);

      setWorkflowsDir(WORKFLOW_DIR);
      setStateDir(TEMP_BASE);
    } catch (error) {
      canRunTests = false;
      skipReason = `Cannot create temp directories: ${(error as Error).message}`;
      console.warn(`Skipping tests: ${skipReason}`);
    }
  });

  afterAll(() => {
    resetWorkflowsDir();
    resetStateDir();
    try {
      if (fs.existsSync(TEMP_BASE)) {
        fs.rmSync(TEMP_BASE, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn(`Cleanup warning: ${(error as Error).message}`);
    }
  });

  beforeEach(() => {
    if (!canRunTests) {
      return;
    }

    clearCache();

    try {
      if (!fs.existsSync(TEST_FILES_DIR)) {
        fs.mkdirSync(TEST_FILES_DIR, { recursive: true });
      }

      if (!fs.existsSync(WORKFLOW_DIR)) {
        fs.mkdirSync(WORKFLOW_DIR, { recursive: true });
      }
    } catch (error) {
      console.warn(`Setup warning: ${(error as Error).message}`);
    }
  });

  afterEach(() => {
    if (!canRunTests) {
      return;
    }

    try {
      if (fs.existsSync(TEST_FILES_DIR)) {
        fs.rmSync(TEST_FILES_DIR, { recursive: true, force: true });
      }

      fs.mkdirSync(TEST_FILES_DIR, { recursive: true });

      if (fs.existsSync(TEST_WORKFLOW_PATH)) {
        fs.unlinkSync(TEST_WORKFLOW_PATH);
      }
    } catch (error) {
      console.warn(`Cleanup warning: ${(error as Error).message}`);
    }

    clearState();
    clearCache();
  });

  describe('waitStrategy: all', () => {
    beforeEach(() => {
      const workflow: WorkflowDefinition = {
        id: 'test_parallel_v1',
        name: 'Parallel Execution Test (All)',
        version: '1.0.0',
        phases: [
          {
            id: 'phase_0',
            name: 'Preparation',
            nextPhase: 'phase_1',
          },
          {
            id: 'phase_1',
            name: 'Start Parallel',
            parallelNext: {
              phases: ['phase_2a', 'phase_2b', 'phase_2c'],
              waitStrategy: 'all',
            },
          },
          {
            id: 'phase_2a',
            name: 'Design',
            requiredArtifacts: [path.join(TEST_FILES_DIR, 'design.txt')],
            nextPhase: 'phase_3',
          },
          {
            id: 'phase_2b',
            name: 'Copy',
            requiredArtifacts: [path.join(TEST_FILES_DIR, 'copy.txt')],
            nextPhase: 'phase_3',
          },
          {
            id: 'phase_2c',
            name: 'SEO',
            requiredArtifacts: [path.join(TEST_FILES_DIR, 'seo.txt')],
            nextPhase: 'phase_3',
          },
          {
            id: 'phase_3',
            name: 'Integration',
            nextPhase: null,
          },
        ],
      };

      fs.writeFileSync(
        TEST_WORKFLOW_PATH,
        JSON.stringify(workflow, null, 2),
        'utf-8'
      );

      // clearCache after creating workflow definition
      clearCache();
    });

    it('should start parallel execution and transition to first parallel phase', () => {
      startWorkflow('test_parallel_v1', false);

      // phase_0 → phase_1
      let result = transitionToNextPhase();
      expect(result.success).toBe(true);
      expect(result.newPhase).toBe('phase_1');

      // phase_1 → phase_2a (並列実行開始)
      result = transitionToNextPhase();
      expect(result.success).toBe(true);
      expect(result.newPhase).toBe('phase_2a');
      expect(result.message).toContain('並列実行開始');

      const status = getStatus();
      expect(status.state?.currentPhase).toBe('phase_2a');
      expect(status.state?.parallelExecutions).toHaveLength(1);
      expect(status.state?.parallelExecutions![0].startedPhases).toEqual([
        'phase_2a',
        'phase_2b',
        'phase_2c',
      ]);
      expect(status.state?.parallelExecutions![0].completedPhases).toEqual([]);
      expect(status.state?.parallelExecutions![0].waitStrategy).toBe('all');
    });

    it('should transition through all parallel phases with waitStrategy=all', () => {
      startWorkflow('test_parallel_v1', false);

      // phase_0 → phase_1 → phase_2a
      transitionToNextPhase();
      transitionToNextPhase();

      let status = getStatus();
      expect(status.state?.currentPhase).toBe('phase_2a');

      // phase_2a 完了 → phase_2b
      fs.writeFileSync(path.join(TEST_FILES_DIR, 'design.txt'), 'done');
      let result = transitionToNextPhase();
      expect(result.success).toBe(true);
      expect(result.newPhase).toBe('phase_2b');
      expect(result.message).toContain('次の並列フェーズ');

      status = getStatus();
      expect(status.state?.parallelExecutions![0].completedPhases).toContain(
        'phase_2a'
      );

      // phase_2b 完了 → phase_2c
      fs.writeFileSync(path.join(TEST_FILES_DIR, 'copy.txt'), 'done');
      result = transitionToNextPhase();
      expect(result.success).toBe(true);
      expect(result.newPhase).toBe('phase_2c');

      status = getStatus();
      expect(status.state?.parallelExecutions![0].completedPhases).toContain(
        'phase_2b'
      );

      // phase_2c 完了 → phase_3 (並列実行完了)
      fs.writeFileSync(path.join(TEST_FILES_DIR, 'seo.txt'), 'done');
      result = transitionToNextPhase();
      expect(result.success).toBe(true);
      expect(result.newPhase).toBe('phase_3');
      expect(result.message).toContain('並列実行完了');

      status = getStatus();
      expect(status.state?.currentPhase).toBe('phase_3');
      expect(status.state?.parallelExecutions![0].completedPhases).toHaveLength(
        3
      );
      expect(status.state?.parallelExecutions![0].completedAt).toBeDefined();
    });
  });

  describe('waitStrategy: any', () => {
    beforeEach(() => {
      const workflow: WorkflowDefinition = {
        id: 'test_parallel_v1',
        name: 'Parallel Execution Test (Any)',
        version: '1.0.0',
        phases: [
          {
            id: 'phase_0',
            name: 'Preparation',
            nextPhase: 'phase_1',
          },
          {
            id: 'phase_1',
            name: 'Start Parallel',
            parallelNext: {
              phases: ['phase_2a', 'phase_2b'],
              waitStrategy: 'any',
            },
          },
          {
            id: 'phase_2a',
            name: 'Fast Path',
            requiredArtifacts: [path.join(TEST_FILES_DIR, 'fast.txt')],
            nextPhase: 'phase_3',
          },
          {
            id: 'phase_2b',
            name: 'Slow Path',
            requiredArtifacts: [path.join(TEST_FILES_DIR, 'slow.txt')],
            nextPhase: 'phase_3',
          },
          {
            id: 'phase_3',
            name: 'Integration',
            nextPhase: null,
          },
        ],
      };

      fs.writeFileSync(
        TEST_WORKFLOW_PATH,
        JSON.stringify(workflow, null, 2),
        'utf-8'
      );

      // clearCache after creating workflow definition
      clearCache();
    });

    it('should complete parallel execution when any phase completes', () => {
      startWorkflow('test_parallel_v1', false);

      // phase_0 → phase_1 → phase_2a
      transitionToNextPhase();
      transitionToNextPhase();

      let status = getStatus();
      expect(status.state?.currentPhase).toBe('phase_2a');
      expect(status.state?.parallelExecutions![0].waitStrategy).toBe('any');

      // phase_2a 完了 → すぐに phase_3 に進む（waitStrategy='any'なので1つでも完了したらOK）
      fs.writeFileSync(path.join(TEST_FILES_DIR, 'fast.txt'), 'done');
      const result = transitionToNextPhase();
      expect(result.success).toBe(true);
      expect(result.newPhase).toBe('phase_3');
      expect(result.message).toContain('並列実行完了');

      status = getStatus();
      expect(status.state?.currentPhase).toBe('phase_3');
      expect(status.state?.parallelExecutions![0].completedPhases).toContain(
        'phase_2a'
      );
      expect(status.state?.parallelExecutions![0].completedAt).toBeDefined();
    });
  });

  describe('parallel execution state management', () => {
    beforeEach(() => {
      const workflow: WorkflowDefinition = {
        id: 'test_parallel_v1',
        name: 'Parallel State Test',
        version: '1.0.0',
        phases: [
          {
            id: 'phase_0',
            name: 'Start',
            parallelNext: {
              phases: ['phase_1a', 'phase_1b'],
              waitStrategy: 'all',
            },
          },
          {
            id: 'phase_1a',
            name: 'Task A',
            requiredArtifacts: [path.join(TEST_FILES_DIR, 'a.txt')],
            nextPhase: 'phase_2',
          },
          {
            id: 'phase_1b',
            name: 'Task B',
            requiredArtifacts: [path.join(TEST_FILES_DIR, 'b.txt')],
            nextPhase: 'phase_2',
          },
          {
            id: 'phase_2',
            name: 'End',
            nextPhase: null,
          },
        ],
      };

      fs.writeFileSync(
        TEST_WORKFLOW_PATH,
        JSON.stringify(workflow, null, 2),
        'utf-8'
      );

      // clearCache after creating workflow definition
      clearCache();
    });

    it('should track parallel execution state correctly', () => {
      startWorkflow('test_parallel_v1', false);

      // 並列実行開始
      transitionToNextPhase();
      let status = getStatus();

      const parallelExecution = status.state?.parallelExecutions![0];
      expect(parallelExecution?.parallelGroupId).toMatch(/^parallel_\d+$/);
      expect(parallelExecution?.startedPhases).toEqual(['phase_1a', 'phase_1b']);
      expect(parallelExecution?.completedPhases).toEqual([]);
      expect(parallelExecution?.startedAt).toBeDefined();
      expect(parallelExecution?.completedAt).toBeUndefined();

      // 最初のフェーズ完了
      fs.writeFileSync(path.join(TEST_FILES_DIR, 'a.txt'), 'done');
      transitionToNextPhase();
      status = getStatus();

      expect(status.state?.parallelExecutions![0].completedPhases).toContain(
        'phase_1a'
      );
      expect(status.state?.parallelExecutions![0].completedAt).toBeUndefined();

      // 2番目のフェーズ完了
      fs.writeFileSync(path.join(TEST_FILES_DIR, 'b.txt'), 'done');
      transitionToNextPhase();
      status = getStatus();

      expect(status.state?.parallelExecutions![0].completedPhases).toHaveLength(
        2
      );
      expect(status.state?.parallelExecutions![0].completedAt).toBeDefined();
    });
  });

  describe('backward compatibility', () => {
    it('should work with Phase 1-2 workflows (no parallelNext)', () => {
      clearCache();

      const workflow: WorkflowDefinition = {
        id: 'test_parallel_v1',
        name: 'Old Style',
        version: '1.0.0',
        phases: [
          {
            id: 'phase_0',
            name: 'Phase 0',
            nextPhase: 'phase_1',
          },
          {
            id: 'phase_1',
            name: 'Phase 1',
            nextPhase: null,
          },
        ],
      };

      fs.writeFileSync(
        TEST_WORKFLOW_PATH,
        JSON.stringify(workflow, null, 2),
        'utf-8'
      );

      startWorkflow('test_parallel_v1', false);
      const result = transitionToNextPhase();

      expect(result.success).toBe(true);
      expect(result.newPhase).toBe('phase_1');
      expect(result.message).not.toContain('並列');

      const status = getStatus();
      expect(status.state?.parallelExecutions).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle missing artifacts in parallel phases', () => {
      clearCache();

      const workflow: WorkflowDefinition = {
        id: 'test_parallel_v1',
        name: 'Error Test',
        version: '1.0.0',
        phases: [
          {
            id: 'phase_0',
            name: 'Start',
            parallelNext: {
              phases: ['phase_1'],
              waitStrategy: 'all',
            },
          },
          {
            id: 'phase_1',
            name: 'Task',
            requiredArtifacts: [path.join(TEST_FILES_DIR, 'missing.txt')],
            nextPhase: 'phase_2',
          },
          {
            id: 'phase_2',
            name: 'End',
            nextPhase: null,
          },
        ],
      };

      fs.writeFileSync(
        TEST_WORKFLOW_PATH,
        JSON.stringify(workflow, null, 2),
        'utf-8'
      );

      startWorkflow('test_parallel_v1', false);
      transitionToNextPhase(); // Start parallel

      // Try to complete without artifact
      const result = transitionToNextPhase();
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('必須成果物が見つかりません');
    });
  });
});
