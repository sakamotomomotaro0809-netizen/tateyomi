/**
 * Normalize - Utility functions for normalizing MCP descriptions
 *
 * Used to create compact, searchable representations of MCPs
 * for semantic routing without exposing full tool definitions to Claude.
 */

import { InternalMcpDefinition } from '../router/types';

/**
 * Normalize text for indexing
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract keywords from text
 */
export function extractKeywords(text: string, maxKeywords: number = 10): string[] {
  const normalized = normalizeText(text);
  const words = normalized.split(' ').filter((w) => w.length > 2);

  // Simple stop words
  const stopWords = new Set([
    'the',
    'and',
    'for',
    'are',
    'but',
    'not',
    'you',
    'all',
    'can',
    'had',
    'her',
    'was',
    'one',
    'our',
    'out',
    'with',
    'this',
    'that',
    'from',
    'they',
    'have',
    'been',
  ]);

  const keywords = words.filter((w) => !stopWords.has(w));

  // Count frequency
  const freq: Record<string, number> = {};
  for (const word of keywords) {
    freq[word] = (freq[word] || 0) + 1;
  }

  // Sort by frequency and return top N
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

/**
 * Create a compact index entry for an MCP
 */
export interface McpIndexEntry {
  name: string;
  keywords: string[];
  tags: string[];
  shortDescription: string;
}

/**
 * Create index entry for an MCP
 */
export function createIndexEntry(mcp: InternalMcpDefinition): McpIndexEntry {
  const keywords = extractKeywords(mcp.shortDescription);

  return {
    name: mcp.name,
    keywords,
    tags: mcp.tags.map((t) => t.toLowerCase()),
    shortDescription: mcp.shortDescription.slice(0, 100),
  };
}

/**
 * Create index for all MCPs
 */
export function createMcpIndex(mcps: InternalMcpDefinition[]): McpIndexEntry[] {
  return mcps.map(createIndexEntry);
}

/**
 * Format MCP for minimal context exposure
 */
export function formatMinimalMcp(mcp: InternalMcpDefinition): string {
  return `${mcp.name}: ${mcp.shortDescription} [${mcp.tags.join(', ')}]`;
}

/**
 * Format multiple MCPs for minimal context exposure
 */
export function formatMinimalMcpList(mcps: InternalMcpDefinition[]): string {
  return mcps.map(formatMinimalMcp).join('\n');
}
