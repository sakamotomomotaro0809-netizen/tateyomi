/**
 * Proxy MCP Server
 *
 * Single entry point for Claude Code. Bundles multiple internal MCPs
 * behind a minimal public interface to reduce context pressure.
 *
 * Public Tools (exposed to Claude):
 * - system.health: Check if proxy is alive
 * - skill.search: Find skills from .claude/skills
 * - skill.run: Execute a skill
 * - memory.add: Store large content, return reference ID
 * - memory.search: Retrieve content by ID or keyword
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { systemHealth } from './tools/system';
import { skillSearch, skillRun } from './tools/skill';
import { memoryAdd, memorySearch, memoryStats } from './tools/memory';
import { ToolResult } from './types';

const server = new Server(
  {
    name: 'taisun-proxy-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions (minimal surface area)
const TOOLS = [
  {
    name: 'system_health',
    description: 'Check if Proxy MCP is alive and get status',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'skill_search',
    description: 'Search for skills in .claude/skills directory. Returns up to 10 matches.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query (optional, empty returns all)',
        },
      },
      required: [],
    },
  },
  {
    name: 'skill_run',
    description: 'Load and preview a skill by name. Full execution requires M2+ integration.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Skill name (directory name in .claude/skills)',
        },
        params: {
          type: 'object',
          description: 'Optional parameters for the skill',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'memory_add',
    description: 'Store large content and return a reference ID. Use this to avoid cluttering conversation. Either content or content_path must be provided (not both).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        content: {
          type: 'string',
          description: 'Content to store directly',
        },
        content_path: {
          type: 'string',
          description: 'Path to file to read and store (for large logs). Project-relative paths only.',
        },
        type: {
          type: 'string',
          enum: ['short-term', 'long-term'],
          description: 'Memory type (default: short-term)',
        },
        metadata: {
          type: 'object',
          description: 'Optional metadata',
        },
      },
      required: [],
    },
  },
  {
    name: 'memory_search',
    description: 'Search memory by reference ID or keyword',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Reference ID or search keyword',
        },
      },
      required: ['query'],
    },
  },
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  let result: ToolResult;

  switch (name) {
    case 'system_health':
      result = systemHealth();
      break;

    case 'skill_search':
      result = skillSearch((args?.query as string) || '');
      break;

    case 'skill_run':
      result = skillRun(
        args?.name as string,
        args?.params as Record<string, unknown> | undefined
      );
      break;

    case 'memory_add':
      result = await memoryAdd(
        args?.content as string | undefined,
        (args?.type as 'short-term' | 'long-term') || 'short-term',
        {
          ...args?.metadata as Record<string, unknown> | undefined,
          contentPath: args?.content_path as string | undefined,
        }
      );
      break;

    case 'memory_search':
      result = await memorySearch(args?.query as string);
      break;

    default:
      result = {
        success: false,
        error: `Unknown tool: ${name}`,
      };
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
    isError: !result.success,
  };
});

// Export for programmatic use
export { server, TOOLS, systemHealth, skillSearch, skillRun, memoryAdd, memorySearch, memoryStats };

// Run server if executed directly
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Proxy MCP server running on stdio');
}

// Check if running as main module
const isMain = process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js');
if (isMain) {
  main().catch(console.error);
}
