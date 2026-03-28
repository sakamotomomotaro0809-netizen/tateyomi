import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { AbstractTool } from "./AbstractTool.js";
import { createSuccessResponse, createErrorResponse } from "../common/response.js";
import type { TwilioClient } from "../clients/twilio-client.js";
import type { SmsResult, BroadcastResult } from "../types.js";

export default class BroadcastTool extends AbstractTool {
  private readonly client: TwilioClient;

  constructor(client: TwilioClient) {
    super();
    this.client = client;
  }

  register(server: McpServer): void {
    server.tool(
      "voice_broadcast",
      "Send an SMS broadcast message to multiple recipients. Returns results for each recipient.",
      {
        recipients: z.array(z.string()).min(1).max(100).describe("Array of phone numbers in E.164 format (max 100)"),
        message: z.string().min(1).max(1600).describe("SMS message body to broadcast"),
        schedule: z.string().optional().describe("ISO 8601 datetime to schedule the broadcast (not yet implemented, sends immediately)"),
      },
      async ({ recipients, message, schedule }) => {
        try {
          if (schedule) {
            return createErrorResponse("Scheduled broadcasts are not yet supported. Messages will be sent immediately.");
          }

          const broadcastId = uuidv4();
          const results: SmsResult[] = [];
          let successCount = 0;
          let failureCount = 0;

          for (const recipient of recipients) {
            try {
              const result = await this.client.sendSms({
                to: recipient,
                body: message,
              });
              results.push(result);
              successCount += 1;
            } catch (error) {
              const errMsg = error instanceof Error ? error.message : String(error);
              results.push({
                messageSid: "",
                status: "failed",
                to: recipient,
                from: "",
                body: `Error: ${errMsg}`,
              });
              failureCount += 1;
            }
          }

          const broadcastResult: BroadcastResult = {
            broadcastId,
            totalRecipients: recipients.length,
            successCount,
            failureCount,
            results,
          };

          return createSuccessResponse(broadcastResult);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          return createErrorResponse(`Failed to broadcast: ${msg}`);
        }
      }
    );
  }
}
