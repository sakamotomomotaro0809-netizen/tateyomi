/**
 * URL Bundle Skillize Unit Tests
 *
 * Tests for batch skillize processing of URL bundles.
 */

import {
  batchSkillizeUrlBundle,
  getBatchSkillizePreview,
  DEFAULT_BATCH_SKILLIZE_CONFIG,
} from '../../src/proxy-mcp/browser/url-bundle-skillize';
import * as memoryTools from '../../src/proxy-mcp/tools/memory';
import * as skillizeModule from '../../src/proxy-mcp/skillize';

// Mock memory tools
jest.mock('../../src/proxy-mcp/tools/memory');
jest.mock('../../src/proxy-mcp/skillize');
jest.mock('../../src/proxy-mcp/observability', () => ({
  recordEvent: jest.fn(),
}));

const mockMemoryGetContent = memoryTools.memoryGetContent as jest.MockedFunction<
  typeof memoryTools.memoryGetContent
>;
const mockMemoryAdd = memoryTools.memoryAdd as jest.MockedFunction<
  typeof memoryTools.memoryAdd
>;
const mockSkillize = skillizeModule.skillize as jest.MockedFunction<
  typeof skillizeModule.skillize
>;

// Helper to create mock skill data
const mockSkillData = (name: string) => ({
  skillName: name,
  preview: 'preview content',
  filesCount: 1,
  written: false,
  message: 'dry-run complete',
});

