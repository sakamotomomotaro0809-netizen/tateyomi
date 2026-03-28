/**
 * URL Bundle Unit Tests
 *
 * Tests for URL normalization, deduplication, and grouping.
 */

import {
  normalizeUrl,
  parseUrlList,
  normalizeUrlBundle,
  getUrlBundleStats,
  DEFAULT_URL_BUNDLE_CONFIG,
} from '../../src/proxy-mcp/browser/url-bundle';
import * as memoryTools from '../../src/proxy-mcp/tools/memory';

// Mock memory tools
jest.mock('../../src/proxy-mcp/tools/memory');
jest.mock('../../src/proxy-mcp/observability', () => ({
  recordEvent: jest.fn(),
}));

const mockMemoryGetContent = memoryTools.memoryGetContent as jest.MockedFunction<
  typeof memoryTools.memoryGetContent
>;
const mockMemoryAdd = memoryTools.memoryAdd as jest.MockedFunction<
  typeof memoryTools.memoryAdd
>;

describe('URL Bundle Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeUrl', () => {
    const config = DEFAULT_URL_BUNDLE_CONFIG;

    it('should normalize a simple URL', () => {
      const result = normalizeUrl('https://example.com/page', config);

      expect(result).not.toBeNull();
      expect(result?.url).toBe('https://example.com/page');
      expect(result?.domain).toBe('example.com');
    });

    it('should remove UTM parameters', () => {
      const result = normalizeUrl(
        'https://example.com/page?utm_source=twitter&utm_medium=social&id=123',
        config
      );

      expect(result?.url).toBe('https://example.com/page?id=123');
    });

    it('should remove all tracking parameters', () => {
      const result = normalizeUrl(
        'https://example.com/page?fbclid=abc&gclid=def&ref=home',
        config
      );

      expect(result?.url).toBe('https://example.com/page');
    });

    it('should normalize trailing slashes', () => {
      const result = normalizeUrl('https://example.com/page/', config);

      expect(result?.url).toBe('https://example.com/page');
    });

    it('should keep root trailing slash', () => {
      const result = normalizeUrl('https://example.com/', config);

      expect(result?.url).toBe('https://example.com/');
    });

    it('should trim whitespace', () => {
      const result = normalizeUrl('  https://example.com/page  ', config);

      expect(result?.url).toBe('https://example.com/page');
    });

    it('should return null for invalid URLs', () => {
      expect(normalizeUrl('not a url', config)).toBeNull();
      expect(normalizeUrl('', config)).toBeNull();
      expect(normalizeUrl('   ', config)).toBeNull();
    });

    it('should track original URL when modified', () => {
      const result = normalizeUrl(
        'https://example.com/page?utm_source=test',
        config
      );

      expect(result?.url).toBe('https://example.com/page');
      expect(result?.originalUrl).toBe('https://example.com/page?utm_source=test');
    });

    it('should not track original URL when unchanged', () => {
      const result = normalizeUrl('https://example.com/page', config);

      expect(result?.originalUrl).toBeUndefined();
    });

    it('should preserve necessary query parameters', () => {
      const result = normalizeUrl(
        'https://example.com/search?q=test&page=2',
        config
      );

      expect(result?.url).toBe('https://example.com/search?q=test&page=2');
    });
  });

  describe('parseUrlList', () => {
    it('should parse JSON array of strings', () => {
      const input = JSON.stringify([
        'https://example.com/1',
        'https://example.com/2',
      ]);

      const result = parseUrlList(input);

      expect(result).toEqual([
        'https://example.com/1',
        'https://example.com/2',
      ]);
    });

    it('should parse JSON array of URL objects', () => {
      const input = JSON.stringify([
        { url: 'https://example.com/1', title: 'Page 1' },
        { url: 'https://example.com/2', title: 'Page 2' },
      ]);

      const result = parseUrlList(input);

      expect(result).toEqual([
        'https://example.com/1',
        'https://example.com/2',
      ]);
    });

    it('should parse JSON array of href objects', () => {
      const input = JSON.stringify([
        { href: 'https://example.com/1', text: 'Link 1' },
        { href: 'https://example.com/2', text: 'Link 2' },
      ]);

      const result = parseUrlList(input);

      expect(result).toEqual([
        'https://example.com/1',
        'https://example.com/2',
      ]);
    });

    it('should parse JSON object with urls array', () => {
      const input = JSON.stringify({
        urls: ['https://example.com/1', 'https://example.com/2'],
      });

      const result = parseUrlList(input);

      expect(result).toEqual([
        'https://example.com/1',
        'https://example.com/2',
      ]);
    });

    it('should parse JSON object with tabs array', () => {
      const input = JSON.stringify({
        tabs: [
          { url: 'https://example.com/1' },
          { url: 'https://example.com/2' },
        ],
      });

      const result = parseUrlList(input);

      expect(result).toEqual([
        'https://example.com/1',
        'https://example.com/2',
      ]);
    });

    it('should parse newline-separated URLs', () => {
      const input = `https://example.com/1
https://example.com/2
https://example.com/3`;

      const result = parseUrlList(input);

      expect(result).toEqual([
        'https://example.com/1',
        'https://example.com/2',
        'https://example.com/3',
      ]);
    });

    it('should parse comma-separated URLs', () => {
      const input = 'https://example.com/1, https://example.com/2, https://example.com/3';

      const result = parseUrlList(input);

      expect(result).toEqual([
        'https://example.com/1',
        'https://example.com/2',
        'https://example.com/3',
      ]);
    });

    it('should filter non-URL lines', () => {
      const input = `Some text
https://example.com/1
Another text line
https://example.com/2`;

      const result = parseUrlList(input);

      expect(result).toEqual([
        'https://example.com/1',
        'https://example.com/2',
      ]);
    });

    it('should handle empty input', () => {
      expect(parseUrlList('')).toEqual([]);
      expect(parseUrlList('no urls here')).toEqual([]);
    });
  });

  describe('normalizeUrlBundle', () => {
    it('should normalize URL bundle from memory', async () => {
      const inputUrls = [
        'https://example.com/page1?utm_source=test',
        'https://example.com/page2/',
        'https://example.com/page1?utm_source=other', // duplicate after normalization
        'https://other.com/page',
      ];

      mockMemoryGetContent.mockResolvedValue({
        success: true,
        data: { id: 'ref-input-123', content: JSON.stringify(inputUrls), contentLength: 100 },
      });

      mockMemoryAdd.mockResolvedValue({
        success: true,
        referenceId: 'ref-output-123',
      });

      const result = await normalizeUrlBundle('ref-input-123');

      expect(result.success).toBe(true);
      expect(result.outputRefId).toBe('ref-output-123');
      expect(result.data?.inputCount).toBe(4);
      expect(result.data?.outputCount).toBe(3); // 1 duplicate removed
      expect(result.data?.duplicatesRemoved).toBe(1);
    });

    it('should apply maxUrls limit', async () => {
      const inputUrls = Array.from({ length: 300 }, (_, i) =>
        `https://example.com/page${i}`
      );

      mockMemoryGetContent.mockResolvedValue({
        success: true,
        data: { id: 'ref-input-456', content: JSON.stringify(inputUrls), contentLength: 10000 },
      });

      mockMemoryAdd.mockResolvedValue({
        success: true,
        referenceId: 'ref-output-456',
      });

      const result = await normalizeUrlBundle('ref-input-456', { maxUrls: 100 });

      expect(result.success).toBe(true);
      expect(result.data?.outputCount).toBe(100);
    });

    it('should group URLs by domain', async () => {
      const inputUrls = [
        'https://example.com/1',
        'https://example.com/2',
        'https://other.com/1',
      ];

      mockMemoryGetContent.mockResolvedValue({
        success: true,
        data: { id: 'ref-input-789', content: JSON.stringify(inputUrls), contentLength: 100 },
      });

      mockMemoryAdd.mockResolvedValue({
        success: true,
        referenceId: 'ref-output-789',
      });

      const result = await normalizeUrlBundle('ref-input-789');

      expect(result.success).toBe(true);
      expect(result.data?.domainGroups).toEqual({
        'example.com': 2,
        'other.com': 1,
      });
    });

    it('should return error when input refId not found', async () => {
      mockMemoryGetContent.mockResolvedValue({
        success: false,
        error: 'Memory entry not found: ref-not-found',
      });

      const result = await normalizeUrlBundle('ref-not-found');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to find URL bundle');
    });

    it('should return error when no valid URLs found', async () => {
      mockMemoryGetContent.mockResolvedValue({
        success: true,
        data: { id: 'ref-no-urls', content: 'no urls here', contentLength: 12 },
      });

      const result = await normalizeUrlBundle('ref-no-urls');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid URLs found');
    });

    it('should return error when memory store fails', async () => {
      mockMemoryGetContent.mockResolvedValue({
        success: true,
        data: { id: 'ref-store-fail', content: JSON.stringify(['https://example.com']), contentLength: 50 },
      });

      mockMemoryAdd.mockResolvedValue({
        success: false,
        error: 'Storage error',
      });

      const result = await normalizeUrlBundle('ref-store-fail');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to store');
    });
  });

  describe('getUrlBundleStats', () => {
    it('should return URL statistics', async () => {
      const inputUrls = [
        'https://example.com/1',
        'https://example.com/2',
        'https://other.com/1',
        'https://third.org/page',
      ];

      mockMemoryGetContent.mockResolvedValue({
        success: true,
        data: { id: 'ref-stats-123', content: JSON.stringify(inputUrls), contentLength: 100 },
      });

      const result = await getUrlBundleStats('ref-stats-123');

      expect(result.success).toBe(true);
      expect(result.stats?.totalUrls).toBe(4);
      expect(result.stats?.uniqueDomains).toBe(3);
      expect(result.stats?.topDomains).toContainEqual({
        domain: 'example.com',
        count: 2,
      });
    });

    it('should return error when refId not found', async () => {
      mockMemoryGetContent.mockResolvedValue({
        success: false,
        error: 'Memory entry not found: ref-not-found',
      });

      const result = await getUrlBundleStats('ref-not-found');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to find');
    });
  });
});
