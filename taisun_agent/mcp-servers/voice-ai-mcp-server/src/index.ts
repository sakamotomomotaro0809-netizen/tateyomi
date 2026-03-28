#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadEnvConfig } from "./types.js";
import { TwilioClient } from "./clients/twilio-client.js";
import { OpenAIRealtimeClient } from "./clients/openai-realtime-client.js";
import { WebhookServer } from "./webhook/server.js";
import MakeCallTool from "./tools/make-call.js";
import EndCallTool from "./tools/end-call.js";
import GetCallStatusTool from "./tools/get-call-status.js";
import ListActiveCallsTool from "./tools/list-active-calls.js";
import SendSmsTool from "./tools/send-sms.js";
import SendVoiceMessageTool from "./tools/send-voice-message.js";
import BroadcastTool from "./tools/broadcast.js";
import StartRealtimeSessionTool from "./tools/start-realtime-session.js";
import ConfigureSessionTool from "./tools/configure-session.js";
import GetConversationLogTool from "./tools/get-conversation-log.js";
import HealthCheckTool from "./tools/health-check.js";

function validateEnv(): void {
  const required = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_PHONE_NUMBER",
    "OPENAI_REALTIME_API_KEY",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}

async function main(): Promise<void> {
  validateEnv();

  const config = loadEnvConfig();

  const server = new McpServer({
    name: "voice-ai",
    version: "0.1.0",
  });

  const twilioClient = new TwilioClient(config);
  const openaiClient = new OpenAIRealtimeClient(config);
  const webhookServer = new WebhookServer(openaiClient, config);

  const tools = [
    new MakeCallTool(twilioClient, config),
    new EndCallTool(twilioClient),
    new GetCallStatusTool(twilioClient),
    new ListActiveCallsTool(twilioClient),
    new SendSmsTool(twilioClient),
    new SendVoiceMessageTool(twilioClient, config),
    new BroadcastTool(twilioClient),
    new StartRealtimeSessionTool(openaiClient),
    new ConfigureSessionTool(openaiClient),
    new GetConversationLogTool(openaiClient),
    new HealthCheckTool(twilioClient, openaiClient, webhookServer),
  ];

  for (const tool of tools) {
    tool.register(server);
  }

  try {
    await webhookServer.start();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[voice-ai] Webhook server failed to start: ${message}`);
    console.error("[voice-ai] Continuing without webhook server. Inbound calls will not work.");
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.on("SIGINT", async () => {
    await webhookServer.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await webhookServer.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
