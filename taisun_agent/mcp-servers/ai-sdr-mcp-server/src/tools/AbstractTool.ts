import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export abstract class AbstractTool {
  abstract register(server: McpServer): void;
}
