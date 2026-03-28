import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AbstractTool } from "./AbstractTool.js";
import { createSuccessResponse, createErrorResponse } from "../common/response.js";
import type { TwilioClient } from "../clients/twilio-client.js";

export default class ListActiveCallsTool extends AbstractTool {
  private readonly client: TwilioClient;

  constructor(client: TwilioClient) {
    super();
    this.client = client;
  }

  register(server: McpServer): void {
    server.tool(
      "voice_list_active_calls",
      "List all currently active (in-progress) phone calls.",
      {},
      async () => {
        try {
          const calls = await this.client.listActiveCalls();
          return createSuccessResponse({ calls, count: calls.length });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return createErrorResponse(`Failed to list active calls: ${message}`);
        }
      }
    );
  }
}
