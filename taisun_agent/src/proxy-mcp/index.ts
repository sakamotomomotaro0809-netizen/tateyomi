/**
 * Proxy MCP - Single entry point for Claude Code
 *
 * Exposes minimal public interface to reduce context pressure.
 */

export { server, TOOLS } from './server';
export { systemHealth } from './tools/system';
export { skillSearch, skillRun } from './tools/skill';
export { memoryAdd, memorySearch, memoryStats, memoryClearShortTerm, memoryClearAll } from './tools/memory';
export type { SkillDefinition, MemoryEntry, ToolResult, InternalMcpConfig } from './types';
