import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AbstractTool } from "./AbstractTool.js";
import { createSuccessResponse, createErrorResponse } from "../common/response.js";
import type { TwilioClient } from "../clients/twilio-client.js";

export default class SendSmsTool extends AbstractTool {
  private readonly client: TwilioClient;

  constructor(client: TwilioClient) {
    super();
    this.client = client;
  }

  register(server: McpServer): void {
    server.tool(
      "voice_send_sms",
      "Send an SMS text message via Twilio.",
      {
        to: z.string().describe("Recipient phone number (E.164 format, e.g. +1234567890)"),
        from: z.string().optional().describe("Sender phone number (E.164 format). Defaults to configured Twilio number."),
        body: z.string().describe("SMS message body text"),
      },
      async ({ to, from, body }) => {
        try {
          const result = await this.client.sendSms({ to, from, body });
          return createSuccessResponse(result);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return createErrorResponse(`Failed to send SMS: ${message}`);
        }
      }
    );
  }
}
