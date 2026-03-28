import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AbstractTool } from "./AbstractTool.js";
import { createSuccessResponse, createErrorResponse } from "../common/response.js";
import type { TwilioClient } from "../clients/twilio-client.js";

export default class EndCallTool extends AbstractTool {
  private readonly client: TwilioClient;

  constructor(client: TwilioClient) {
    super();
    this.client = client;
  }

  register(server: McpServer): void {
    server.tool(
      "voice_end_call",
      "End an active phone call by its Call SID.",
      {
        callSid: z.string().describe("The Twilio Call SID of the call to end"),
      },
      async ({ callSid }) => {
        try {
          const success = await this.client.endCall(callSid);
          return createSuccessResponse({ callSid, ended: success });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return createErrorResponse(`Failed to end call: ${message}`);
        }
      }
    );
  }
}
