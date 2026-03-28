/**
 * Workflow Engine Tests (Phase 1)
 */

import * as fs from 'fs';
import { loadState, saveState, clearState } from '../../src/proxy-mcp/workflow/store';
import { loadAllWorkflows, getWorkflow } from '../../src/proxy-mcp/workflow/registry';
import {
  startWorkflow,
  getStatus,
  transitionToNextPhase,
  canRunSkill
} from '../../src/proxy-mcp/workflow/engine';
import type { WorkflowState } from '../../src/proxy-mcp/workflow/types';

describe('Workflow Store', () => {
  const TEST_STATE_FILE = '.workflow_state.json';

  beforeEach(() => {
    // Cleanup
    if (fs.existsSync(TEST_STATE_FILE)) {
      fs.unlinkSync(TEST_STATE_FILE);
    }
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(TEST_STATE_FILE)) {
      fs.unlinkSync(TEST_STATE_FILE);
    }
  });

  it('should load null when no state file exists', () => {
    const state = loadState();
    expect(state).toBeNull();
  });

  it('should save and load state', () => {
    const testState: WorkflowState = {
      workflowId: 'test_workflow',
      currentPhase: 'phase_0',
      completedPhases: [],
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      strict: false,
    };

    saveState(testState);
    const loaded = loadState();

    expect(loaded).not.toBeNull();
    expect(loaded?.workflowId).toBe('test_workflow');
    expect(loaded?.currentPhase).toBe('phase_0');
  });

  it('should clear state', () => {
    const testState: WorkflowState = {
      workflowId: 'test_workflow',
      currentPhase: 'phase_0',
      completedPhases: [],
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      strict: false,
    };

    saveState(testState);
    expect(loadState()).not.toBeNull();

    clearState();
    expect(loadState()).toBeNull();
  });
});

describe('Workflow Registry', () => {
  it('should load workflow definitions', () => {
    const workflows = loadAllWorkflows();
    expect(workflows.size).toBeGreaterThan(0);
  });

  it('should load video_generation_v1', () => {
    const workflow = getWorkflow('video_generation_v1');
    expect(workflow.id).toBe('video_generation_v1');
    expect(workflow.phases).toBeDefined();
    expect(workflow.phases.length).toBeGreaterThan(0);
  });

  it('should throw error for non-existent workflow', () => {
    expect(() => getWorkflow('non_existent_workflow')).toThrow();
  });
});

describe('Workflow Engine', () => {
  beforeEach(() => {
    clearState();
  });

  afterEach(() => {
    clearState();
  });

  it('should start workflow', () => {
    const state = startWorkflow('video_generation_v1');
    expect(state.workflowId).toBe('video_generation_v1');
    expect(state.currentPhase).toBe('phase_0');
    expect(state.completedPhases).toEqual([]);
  });

  it('should get status', () => {
    startWorkflow('video_generation_v1');
    const status = getStatus();

    expect(status.active).toBe(true);
    expect(status.state).not.toBeNull();
    expect(status.currentPhase).not.toBeNull();
  });

  it('should not transition without required artifacts', () => {
    startWorkflow('video_generation_v1');

    const result = transitionToNextPhase();
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('Workflow Phase 2 - Strict Mode', () => {
  beforeEach(() => {
    clearState();
  });

  afterEach(() => {
    clearState();
  });

  it('should start workflow in strict mode', () => {
    const state = startWorkflow('video_generation_v1', true);
    expect(state.strict).toBe(true);
  });

  it('should allow skills in non-strict mode', () => {
    startWorkflow('video_generation_v1', false);

    const result = canRunSkill('unauthorized-skill');
    expect(result.ok).toBe(true);
  });

  it('should block unauthorized skills in strict mode', () => {
    // Start in strict mode and move to phase_1
    startWorkflow('video_generation_v1', true);
    const state = loadState();
    if (state) {
      state.currentPhase = 'phase_1';
      saveState(state);
    }

    // Phase 1 allows: vsl, launch-video, copywriting-helper, taiyo-style-vsl
    const result = canRunSkill('unauthorized-skill');
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('🔒 strict mode');
  });

  it('should allow authorized skills in strict mode', () => {
    // Start in strict mode and move to phase_1
    startWorkflow('video_generation_v1', true);
    const state = loadState();
    if (state) {
      state.currentPhase = 'phase_1';
      saveState(state);
    }

    // Phase 1 allows: vsl
    const result = canRunSkill('vsl');
    expect(result.ok).toBe(true);
  });
});
