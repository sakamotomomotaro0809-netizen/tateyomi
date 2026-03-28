/**
 * JSONL Store - File-based persistent memory storage
 *
 * Uses append-only JSONL format with periodic compaction.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  MemoryStore,
  MemoryEntry,
  MemorySearchResult,
  MemorySearchOptions,
  MemoryNamespace,
} from '../types';

type Operation = 'add' | 'update' | 'delete';

interface LogEntry {
  op: Operation;
  entry?: MemoryEntry;
  id?: string;
  timestamp: number;
}

/**
 * JSONL file-based implementation of MemoryStore
 */
export class JsonlStore implements MemoryStore {
  private directory: string;
  private entries: Map<string, MemoryEntry> = new Map();
  private logFile: string;
  private initialized = false;

  constructor(directory: string) {
    this.directory = directory;
    this.logFile = path.join(directory, 'memory.jsonl');
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    // Create directory if it doesn't exist
    if (!fs.existsSync(this.directory)) {
      fs.mkdirSync(this.directory, { recursive: true });
    }

    // Load existing entries from log file
    if (fs.existsSync(this.logFile)) {
      const content = fs.readFileSync(this.logFile, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const logEntry: LogEntry = JSON.parse(line);
          this.applyLogEntry(logEntry);
        } catch {
          // Skip invalid lines
        }
      }
    }

    this.initialized = true;
  }

  private applyLogEntry(logEntry: LogEntry): void {
    switch (logEntry.op) {
      case 'add':
      case 'update':
        if (logEntry.entry) {
          this.entries.set(logEntry.entry.id, logEntry.entry);
        }
        break;
      case 'delete':
        if (logEntry.id) {
          this.entries.delete(logEntry.id);
        }
        break;
    }
  }

  private appendLog(logEntry: LogEntry): void {
    const line = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(this.logFile, line, 'utf-8');
  }

  async add(entry: MemoryEntry): Promise<void> {
    await this.ensureInitialized();
    this.entries.set(entry.id, entry);
    this.appendLog({ op: 'add', entry, timestamp: Date.now() });
  }

  async get(id: string): Promise<MemoryEntry | null> {
    await this.ensureInitialized();
    return this.entries.get(id) || null;
  }

  async search(
    tokens: string[],
    options: MemorySearchOptions = {}
  ): Promise<MemorySearchResult[]> {
    await this.ensureInitialized();
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
    await this.ensureInitialized();
    const existed = this.entries.delete(id);
    if (existed) {
      this.appendLog({ op: 'delete', id, timestamp: Date.now() });
    }
    return existed;
  }

  async clear(namespace?: MemoryNamespace): Promise<number> {
    await this.ensureInitialized();

    if (!namespace) {
      const count = this.entries.size;
      for (const id of this.entries.keys()) {
        this.appendLog({ op: 'delete', id, timestamp: Date.now() });
      }
      this.entries.clear();
      return count;
    }

    let cleared = 0;
    for (const [id, entry] of this.entries.entries()) {
      if (entry.namespace === namespace) {
        this.entries.delete(id);
        this.appendLog({ op: 'delete', id, timestamp: Date.now() });
        cleared++;
      }
    }
    return cleared;
  }

  async list(namespace?: MemoryNamespace): Promise<MemoryEntry[]> {
    await this.ensureInitialized();
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
    await this.ensureInitialized();

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
   * Compact the log file by rewriting only current entries
   */
  async compact(): Promise<void> {
    await this.ensureInitialized();

    const tempFile = this.logFile + '.tmp';
    const entries = Array.from(this.entries.values());

    // Write all current entries to temp file
    const lines = entries.map((entry) =>
      JSON.stringify({ op: 'add' as Operation, entry, timestamp: Date.now() })
    );
    fs.writeFileSync(tempFile, lines.join('\n') + '\n', 'utf-8');

    // Replace original file
    fs.renameSync(tempFile, this.logFile);
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
    const recencyBonus = Math.max(0, 0.1 - ageHours * 0.001);
    score += recencyBonus;

    // Importance bonus
    if (entry.importance) {
      score += entry.importance * 0.05;
    }

    return Math.min(score, 1.0);
  }
}
