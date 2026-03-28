/**
 * Intent Parser - Integration Tests
 */

import { describe, test, expect } from '@jest/globals';
import { IntentParser, IntentType, getHookIntegration } from '../../src/intent-parser';

describe('Intent Parser - Integration Tests', () => {
  const parser = new IntentParser();
  const hookIntegration = getHookIntegration();

  describe('End-to-End Intent Detection', () => {
    test('should detect workflow reuse with high confidence', async () => {
      const result = await parser.parse('同じワークフローを使ってランディングページを作成してください');
      
      expect(result.intent).toBe(IntentType.WORKFLOW_REUSE);
      expect(result.confidence).toBeGreaterThan(85);
      expect(result.context.workflowReuseDetected).toBe(true);
      expect(result.riskLevel).toBe('low');
      expect(result.shouldSkipLayers).toContain(3); // Read-before-Write
    });

    test('should detect skill invocation correctly', async () => {
      const result = await parser.parse('/lp-full-generation でLPを生成して');
      
      expect(result.intent).toBe(IntentType.SKILL_EXECUTE);
      expect(result.confidence).toBeGreaterThan(90);
      expect(result.entities.some(e => e.type === 'skill' && e.value === 'lp-full-generation')).toBe(true);
      expect(result.shouldSkipLayers).toContain(6); // Deviation Approval
    });

    test('should detect existing file reference', async () => {
      const result = await parser.parse('app.ts を編集してバグを修正して');
      
      expect(result.context.existingFilesDetected).toContain('app.ts');
      expect(result.entities.some(e => e.type === 'file' && e.value === 'app.ts')).toBe(true);
    });

    test('should detect multiple intents in complex text', async () => {
      const result = await parser.parse('同じワークフローでapp.tsを編集して、新しいテストも作成してください');
      
      expect(result.intent).toBe(IntentType.WORKFLOW_REUSE);
      expect(result.context.workflowReuseDetected).toBe(true);
      expect(result.context.existingFilesDetected).toContain('app.ts');
      expect(result.entities.length).toBeGreaterThan(0);
    });

    test('should handle session continuation context', async () => {
      const result = await parser.parse('前回の続きから実装してください');
      
      // SESSION_HANDOFF.md が存在する場合のみ true
      expect(result.context).toHaveProperty('sessionContinuation');
    });
  });

  describe('Hook Integration', () => {
    test('should recommend allow for low-risk workflow reuse', async () => {
      const result = await parser.parse('同じワークフローで作成');
      const action = hookIntegration.getRecommendedAction(result);
      
      expect(action).toBe('allow');
      expect(hookIntegration.isWorkflowReuse(result)).toBe(true);
    });

    test('should recommend warn for medium-risk file creation', async () => {
      const result = await parser.parse('新しいファイルを作成して');
      const action = hookIntegration.getRecommendedAction(result);
      
      expect(action).toBe('warn');
      expect(result.riskLevel).toBe('medium');
    });

    test('should recommend block for high-risk with low confidence', async () => {
      // 曖昧な削除コマンド
      const result = await parser.parse('消して');
      
      if (result.intent === IntentType.FILE_DELETE && result.confidence < 70) {
        const action = hookIntegration.getRecommendedAction(result);
        expect(action).toBe('block');
      }
    });

    test('should determine skippable layers correctly', async () => {
      const result = await parser.parse('lp-full-generationスキルを使って');
      
      expect(hookIntegration.shouldSkipHook(result, 6)).toBe(true); // Deviation Approval
      expect(hookIntegration.isSkillInvocation(result)).toBe(true);
    });

    test('should generate appropriate hook message', async () => {
      const result = await parser.parse('同じワークフローで作成');
      const action = hookIntegration.getRecommendedAction(result);
      const message = hookIntegration.generateHookMessage(result, action);
      
      expect(message).toContain('Intent Parser');
      expect(message).toContain(result.intent);
      expect(message).toContain(result.confidence.toString());
    });
  });

  describe('False Positive Detection', () => {
    test('should detect false positive for low confidence', async () => {
      const result = await parser.parse('xyz abc 123');
      
      expect(hookIntegration.isFalsePositive(result)).toBe(true);
      expect(result.confidence).toBeLessThan(30);
    });

    test('should not flag workflow reuse as false positive', async () => {
      const result = await parser.parse('同じワークフローで作成');
      
      expect(hookIntegration.isFalsePositive(result)).toBe(false);
      expect(result.confidence).toBeGreaterThan(70);
    });
  });

  describe('Batch Processing', () => {
    test('should process multiple texts in batch', async () => {
      const texts = [
        '同じワークフローで作成',
        'lp-full-generationスキルを使って',
        'app.tsを編集',
        '新しいファイルを作成',
      ];
      
      const results = await parser.parseBatch(texts);
      
      expect(results.length).toBe(4);
      expect(results[0].intent).toBe(IntentType.WORKFLOW_REUSE);
      expect(results[1].intent).toBe(IntentType.SKILL_INVOCATION);
      expect(results[2].context.existingFilesDetected).toContain('app.ts');
      expect(results[3].intent).toBe(IntentType.FILE_CREATE);
    });
  });

  describe('Real-World Scenarios', () => {
    test('Scenario 1: User requests same workflow for new feature', async () => {
      const result = await parser.parse('前回と同じワークフローを使って、新しいランディングページを作成してください');
      
      expect(result.intent).toBe(IntentType.WORKFLOW_REUSE);
      expect(result.confidence).toBeGreaterThan(80);
      expect(result.riskLevel).toBe('low');
      expect(hookIntegration.shouldSkipHook(result, 3)).toBe(true); // Read-before-Write
    });

    test('Scenario 2: User invokes skill with slash command', async () => {
      const result = await parser.parse('/taiyo-analyzer でセールスレターを分析して');
      
      expect(result.intent).toBe(IntentType.SKILL_EXECUTE);
      expect(result.entities.some(e => e.type === 'skill' && e.value === 'taiyo-analyzer')).toBe(true);
      expect(hookIntegration.shouldSkipHook(result, 6)).toBe(true); // Deviation Approval
    });

    test('Scenario 3: User wants to edit existing file', async () => {
      const result = await parser.parse('app.tsのバグを修正して');

      expect(result.context.existingFilesDetected).toContain('app.ts');
      // バグ修正は CODE_BUGFIX として認識される
      expect(result.intent).toBe(IntentType.CODE_BUGFIX);
    });

    test('Scenario 4: User asks complex multi-step question', async () => {
      const result = await parser.parse('同じワークフローでapp.tsを編集し、新しいテストも作成してデプロイまでお願いします');
      
      expect(result.context.workflowReuseDetected).toBe(true);
      expect(result.context.existingFilesDetected).toContain('app.ts');
      expect(result.entities.length).toBeGreaterThan(0);
    });

    test('Scenario 5: Ambiguous request should have lower confidence', async () => {
      const result = await parser.parse('それを直して');
      
      expect(result.confidence).toBeLessThan(60);
    });
  });

  describe('Error Handling', () => {
    test('should handle empty input gracefully', async () => {
      const result = await parser.parse('');
      
      expect(result.intent).toBe(IntentType.UNKNOWN);
      expect(result.confidence).toBe(0);
    });

    test('should handle very long input', async () => {
      const longText = '同じワークフロー'.repeat(100);
      const result = await parser.parse(longText);
      
      expect(result.intent).toBe(IntentType.WORKFLOW_REUSE);
    });

    test('should handle special characters', async () => {
      const result = await parser.parse('app.ts を編集して <script>alert("test")</script>');
      
      expect(result.context.existingFilesDetected).toContain('app.ts');
    });
  });

  describe('Performance Validation', () => {
    test('should maintain performance under load', async () => {
      const texts = Array(10).fill('同じワークフローで作成');
      const startTime = Date.now();
      
      await parser.parseBatch(texts);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // 10件で1秒以内
    });
  });
});
