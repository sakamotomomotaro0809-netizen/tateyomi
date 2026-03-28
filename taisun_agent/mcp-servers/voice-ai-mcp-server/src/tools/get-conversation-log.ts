import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AbstractTool } from "./AbstractTool.js";
import { createSuccessResponse, createErrorResponse } from "../common/response.js";
import type { OpenAIRealtimeClient } from "../clients/openai-realtime-client.js";

export default class GetConversationLogTool extends AbstractTool {
  private readonly client: OpenAIRealtimeClient;

  constructor(client: OpenAIRealtimeClient) {
    super();
    this.client = client;
  }

  register(server: McpServer): void {
    server.tool(
      "voice_get_conversation_log",
      "Retrieve the conversation log for a voice session or call. Returns all messages exchanged during the session.",
      {
        sessionId: z.string().optional().describe("The Realtime session ID"),
        callSid: z.string().optional().describe("The Twilio Call SID. Used to look up the associated session."),
      },
      async ({ sessionId, callSid }) => {
        try {
          if (!sessionId && !callSid) {
            return createErrorResponse("Either 'sessionId' or 'callSid' must be provided");
          }

          let resolvedSessionId = sessionId;

          if (!resolvedSessionId && callSid) {
            resolvedSessionId = this.client.findSessionByCallSid(callSid);
            if (!resolvedSessionId) {
              return createErrorResponse(`No session found for callSid: ${callSid}`);
            }
          }

          const log = this.client.getConversationLog(resolvedSessionId!, callSid);

          if (!log) {
            return createErrorResponse(`No conversation log found for session: ${resolvedSessionId}`);
          }

          return createSuccessResponse({
            callSid: log.callSid,
            sessionId: log.sessionId,
            messageCount: log.messages.length,
            duration: log.duration,
            messages: log.messages,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return createErrorResponse(`Failed to get conversation log: ${message}`);
        }
      }
    );
  }
}
