/**
 * Memory Service - Main API for memory operations
 *
 * Handles short/long term memory management with minimal output principle.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  MemoryEntry,
  MemoryConfig,
  MemoryStore,
  MemoryNamespace,
  MemoryAddOptions,
  MemorySearchOptions,
  MemoryOutput,
} from './types';
import { createStore } from './store';

const CONFIG_PATH = path.join(process.cwd(), 'config', 'proxy-mcp', 'memory.json');

let instance: MemoryService | null = null;

/**
 * Memory Service - Singleton
 */
export class MemoryService {
  private config: MemoryConfig;
  private store: MemoryStore;

  private constructor(config: MemoryConfig, store: MemoryStore) {
    this.config = config;
    this.store = store;
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MemoryService {
    if (!instance) {
      const config = loadConfig();
      const store = createStore(config);
      instance = new MemoryService(config, store);
    }
    return instance;
  }

  /**
   * Reset instance (for testing)
   */
  static resetInstance(): void {
    instance = null;
  }

  /**
   * Create instance with custom store (for testing)
   */
  static createWithStore(store: MemoryStore): MemoryService {
    const config = loadConfig();
    return new MemoryService(config, store);
  }

  /**
   * Add content to memory
   */
  async add(
    content: string,
    options: MemoryAddOptions = {}
  ): Promise<{ id: string; summary: string }> {
    const namespace = options.namespace || 'short-term';
    const nsConfig = this.config.namespaces[namespace];

    // Generate ID
    const id = crypto.randomBytes(8).toString('hex');

    // Generate summary (truncate if needed)
    const summary = this.generateSummary(content, nsConfig.maxSummaryChars);

    // Calculate expiry
    const now = Date.now();
    const expiresAt = now + nsConfig.ttlDays * 24 * 60 * 60 * 1000;

    // Truncate content if needed
    const truncatedContent =
      content.length > nsConfig.maxContentChars
        ? content.slice(0, nsConfig.maxContentChars) + '... [truncated]'
        : content;

    const entry: MemoryEntry = {
      id,
      namespace,
      content: truncatedContent,
      summary,
      tags: options.tags || [],
      createdAt: now,
      updatedAt: now,
      expiresAt,
      source: options.source,
      importance: options.importance,
      metadata: options.metadata,
    };

    await this.store.add(entry);

    return { id, summary };
  }

  /**
   * Get entry by ID
   */
  async get(id: string, includeContent = false): Promise<MemoryOutput | null> {
    const entry = await this.store.get(id);
    if (!entry) return null;

    return this.formatOutput(entry, includeContent);
  }

  /**
   * Get full content by ID (bypasses preview truncation)
   *
   * Use for large content like URL bundles that need full data.
   */
  async getContent(id: string): Promise<string | null> {
    const entry = await this.store.get(id);
    if (!entry) return null;
    return entry.content;
  }

  /**
   * Search memory
   */
  async search(
    query: string,
    options: MemorySearchOptions = {}
  ): Promise<MemoryOutput[]> {
    // Check if query is a direct ID
    const directEntry = await this.store.get(query);
    if (directEntry) {
      return [this.formatOutput(directEntry, options.includeContent)];
    }

    // Tokenize query
    const tokens = this.tokenize(query);

    // Search
    const results = await this.store.search(tokens, {
      namespace: options.namespace,
      tags: options.tags,
      limit: options.limit || this.config.retrieval.topK,
      minScore: options.minScore || this.config.retrieval.minScore,
    });

    return results.map((r) =>
      this.formatOutput(r.entry, options.includeContent, r.score)
    );
  }

  /**
   * Delete entry by ID
   */
  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  /**
   * Clear memory
   */
  async clear(namespace?: MemoryNamespace): Promise<number> {
    return this.store.clear(namespace);
  }

  /**
   * Get memory statistics
   */
  async stats(): Promise<{
    total: number;
    shortTerm: number;
    longTerm: number;
  }> {
    const shortTerm = await this.store.count('short-term');
    const longTerm = await this.store.count('long-term');
    return {
      total: shortTerm + longTerm,
      shortTerm,
      longTerm,
    };
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<number> {
    const now = Date.now();
    const entries = await this.store.list();
    let cleaned = 0;

    for (const entry of entries) {
      if (entry.expiresAt && entry.expiresAt < now) {
        await this.store.delete(entry.id);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Generate summary from content
   */
  private generateSummary(content: string, maxChars: number): string {
    // Simple summary: first N characters, trimmed at word boundary
    if (content.length <= maxChars) {
      return content;
    }

    let summary = content.slice(0, maxChars);
    const lastSpace = summary.lastIndexOf(' ');
    if (lastSpace > maxChars * 0.8) {
      summary = summary.slice(0, lastSpace);
    }
    return summary + '...';
  }

  /**
   * Tokenize text for search
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1);
  }

  /**
   * Format entry for output (minimal by default)
   */
  private formatOutput(
    entry: MemoryEntry,
    includeContent = false,
    score?: number
  ): MemoryOutput {
    const output: MemoryOutput = {
      id: entry.id,
      namespace: entry.namespace,
      summary: entry.summary,
      tags: entry.tags,
      createdAt: entry.createdAt,
      source: entry.source,
      importance: entry.importance,
    };

    if (score !== undefined) {
      output.score = score;
    }

    if (includeContent) {
      // Return preview, not full content
      const previewChars = this.config.output.contentPreviewChars;
      output.contentPreview =
        entry.content.length > previewChars
          ? entry.content.slice(0, previewChars) + '...'
          : entry.content;
    }

    return output;
  }
}

/**
 * Load memory configuration
 */
function loadConfig(): MemoryConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // Fall through to default
  }

  // Return default config
  return {
    version: '1.0.0',
    storage: {
      defaultBackend: 'inmemory',
      directory: '.taisun/memory',
    },
    namespaces: {
      'short-term': {
        maxEntries: 2000,
        ttlDays: 14,
        maxContentChars: 200000,
        maxSummaryChars: 1200,
      },
      'long-term': {
        maxEntries: 20000,
        ttlDays: 3650,
        maxContentChars: 500000,
        maxSummaryChars: 1200,
      },
    },
    retrieval: {
      topK: 5,
      minScore: 0.15,
    },
    output: {
      includeContentByDefault: false,
      contentPreviewChars: 1200,
    },
  };
}

// Export singleton accessor
export function getMemoryService(): MemoryService {
  return MemoryService.getInstance();
}
