/**
 * Unified Hook Architecture - Integration Test
 *
 * 統合テスト: Layer 1-4 の通しテスト
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { UnifiedHookOrchestrator } from '../../src/unified-hooks';
import { HookEvent, HookDecision } from '../../src/unified-hooks/types';

describe('Unified Hook Architecture - Integration', () => {
  let orchestrator: UnifiedHookOrchestrator;

  beforeEach(() => {
    orchestrator = new UnifiedHookOrchestrator();
  });

  describe('Fast Path (Read operations)', () => {
    test('should allow Read operations with Fast Path', async () => {
      const event: HookEvent = {
        timestamp: Date.now(),
        toolName: 'Read',
        toolInput: { file_path: '/path/to/file.ts' },
        phase: 'PreToolUse',
        cwd: process.cwd(),
      };

      const result = await orchestrator.process(event);

      expect(result.decision).toBe(HookDecision.ALLOW);
      expect(result.fastPath).toBe(true);
      expect(result.layer1.skipLayers).toContain(2);
      expect(result.layer1.skipLayers).toContain(3);
      expect(result.totalProcessingTimeMs).toBeLessThan(150);
    });

    test('should allow Grep operations with Fast Path', async () => {
      const event: HookEvent = {
        timestamp: Date.now(),
        toolName: 'Grep',
        toolInput: { pattern: 'search-pattern' },
        phase: 'PreToolUse',
        cwd: process.cwd(),
      };

      const result = await orchestrator.process(event);

      expect(result.decision).toBe(HookDecision.ALLOW);
      expect(result.fastPath).toBe(true);
    });
  });

  describe('Security Detection (Layer 3)', () => {
    test('should block command injection', async () => {
      const event: HookEvent = {
        timestamp: Date.now(),
        toolName: 'Bash',
        toolInput: { command: 'ls && rm -rf /' },
        phase: 'PreToolUse',
        cwd: process.cwd(),
      };

      const result = await orchestrator.process(event);

      expect(result.decision).toBe(HookDecision.BLOCK);
      expect(result.layer3?.threats.length).toBeGreaterThan(0);
    });

    test('should detect secret leakage', async () => {
      const event: HookEvent = {
        timestamp: Date.now(),
        toolName: 'Write',
        toolInput: {
          file_path: '/path/to/config.ts',
          content: 'const apiKey = "sk-1234567890abcdefghij";',
        },
        phase: 'PreToolUse',
        cwd: process.cwd(),
      };

      const result = await orchestrator.process(event);

      expect(result.decision).toBe(HookDecision.BLOCK);
      expect(result.layer3?.threats.some(t => t.category === 'secret_leakage')).toBe(true);
    });
  });

  describe('Policy Validation (Layer 2)', () => {
    test('should detect skill requirements', async () => {
      const event: HookEvent = {
        timestamp: Date.now(),
        toolName: 'Write',
        toolInput: {
          file_path: '/path/to/video.tsx',
          content: 'インタラクティブ動画を作成',
        },
        phase: 'PreToolUse',
        cwd: process.cwd(),
      };

      const result = await orchestrator.process(event);

      expect(result.layer2?.skillRequirements.some(
        s => s.skillName === 'interactive-video-platform'
      )).toBe(true);
    });
  });

  describe('Performance Targets', () => {
    test('should achieve <150ms for Fast Path (p95)', async () => {
      const times: number[] = [];

      for (let i = 0; i < 100; i++) {
        const event: HookEvent = {
          timestamp: Date.now(),
          toolName: 'Read',
          toolInput: { file_path: `/path/to/file${i}.ts` },
          phase: 'PreToolUse',
          cwd: process.cwd(),
        };

        const result = await orchestrator.process(event);
        times.push(result.totalProcessingTimeMs);
      }

      times.sort((a, b) => a - b);
      const p95 = times[Math.floor(times.length * 0.95)];

      expect(p95).toBeLessThan(150);
    });

    test('should achieve 30-40% cache hit rate', async () => {
      // 100回の操作（同じパターンを繰り返し）
      for (let i = 0; i < 100; i++) {
        const event: HookEvent = {
          timestamp: Date.now(),
          toolName: 'Read',
          toolInput: { file_path: `/path/to/file${i % 10}.ts` },
          phase: 'PreToolUse',
          cwd: process.cwd(),
        };

        await orchestrator.process(event);
      }

      const stats = orchestrator.getStats();
      expect(stats.layer1.hitRate).toBeGreaterThanOrEqual(0.3);
      expect(stats.layer1.hitRate).toBeLessThanOrEqual(0.5);
    });
  });

  describe('Error Handling', () => {
    test('should gracefully handle malformed events', async () => {
      const event: HookEvent = {
        timestamp: Date.now(),
        toolName: 'InvalidTool' as any,
        toolInput: {},
        phase: 'PreToolUse',
        cwd: process.cwd(),
      };

      const result = await orchestrator.process(event);

      // エラー時は ALLOW (システム障害でブロックしない)
      expect(result.decision).toBe(HookDecision.ALLOW);
    });
  });
});