describe('URL Bundle Skillize Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DEFAULT_BATCH_SKILLIZE_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_BATCH_SKILLIZE_CONFIG.maxUrls).toBe(50);
      expect(DEFAULT_BATCH_SKILLIZE_CONFIG.rateLimitMs).toBe(1000);
      expect(DEFAULT_BATCH_SKILLIZE_CONFIG.confirmWrite).toBe(false);
      expect(DEFAULT_BATCH_SKILLIZE_CONFIG.namespace).toBe('long-term');
      expect(DEFAULT_BATCH_SKILLIZE_CONFIG.stopOnError).toBe(false);
    });
  });

  describe('batchSkillizeUrlBundle', () => {
    const mockNormalizedBundle = {
      urls: [
        { url: 'https://example.com/docs/page1', domain: 'example.com' },
        { url: 'https://example.com/docs/page2', domain: 'example.com' },
        { url: 'https://other.com/api', domain: 'other.com' },
      ],
    };

    it('should process URL bundle successfully', async () => {
      mockMemoryGetContent.mockResolvedValue({
        success: true,
        data: { id: 'ref-input', content: JSON.stringify(mockNormalizedBundle), contentLength: 200 },
      });

      mockSkillize
        .mockResolvedValueOnce({
          success: true,
          refId: 'skill-ref-1',
          summary: 'Generated skill 1',
          template: 'docs',
          data: mockSkillData('example-docs-page1'),
        })
        .mockResolvedValueOnce({
          success: true,
          refId: 'skill-ref-2',
          summary: 'Generated skill 2',
          template: 'docs',
          data: mockSkillData('example-docs-page2'),
        })
        .mockResolvedValueOnce({
          success: true,
          refId: 'skill-ref-3',
          summary: 'Generated skill 3',
          template: 'docs',
          data: mockSkillData('other-api'),
        });

      mockMemoryAdd.mockResolvedValue({
        success: true,
        referenceId: 'ref-output-123',
      });

      const result = await batchSkillizeUrlBundle('ref-input', { rateLimitMs: 0 });

      expect(result.success).toBe(true);
      expect(result.outputRefId).toBe('ref-output-123');
      expect(result.data?.inputCount).toBe(3);
      expect(result.data?.processedCount).toBe(3);
      expect(result.data?.successCount).toBe(3);
      expect(result.data?.failureCount).toBe(0);
      expect(result.data?.dryRun).toBe(true);
      expect(mockSkillize).toHaveBeenCalledTimes(3);
    });

    it('should handle skillize failures gracefully', async () => {
      mockMemoryGetContent.mockResolvedValue({
        success: true,
        data: { id: 'ref-input', content: JSON.stringify(mockNormalizedBundle), contentLength: 200 },
      });

      mockSkillize
        .mockResolvedValueOnce({
          success: true,
          refId: 'skill-ref-1',
          summary: 'Generated skill 1',
          template: 'docs',
          data: mockSkillData('skill-1'),
        })
        .mockResolvedValueOnce({
          success: false,
          error: 'CAPTCHA detected',
        })
        .mockResolvedValueOnce({
          success: true,
          refId: 'skill-ref-3',
          summary: 'Generated skill 3',
          template: 'docs',
          data: mockSkillData('skill-3'),
        });

      mockMemoryAdd.mockResolvedValue({
        success: true,
        referenceId: 'ref-output-456',
      });

      const result = await batchSkillizeUrlBundle('ref-input', { rateLimitMs: 0 });

      expect(result.success).toBe(true);
      expect(result.data?.successCount).toBe(2);
      expect(result.data?.failureCount).toBe(1);
    });

    it('should stop on first error when configured', async () => {
      mockMemoryGetContent.mockResolvedValue({
        success: true,
        data: { id: 'ref-input', content: JSON.stringify(mockNormalizedBundle), contentLength: 200 },
      });

      mockSkillize
        .mockResolvedValueOnce({
          success: true,
          refId: 'skill-ref-1',
          summary: 'Generated skill 1',
          template: 'docs',
          data: mockSkillData('skill-1'),
        })
        .mockResolvedValueOnce({
          success: false,
          error: 'Error on second URL',
        });

      mockMemoryAdd.mockResolvedValue({
        success: true,
        referenceId: 'ref-output-789',
      });

      const result = await batchSkillizeUrlBundle('ref-input', {
        rateLimitMs: 0,
        stopOnError: true,
      });

      expect(result.success).toBe(true);
      expect(result.data?.processedCount).toBe(2);
      expect(result.data?.successCount).toBe(1);
      expect(result.data?.failureCount).toBe(1);
      expect(mockSkillize).toHaveBeenCalledTimes(2);
    });

    it('should apply maxUrls limit', async () => {
      const manyUrls = {
        urls: Array.from({ length: 100 }, (_, i) => ({
          url: `https://example.com/page${i}`,
          domain: 'example.com',
        })),
      };

      mockMemoryGetContent.mockResolvedValue({
        success: true,
        data: { id: 'ref-input', content: JSON.stringify(manyUrls), contentLength: 5000 },
      });

      mockSkillize.mockResolvedValue({
        success: true,
        refId: 'skill-ref',
        summary: 'Generated skill',
        template: 'docs',
        data: mockSkillData('skill'),
      });

      mockMemoryAdd.mockResolvedValue({
        success: true,
        referenceId: 'ref-output',
      });

      const result = await batchSkillizeUrlBundle('ref-input', {
        maxUrls: 10,
        rateLimitMs: 0,
      });

      expect(result.success).toBe(true);
      expect(result.data?.processedCount).toBe(10);
      expect(result.data?.skippedCount).toBe(90);
      expect(mockSkillize).toHaveBeenCalledTimes(10);
    });

    it('should pass confirmWrite to skillize', async () => {
      mockMemoryGetContent.mockResolvedValue({
        success: true,
        data: {
          id: 'ref-input',
          content: JSON.stringify({ urls: [{ url: 'https://example.com', domain: 'example.com' }] }),
          contentLength: 100,
        },
      });

      mockSkillize.mockResolvedValue({
        success: true,
        refId: 'skill-ref',
        summary: 'Generated skill',
        template: 'docs',
        data: mockSkillData('skill'),
      });

      mockMemoryAdd.mockResolvedValue({
        success: true,
        referenceId: 'ref-output',
      });

      await batchSkillizeUrlBundle('ref-input', {
        rateLimitMs: 0,
        confirmWrite: true,
      });

      expect(mockSkillize).toHaveBeenCalledWith('https://example.com', expect.objectContaining({
        confirmWrite: true,
      }));
    });

    it('should return error when input refId not found', async () => {
      mockMemoryGetContent.mockResolvedValue({
        success: false,
        error: 'Memory entry not found',
      });

      const result = await batchSkillizeUrlBundle('ref-not-found');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to find URL bundle');
    });

    it('should return error when bundle has no URLs', async () => {
      mockMemoryGetContent.mockResolvedValue({
        success: true,
        data: { id: 'ref-input', content: JSON.stringify({ urls: [] }), contentLength: 10 },
      });

      const result = await batchSkillizeUrlBundle('ref-input');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No URLs found');
    });

    it('should return error when memory store fails', async () => {
      mockMemoryGetContent.mockResolvedValue({
        success: true,
        data: {
          id: 'ref-input',
          content: JSON.stringify({ urls: [{ url: 'https://example.com', domain: 'example.com' }] }),
          contentLength: 100,
        },
      });

      mockSkillize.mockResolvedValue({
        success: true,
        refId: 'skill-ref',
        summary: 'Generated skill',
        template: 'docs',
        data: mockSkillData('skill'),
      });

      mockMemoryAdd.mockResolvedValue({
        success: false,
        error: 'Storage error',
      });

      const result = await batchSkillizeUrlBundle('ref-input', { rateLimitMs: 0 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to store');
    });

    it('should handle domain groups format', async () => {
      const bundleWithGroups = {
        domainGroups: [
          {
            domain: 'example.com',
            urls: [
              { url: 'https://example.com/1', domain: 'example.com' },
              { url: 'https://example.com/2', domain: 'example.com' },
            ],
          },
          {
            domain: 'other.com',
            urls: [{ url: 'https://other.com/1', domain: 'other.com' }],
          },
        ],
      };

      mockMemoryGetContent.mockResolvedValue({
        success: true,
        data: { id: 'ref-input', content: JSON.stringify(bundleWithGroups), contentLength: 300 },
      });

      mockSkillize.mockResolvedValue({
        success: true,
        refId: 'skill-ref',
        summary: 'Generated skill',
        template: 'docs',
        data: mockSkillData('skill'),
      });

      mockMemoryAdd.mockResolvedValue({
        success: true,
        referenceId: 'ref-output',
      });

      const result = await batchSkillizeUrlBundle('ref-input', { rateLimitMs: 0 });

      expect(result.success).toBe(true);
      expect(result.data?.inputCount).toBe(3);
      expect(mockSkillize).toHaveBeenCalledTimes(3);
    });
  });

  describe('getBatchSkillizePreview', () => {
    it('should return preview of batch processing', async () => {
      const bundle = {
        urls: [
          { url: 'https://example.com/1', domain: 'example.com' },
          { url: 'https://example.com/2', domain: 'example.com' },
          { url: 'https://other.com/1', domain: 'other.com' },
        ],
      };

      mockMemoryGetContent.mockResolvedValue({
        success: true,
        data: { id: 'ref-input', content: JSON.stringify(bundle), contentLength: 200 },
      });

      const result = await getBatchSkillizePreview('ref-input');

      expect(result.success).toBe(true);
      expect(result.preview?.totalUrls).toBe(3);
      expect(result.preview?.urlsToProcess).toBe(3);
      expect(result.preview?.urlsToSkip).toBe(0);
      expect(result.preview?.domains).toEqual({
        'example.com': 2,
        'other.com': 1,
      });
      expect(result.preview?.estimatedTimeMs).toBeGreaterThan(0);
    });

    it('should show skipped URLs when exceeding maxUrls', async () => {
      const bundle = {
        urls: Array.from({ length: 100 }, (_, i) => ({
          url: `https://example.com/page${i}`,
          domain: 'example.com',
        })),
      };

      mockMemoryGetContent.mockResolvedValue({
        success: true,
        data: { id: 'ref-input', content: JSON.stringify(bundle), contentLength: 5000 },
      });

      const result = await getBatchSkillizePreview('ref-input', { maxUrls: 20 });

      expect(result.success).toBe(true);
      expect(result.preview?.totalUrls).toBe(100);
      expect(result.preview?.urlsToProcess).toBe(20);
      expect(result.preview?.urlsToSkip).toBe(80);
    });

    it('should return error when refId not found', async () => {
      mockMemoryGetContent.mockResolvedValue({
        success: false,
        error: 'Not found',
      });

      const result = await getBatchSkillizePreview('ref-not-found');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to find');
    });
  });
});
