import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AbstractTool } from "./AbstractTool.js";
import { createSuccessResponse, createErrorResponse } from "../common/response.js";
import type { OpenAIRealtimeClient } from "../clients/openai-realtime-client.js";

export default class ConfigureSessionTool extends AbstractTool {
  private readonly client: OpenAIRealtimeClient;

  constructor(client: OpenAIRealtimeClient) {
    super();
    this.client = client;
  }

  register(server: McpServer): void {
    server.tool(
      "voice_configure_session",
      "Update the configuration of an active OpenAI Realtime session. Can change system prompt, voice, turn detection settings, etc.",
      {
        sessionId: z.string().describe("The session ID to configure"),
        systemPrompt: z.string().optional().describe("Updated system prompt/instructions"),
        voice: z.enum(["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"]).optional().describe("Updated voice"),
        vadThreshold: z.number().min(0).max(1).optional().describe("Voice Activity Detection threshold (0-1). Default: 0.5"),
        silenceDurationMs: z.number().min(100).max(5000).optional().describe("Silence duration in ms before turn ends. Default: 500"),
      },
      async ({ sessionId, systemPrompt, voice, vadThreshold, silenceDurationMs }) => {
        try {
          const configUpdate: Record<string, unknown> = {};

          if (systemPrompt !== undefined) {
            configUpdate.systemPrompt = systemPrompt;
          }

          if (voice !== undefined) {
            configUpdate.voice = { voice };
          }

          if (vadThreshold !== undefined || silenceDurationMs !== undefined) {
            configUpdate.turnDetection = {
              type: "server_vad" as const,
              ...(vadThreshold !== undefined ? { threshold: vadThreshold } : {}),
              ...(silenceDurationMs !== undefined ? { silenceDurationMs } : {}),
            };
          }

          const updated = await this.client.configureSession(
            sessionId,
            configUpdate as never
          );

          return createSuccessResponse({
            sessionId: updated.sessionId,
            status: updated.status,
            config: {
              systemPrompt: updated.config.systemPrompt,
              voice: updated.config.voice.voice,
              turnDetection: updated.config.turnDetection,
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return createErrorResponse(`Failed to configure session: ${message}`);
        }
      }
    );
  }
}
