import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AbstractTool } from "./AbstractTool.js";
import { createSuccessResponse, createErrorResponse } from "../common/response.js";
import type { TwilioClient } from "../clients/twilio-client.js";
import type { EnvConfig } from "../types.js";

export default class MakeCallTool extends AbstractTool {
  private readonly client: TwilioClient;
  private readonly config: EnvConfig;

  constructor(client: TwilioClient, config: EnvConfig) {
    super();
    this.client = client;
    this.config = config;
  }

  register(server: McpServer): void {
    server.tool(
      "voice_make_call",
      "Make an outbound phone call with AI voice agent. The call connects to the webhook server which bridges Twilio MediaStream with OpenAI Realtime API.",
      {
        to: z.string().describe("Phone number to call (E.164 format, e.g. +1234567890)"),
        from: z.string().optional().describe("Caller ID phone number (E.164 format). Defaults to configured Twilio number."),
        prompt: z.string().optional().describe("System prompt for the AI voice agent during the call"),
        voice: z.enum(["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"]).optional().describe("Voice to use for AI agent. Default: alloy"),
      },
      async ({ to, from, prompt, voice }) => {
        try {
          const twimlUrl = `${this.config.webhookBaseUrl}/voice`;

          const result = await this.client.makeCall({
            to,
            from,
            twimlUrl,
          });

          return createSuccessResponse({
            callSid: result.callSid,
            from: result.from,
            to: result.to,
            status: result.status,
            direction: result.direction,
            prompt: prompt ?? "default",
            voice: voice ?? "alloy",
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return createErrorResponse(`Failed to make call: ${message}`);
        }
      }
    );
  }
}
