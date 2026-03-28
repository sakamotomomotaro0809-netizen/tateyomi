import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AbstractTool } from "./AbstractTool.js";
import { createSuccessResponse, createErrorResponse } from "../common/response.js";
import type { TwilioClient } from "../clients/twilio-client.js";

export default class GetCallStatusTool extends AbstractTool {
  private readonly client: TwilioClient;

  constructor(client: TwilioClient) {
    super();
    this.client = client;
  }

  register(server: McpServer): void {
    server.tool(
      "voice_get_call_status",
      "Get the current status of a phone call including duration and cost.",
      {
        callSid: z.string().describe("The Twilio Call SID to check"),
      },
      async ({ callSid }) => {
        try {
          const status = await this.client.getCallStatus(callSid);
          return createSuccessResponse(status);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return createErrorResponse(`Failed to get call status: ${message}`);
        }
      }
    );
  }
}
