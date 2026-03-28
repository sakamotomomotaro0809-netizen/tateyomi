/**
 * Memory Store - Base interface and factory
 */

import { MemoryStore, MemoryConfig } from './types';
import { InMemoryStore } from './stores/inmemory';
import { JsonlStore } from './stores/jsonl';

/**
 * Create a memory store based on configuration
 */
export function createStore(config: MemoryConfig): MemoryStore {
  switch (config.storage.defaultBackend) {
    case 'jsonl':
      return new JsonlStore(config.storage.directory);
    case 'inmemory':
    default:
      return new InMemoryStore();
  }
}

/**
 * Re-export store implementations for direct use
 */
export { InMemoryStore } from './stores/inmemory';
export { JsonlStore } from './stores/jsonl';
