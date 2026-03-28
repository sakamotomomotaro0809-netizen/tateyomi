import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AbstractTool } from "./AbstractTool.js";
import { createSuccessResponse, createErrorResponse } from "../common/response.js";
import type { TwilioClient } from "../clients/twilio-client.js";
import type { OpenAIRealtimeClient } from "../clients/openai-realtime-client.js";
import type { WebhookServer } from "../webhook/server.js";
import type { HealthCheckResult } from "../types.js";

export default class HealthCheckTool extends AbstractTool {
  private readonly twilioClient: TwilioClient;
  private readonly openaiClient: OpenAIRealtimeClient;
  private readonly webhookServer: WebhookServer;

  constructor(
    twilioClient: TwilioClient,
    openaiClient: OpenAIRealtimeClient,
    webhookServer: WebhookServer
  ) {
    super();
    this.twilioClient = twilioClient;
    this.openaiClient = openaiClient;
    this.webhookServer = webhookServer;
  }

  register(server: McpServer): void {
    server.tool(
      "voice_health_check",
      "Check the health and connectivity status of all Voice AI subsystems (Twilio, OpenAI Realtime, Webhook server).",
      {},
      async () => {
        try {
          const [twilioConnected, openaiConnected] = await Promise.allSettled([
            this.twilioClient.checkConnection(),
            this.openaiClient.checkConnection(),
          ]);

          const result: HealthCheckResult = {
            twilio: {
              connected:
                twilioConnected.status === "fulfilled"
                  ? twilioConnected.value
                  : false,
              accountSid: this.twilioClient.getAccountSid(),
              error:
                twilioConnected.status === "rejected"
                  ? String(twilioConnected.reason)
                  : undefined,
            },
            openai: {
              connected:
                openaiConnected.status === "fulfilled"
                  ? openaiConnected.value
                  : false,
              model: this.openaiClient.getModel(),
              error:
                openaiConnected.status === "rejected"
                  ? String(openaiConnected.reason)
                  : undefined,
            },
            webhook: {
              running: this.webhookServer.isRunning(),
              port: this.webhookServer.getPort(),
            },
          };

          return createSuccessResponse(result);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          return createErrorResponse(`Health check failed: ${message}`);
        }
      }
    );
  }
}
