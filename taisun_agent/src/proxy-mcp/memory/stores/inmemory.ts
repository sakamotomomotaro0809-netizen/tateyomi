/**
 * In-Memory Store - Fast, non-persistent memory storage
 */

import {
  MemoryStore,
  MemoryEntry,
  MemorySearchResult,
  MemorySearchOptions,
  MemoryNamespace,
} from '../types';

/**
 * In-memory implementation of MemoryStore
 */
export class InMemoryStore implements MemoryStore {
  private entries: Map<string, MemoryEntry> = new Map();

  async add(entry: MemoryEntry): Promise<void> {
    this.entries.set(entry.id, entry);
  }

  async get(id: string): Promise<MemoryEntry | null> {
    return this.entries.get(id) || null;
  }

  async search(
    tokens: string[],
    options: MemorySearchOptions = {}
  ): Promise<MemorySearchResult[]> {
    const results: MemorySearchResult[] = [];
    const now = Date.now();

    for (const entry of this.entries.values()) {
      // Filter by namespace
      if (options.namespace && entry.namespace !== options.namespace) {
        continue;
      }

      // Skip expired entries
      if (entry.expiresAt && entry.expiresAt < now) {
        continue;
      }

      // Filter by tags if specified
      if (options.tags && options.tags.length > 0) {
        const hasMatchingTag = options.tags.some((tag) =>
          entry.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
        );
        if (!hasMatchingTag) {
          continue;
        }
      }

      // Calculate score
      const score = this.calculateScore(entry, tokens);

      if (score >= (options.minScore || 0)) {
        results.push({ entry, score });
      }
    }

    // Sort by score (highest first) and limit
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 10);
  }

  async delete(id: string): Promise<boolean> {
    return this.entries.delete(id);
  }

  async clear(namespace?: MemoryNamespace): Promise<number> {
    if (!namespace) {
      const count = this.entries.size;
      this.entries.clear();
      return count;
    }

    let cleared = 0;
    for (const [id, entry] of this.entries.entries()) {
      if (entry.namespace === namespace) {
        this.entries.delete(id);
        cleared++;
      }
    }
    return cleared;
  }

  async list(namespace?: MemoryNamespace): Promise<MemoryEntry[]> {
    const now = Date.now();
    const entries: MemoryEntry[] = [];

    for (const entry of this.entries.values()) {
      if (namespace && entry.namespace !== namespace) {
        continue;
      }
      // Skip expired entries
      if (entry.expiresAt && entry.expiresAt < now) {
        continue;
      }
      entries.push(entry);
    }

    return entries.sort((a, b) => b.createdAt - a.createdAt);
  }

  async count(namespace?: MemoryNamespace): Promise<number> {
    if (!namespace) {
      return this.entries.size;
    }

    let count = 0;
    for (const entry of this.entries.values()) {
      if (entry.namespace === namespace) {
        count++;
      }
    }
    return count;
  }

  /**
   * Calculate search score for an entry
   */
  private calculateScore(entry: MemoryEntry, tokens: string[]): number {
    if (tokens.length === 0) {
      return 0;
    }

    let score = 0;
    const tokensLower = tokens.map((t) => t.toLowerCase());
    const summaryLower = entry.summary.toLowerCase();
    const contentLower = entry.content.toLowerCase();

    // Token matches in summary (higher weight)
    const summaryMatches = tokensLower.filter((t) => summaryLower.includes(t));
    score += (summaryMatches.length / tokens.length) * 0.4;

    // Token matches in content
    const contentMatches = tokensLower.filter((t) => contentLower.includes(t));
    score += (contentMatches.length / tokens.length) * 0.25;

    // Tag matches
    const tagMatches = tokensLower.filter((t) =>
      entry.tags.some((tag) => tag.toLowerCase().includes(t))
    );
    score += (tagMatches.length / tokens.length) * 0.2;

    // Recency bonus (newer = higher)
    const ageMs = Date.now() - entry.createdAt;
    const ageHours = ageMs / (1000 * 60 * 60);
    const recencyBonus = Math.max(0, 0.1 - ageHours * 0.001); // Decays over time
    score += recencyBonus;

    // Importance bonus
    if (entry.importance) {
      score += entry.importance * 0.05;
    }

    return Math.min(score, 1.0);
  }
}
