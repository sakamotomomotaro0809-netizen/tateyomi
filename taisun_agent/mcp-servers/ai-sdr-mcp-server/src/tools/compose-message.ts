import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AbstractTool } from "./AbstractTool.js";
import { createSuccessResponse, createErrorResponse } from "../common/response.js";
import type { LeadStore } from "../storage/lead-store.js";
import { composeMessage, getAvailableTemplates } from "../outreach/message-composer.js";

export default class ComposeMessageTool extends AbstractTool {
  private readonly store: LeadStore;

  constructor(store: LeadStore) {
    super();
    this.store = store;
  }

  register(server: McpServer): void {
    server.tool(
      "sdr_compose_message",
      "リード向けのパーソナライズされたメッセージを作成。チャネルに応じた文字数制限を自動適用。",
      {
        leadId: z.string().describe("リードID"),
        channel: z
          .enum(["line", "email", "sms", "voice"])
          .describe("配信チャネル"),
        templateKey: z
          .string()
          .optional()
          .describe("テンプレートキー (省略時はランクとチャネルから自動選択)"),
      },
      async ({ leadId, channel, templateKey }) => {
        try {
          const lead = this.store.getLeadById(leadId);
          if (!lead) {
            return createErrorResponse(`リードが見つかりません: ${leadId}`);
          }

          const message = composeMessage(lead, channel, templateKey);

          return createSuccessResponse({
            message: "メッセージを作成しました",
            outreachMessage: message,
            availableTemplates: getAvailableTemplates(),
          });
        } catch (error) {
          const msg =
            error instanceof Error ? error.message : String(error);
          return createErrorResponse(`メッセージ作成失敗: ${msg}`);
        }
      }
    );
  }
}
