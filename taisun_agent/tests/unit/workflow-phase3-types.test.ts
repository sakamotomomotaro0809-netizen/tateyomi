/**
 * Workflow Phase 3 - Type Definitions Tests
 */

import { describe, it, expect } from '@jest/globals';
import type {
  ConditionType,
  Condition,
  ConditionalNext,
  ParallelNext,
  ParallelExecutionState,
  RollbackHistory,
  PhaseSnapshot,
  WorkflowPhase,
  WorkflowState,
} from '../../src/proxy-mcp/workflow/types.js';

describe('Workflow Phase 3 - Type Definitions', () => {
  describe('Conditional Branching Types', () => {
    it('should accept valid ConditionType values', () => {
      const validTypes: ConditionType[] = [
        'file_content',
        'file_exists',
        'command_output',
        'metadata_value',
      ];

      validTypes.forEach((type) => {
        const condition: Condition = {
          type,
          source: 'test.txt',
        };

        expect(condition.type).toBe(type);
      });
    });

    it('should create valid Condition objects', () => {
      const condition: Condition = {
        type: 'file_content',
        source: 'content_type.txt',
        pattern: '^(video|article)$',
        expectedValue: 'video',
      };

      expect(condition.type).toBe('file_content');
      expect(condition.source).toBe('content_type.txt');
      expect(condition.pattern).toBe('^(video|article)$');
      expect(condition.expectedValue).toBe('video');
    });

    it('should create valid ConditionalNext objects', () => {
      const conditionalNext: ConditionalNext = {
        condition: {
          type: 'file_content',
          source: 'type.txt',
        },
        branches: {
          video: 'phase_video',
          article: 'phase_article',
        },
        defaultNext: 'phase_default',
      };

      expect(conditionalNext.branches.video).toBe('phase_video');
      expect(conditionalNext.branches.article).toBe('phase_article');
      expect(conditionalNext.defaultNext).toBe('phase_default');
    });
  });

  describe('Parallel Execution Types', () => {
    it('should create valid ParallelNext objects', () => {
      const parallelNext: ParallelNext = {
        phases: ['phase_a', 'phase_b', 'phase_c'],
        waitStrategy: 'all',
        timeoutMs: 30000,
      };

      expect(parallelNext.phases).toHaveLength(3);
      expect(parallelNext.waitStrategy).toBe('all');
      expect(parallelNext.timeoutMs).toBe(30000);
    });

    it('should accept both wait strategies', () => {
      const waitAll: ParallelNext = {
        phases: ['a', 'b'],
        waitStrategy: 'all',
      };

      const waitAny: ParallelNext = {
        phases: ['a', 'b'],
        waitStrategy: 'any',
      };

      expect(waitAll.waitStrategy).toBe('all');
      expect(waitAny.waitStrategy).toBe('any');
    });

    it('should create valid ParallelExecutionState objects', () => {
      const parallelState: ParallelExecutionState = {
        parallelGroupId: 'parallel_123',
        startedPhases: ['phase_a', 'phase_b'],
        completedPhases: ['phase_a'],
        waitStrategy: 'all',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };

      expect(parallelState.startedPhases).toHaveLength(2);
      expect(parallelState.completedPhases).toHaveLength(1);
      expect(parallelState.completedAt).toBeDefined();
    });
  });

  describe('Rollback Types', () => {
    it('should create valid RollbackHistory objects', () => {
      const rollback: RollbackHistory = {
        rollbackId: 'rollback_456',
        fromPhase: 'phase_3',
        toPhase: 'phase_1',
        reason: 'Design review required changes',
        deletedArtifacts: ['output.md', 'design.png'],
        timestamp: new Date().toISOString(),
        performedBy: 'user@example.com',
      };

      expect(rollback.fromPhase).toBe('phase_3');
      expect(rollback.toPhase).toBe('phase_1');
      expect(rollback.deletedArtifacts).toHaveLength(2);
    });

    it('should create valid PhaseSnapshot objects', () => {
      const snapshot: PhaseSnapshot = {
        phaseId: 'phase_2',
        artifacts: {
          'file1.md': 'content1',
          'file2.md': 'content2',
        },
        metadata: {
          author: 'test',
          version: '1.0',
        },
        timestamp: new Date().toISOString(),
      };

      expect(snapshot.phaseId).toBe('phase_2');
      expect(Object.keys(snapshot.artifacts)).toHaveLength(2);
      expect(snapshot.metadata.author).toBe('test');
    });
  });

  describe('Extended WorkflowPhase', () => {
    it('should support Phase 1-2 basic nextPhase', () => {
      const phase: WorkflowPhase = {
        id: 'phase_1',
        name: 'Phase 1',
        nextPhase: 'phase_2',
      };

      expect(phase.nextPhase).toBe('phase_2');
    });

    it('should support Phase 3 conditional branching', () => {
      const phase: WorkflowPhase = {
        id: 'phase_0',
        name: 'Planning',
        conditionalNext: {
          condition: {
            type: 'file_content',
            source: 'type.txt',
          },
          branches: {
            video: 'video_phase',
            article: 'article_phase',
          },
        },
      };

      expect(phase.conditionalNext).toBeDefined();
      expect(phase.conditionalNext?.branches.video).toBe('video_phase');
    });

    it('should support Phase 3 parallel execution', () => {
      const phase: WorkflowPhase = {
        id: 'phase_prep',
        name: 'Preparation',
        parallelNext: {
          phases: ['design', 'copy', 'seo'],
          waitStrategy: 'all',
        },
      };

      expect(phase.parallelNext).toBeDefined();
      expect(phase.parallelNext?.phases).toHaveLength(3);
    });

    it('should support Phase 3 rollback configuration', () => {
      const phase: WorkflowPhase = {
        id: 'phase_3',
        name: 'Integration',
        allowRollbackTo: ['phase_1', 'phase_2'],
        snapshotEnabled: true,
      };

      expect(phase.allowRollbackTo).toContain('phase_1');
      expect(phase.snapshotEnabled).toBe(true);
    });

    it('should maintain backward compatibility', () => {
      // Phase 1-2 style workflow should still work
      const oldStylePhase: WorkflowPhase = {
        id: 'phase_1',
        name: 'Old Style Phase',
        nextPhase: 'phase_2',
        allowedSkills: ['skill1'],
        requiredArtifacts: ['artifact.md'],
      };

      expect(oldStylePhase.id).toBe('phase_1');
      expect(oldStylePhase.conditionalNext).toBeUndefined();
      expect(oldStylePhase.parallelNext).toBeUndefined();
    });
  });

  describe('Extended WorkflowState', () => {
    it('should support Phase 3 parallel executions', () => {
      const state: WorkflowState = {
        workflowId: 'test_workflow',
        currentPhase: 'phase_1',
        completedPhases: [],
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        strict: false,
        parallelExecutions: [
          {
            parallelGroupId: 'group_1',
            startedPhases: ['a', 'b'],
            completedPhases: [],
            waitStrategy: 'all',
            startedAt: new Date().toISOString(),
          },
        ],
      };

      expect(state.parallelExecutions).toHaveLength(1);
      expect(state.parallelExecutions![0].startedPhases).toContain('a');
    });

    it('should support Phase 3 rollback history', () => {
      const state: WorkflowState = {
        workflowId: 'test_workflow',
        currentPhase: 'phase_1',
        completedPhases: [],
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        strict: false,
        rollbackHistory: [
          {
            rollbackId: 'rb_1',
            fromPhase: 'phase_3',
            toPhase: 'phase_1',
            deletedArtifacts: ['file.md'],
            timestamp: new Date().toISOString(),
          },
        ],
      };

      expect(state.rollbackHistory).toHaveLength(1);
      expect(state.rollbackHistory![0].fromPhase).toBe('phase_3');
    });

    it('should support Phase 3 snapshots', () => {
      const state: WorkflowState = {
        workflowId: 'test_workflow',
        currentPhase: 'phase_2',
        completedPhases: ['phase_1'],
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        strict: false,
        snapshots: [
          {
            phaseId: 'phase_1',
            artifacts: { 'file.md': 'content' },
            metadata: {},
            timestamp: new Date().toISOString(),
          },
        ],
      };

      expect(state.snapshots).toHaveLength(1);
      expect(state.snapshots![0].phaseId).toBe('phase_1');
    });

    it('should support Phase 3 branch history', () => {
      const state: WorkflowState = {
        workflowId: 'test_workflow',
        currentPhase: 'video_phase',
        completedPhases: ['phase_0'],
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        strict: false,
        branchHistory: ['phase_0 -> video_phase (video)'],
      };

      expect(state.branchHistory).toHaveLength(1);
      expect(state.branchHistory![0]).toContain('video');
    });

    it('should maintain backward compatibility', () => {
      // Phase 1-2 style state should still work
      const oldStyleState: WorkflowState = {
        workflowId: 'old_workflow',
        currentPhase: 'phase_1',
        completedPhases: [],
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        strict: false,
      };

      expect(oldStyleState.workflowId).toBe('old_workflow');
      expect(oldStyleState.parallelExecutions).toBeUndefined();
      expect(oldStyleState.rollbackHistory).toBeUndefined();
      expect(oldStyleState.snapshots).toBeUndefined();
    });
  });
});
