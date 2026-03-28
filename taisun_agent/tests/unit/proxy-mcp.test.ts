/**
 * Proxy MCP Unit Tests
 */

import { systemHealth } from '../../src/proxy-mcp/tools/system';
import { memoryAdd, memorySearch, memoryStats, memoryClearShortTerm, memoryClearAll } from '../../src/proxy-mcp/tools/memory';
import { skillSearch, skillRun } from '../../src/proxy-mcp/tools/skill';
import { MemoryService } from '../../src/proxy-mcp/memory';

describe('Proxy MCP', () => {
  describe('system.health', () => {
    it('should return healthy status', () => {
      const result = systemHealth();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain((result.data as { status: string }).status);
      expect((result.data as { version: string }).version).toBe('0.2.0');
      expect((result.data as { uptime: number }).uptime).toBeGreaterThanOrEqual(0);
      expect((result.data as { timestamp: string }).timestamp).toBeDefined();
    });

    it('should include circuit breaker status', () => {
      const result = systemHealth();

      expect(result.data).toBeDefined();
      const data = result.data as { circuits: { total: number; closed: number; open: number; halfOpen: number } };
      expect(data.circuits).toBeDefined();
      expect(typeof data.circuits.total).toBe('number');
      expect(typeof data.circuits.closed).toBe('number');
      expect(typeof data.circuits.open).toBe('number');
      expect(typeof data.circuits.halfOpen).toBe('number');
    });

    it('should include rollout status', () => {
      const result = systemHealth();

      expect(result.data).toBeDefined();
      const data = result.data as { rollout: { overlayActive: boolean; mcps: unknown[] } };
      expect(data.rollout).toBeDefined();
      expect(typeof data.rollout.overlayActive).toBe('boolean');
      expect(Array.isArray(data.rollout.mcps)).toBe(true);
    });
  });

  describe('memory tools', () => {
    beforeEach(async () => {
      // Reset singleton and clear all memory before each test
      MemoryService.resetInstance();
      await memoryClearAll();
    });

    describe('memory.add', () => {
      it('should store content and return reference ID', async () => {
        const result = await memoryAdd('Test content', 'short-term');

        expect(result.success).toBe(true);
        expect(result.referenceId).toBeDefined();
        expect(typeof result.referenceId).toBe('string');
        expect((result.data as { contentLength: number }).contentLength).toBe(12);
      });

      it('should store with metadata', async () => {
        const result = await memoryAdd('Content with meta', 'long-term', { source: 'test' });

        expect(result.success).toBe(true);
        expect(result.referenceId).toBeDefined();
      });

      it('should return summary in response', async () => {
        const result = await memoryAdd('Test content for summary generation', 'short-term');

        expect(result.success).toBe(true);
        expect((result.data as { summary: string }).summary).toBeDefined();
      });
    });

    describe('memory.search', () => {
      it('should find content by ID', async () => {
        const addResult = await memoryAdd('Searchable content', 'short-term');
        const id = addResult.referenceId!;

        const searchResult = await memorySearch(id);

        expect(searchResult.success).toBe(true);
        expect((searchResult.data as { found: boolean }).found).toBe(true);
        expect((searchResult.data as { results: unknown[] }).results.length).toBe(1);
      });

      it('should find content by keyword', async () => {
        await memoryAdd('The quick brown fox', 'short-term');
        await memoryAdd('Lazy dog sleeps', 'short-term');

        const result = await memorySearch('fox');

        expect(result.success).toBe(true);
        expect((result.data as { found: boolean }).found).toBe(true);
        expect((result.data as { results: unknown[] }).results.length).toBeGreaterThanOrEqual(1);
      });

      it('should return empty results for non-matching query', async () => {
        await memoryAdd('Some content', 'short-term');

        const result = await memorySearch('nonexistent');

        expect(result.success).toBe(true);
        expect((result.data as { found: boolean }).found).toBe(false);
        expect((result.data as { results: unknown[] }).results.length).toBe(0);
      });

      it('should filter by namespace', async () => {
        await memoryAdd('Short term content', 'short-term');
        await memoryAdd('Long term content', 'long-term');

        const result = await memorySearch('content', { namespace: 'short-term' });

        expect(result.success).toBe(true);
        expect((result.data as { results: Array<{ namespace: string }> }).results.every(
          r => r.namespace === 'short-term'
        )).toBe(true);
      });
    });

    describe('memory.stats', () => {
      it('should return memory statistics', async () => {
        await memoryAdd('Short term 1', 'short-term');
        await memoryAdd('Short term 2', 'short-term');
        await memoryAdd('Long term 1', 'long-term');

        const result = await memoryStats();

        expect(result.success).toBe(true);
        expect((result.data as { total: number }).total).toBe(3);
        expect((result.data as { shortTerm: number }).shortTerm).toBe(2);
        expect((result.data as { longTerm: number }).longTerm).toBe(1);
      });
    });

    describe('memoryClearShortTerm', () => {
      it('should clear only short-term memory', async () => {
        await memoryAdd('Short term', 'short-term');
        await memoryAdd('Long term', 'long-term');

        const clearResult = await memoryClearShortTerm();
        const statsResult = await memoryStats();

        expect(clearResult.success).toBe(true);
        expect((clearResult.data as { cleared: number }).cleared).toBe(1);
        expect((statsResult.data as { total: number }).total).toBe(1);
        expect((statsResult.data as { longTerm: number }).longTerm).toBe(1);
      });
    });
  });

  describe('skill tools', () => {
    describe('skill.search', () => {
      it('should return empty array when skills directory does not exist', () => {
        const result = skillSearch('test');

        expect(result.success).toBe(true);
        expect((result.data as { skills: unknown[] }).skills).toEqual([]);
      });

      it('should search with empty query', () => {
        const result = skillSearch('');

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });
    });

    describe('skill.run', () => {
      it('should return error for non-existent skill', () => {
        const result = skillRun('nonexistent-skill');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Skill not found');
      });
    });
  });
});
