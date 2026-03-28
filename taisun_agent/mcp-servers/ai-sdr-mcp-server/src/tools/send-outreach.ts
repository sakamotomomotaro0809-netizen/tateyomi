import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AbstractTool } from "./AbstractTool.js";
import { createSuccessResponse, createErrorResponse } from "../common/response.js";
import type { LeadStore } from "../storage/lead-store.js";
import type { PipelineStore } from "../storage/pipeline-store.js";
import { composeMessage } from "../outreach/message-composer.js";
import { selectChannel } from "../outreach/channel-router.js";

export default class SendOutreachTool extends AbstractTool {
  private readonly leadStore: LeadStore;
  private readonly pipelineStore: PipelineStore;

  constructor(leadStore: LeadStore, pipelineStore: PipelineStore) {
    super();
    this.leadStore = leadStore;
    this.pipelineStore = pipelineStore;
  }

  register(server: McpServer): void {
    server.tool(
      "sdr_send_outreach",
      "リードへメッセージを送信。チャネル未指定時はランクに基づき自動ルーティング。実際の送信はシミュレーション。",
      {
        leadId: z.string().describe("リードID"),
        channel: z
          .enum(["line", "email", "sms", "voice"])
          .optional()
          .describe("配信チャネル (省略時は自動選択)"),
        templateKey: z
          .string()
          .optional()
          .describe("テンプレートキー"),
      },
      async ({ leadId, channel, templateKey }) => {
        try {
          const lead = this.leadStore.getLeadById(leadId);
          if (!lead) {
            return createErrorResponse(`リードが見つかりません: ${leadId}`);
          }

          const selectedChannel = channel ?? selectChannel(lead);
          const message = composeMessage(lead, selectedChannel, templateKey);

          const sentMessage = {
            ...message,
            status: "sent" as const,
            sentAt: new Date().toISOString(),
          };

          this.pipelineStore.addMessage(sentMessage);

          if (lead.pipelineStage === "discovery" || lead.pipelineStage === "qualification") {
            this.pipelineStore.updateStage(leadId, "outreach");
          }

          return createSuccessResponse({
            message: `${selectedChannel}チャネルでメッセージを送信しました`,
            outreachMessage: sentMessage,
            channelUsed: selectedChannel,
            autoRouted: channel === undefined,
          });
        } catch (error) {
          const msg =
            error instanceof Error ? error.message : String(error);
          return createErrorResponse(`送信失敗: ${msg}`);
        }
      }
    );
  }
}
