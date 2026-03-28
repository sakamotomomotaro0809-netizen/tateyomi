/**
 * Memory System Types
 */

export type MemoryNamespace = 'short-term' | 'long-term';

export interface MemoryEntry {
  id: string;
  namespace: MemoryNamespace;
  content: string;
  summary: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  source?: string;
  importance?: number; // 0-1, higher = more important
  metadata?: Record<string, unknown>;
}

export interface MemorySearchResult {
  entry: MemoryEntry;
  score: number;
}

export interface MemoryAddOptions {
  namespace?: MemoryNamespace;
  tags?: string[];
  source?: string;
  importance?: number;
  metadata?: Record<string, unknown>;
}

export interface MemorySearchOptions {
  namespace?: MemoryNamespace;
  tags?: string[];
  limit?: number;
  minScore?: number;
  includeContent?: boolean;
}

export interface NamespaceConfig {
  maxEntries: number;
  ttlDays: number;
  maxContentChars: number;
  maxSummaryChars: number;
}

export interface MemoryConfig {
  version: string;
  storage: {
    defaultBackend: 'inmemory' | 'jsonl';
    directory: string;
  };
  namespaces: {
    'short-term': NamespaceConfig;
    'long-term': NamespaceConfig;
  };
  retrieval: {
    topK: number;
    minScore: number;
  };
  output: {
    includeContentByDefault: boolean;
    contentPreviewChars: number;
  };
}

export interface MemoryStore {
  add(entry: MemoryEntry): Promise<void>;
  get(id: string): Promise<MemoryEntry | null>;
  search(tokens: string[], options?: MemorySearchOptions): Promise<MemorySearchResult[]>;
  delete(id: string): Promise<boolean>;
  clear(namespace?: MemoryNamespace): Promise<number>;
  list(namespace?: MemoryNamespace): Promise<MemoryEntry[]>;
  count(namespace?: MemoryNamespace): Promise<number>;
}

export interface MemoryOutput {
  id: string;
  namespace: MemoryNamespace;
  summary: string;
  tags: string[];
  score?: number;
  createdAt: number;
  source?: string;
  importance?: number;
  contentPreview?: string;
}
