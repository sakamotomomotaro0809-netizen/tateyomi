/**
 * Proxy MCP Types
 */

export interface SkillDefinition {
  name: string;
  description: string;
  path: string;
}

export interface MemoryEntry {
  id: string;
  content: string;
  type: 'short-term' | 'long-term';
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  referenceId?: string;
}

export interface InternalMcpConfig {
  name: string;
  enabled: boolean;
  endpoint?: string;
}
