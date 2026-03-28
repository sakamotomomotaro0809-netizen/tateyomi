import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { AbstractTool } from "./AbstractTool.js";
import { createSuccessResponse, createErrorResponse } from "../common/response.js";
import type { LeadStore } from "../storage/lead-store.js";
import type { PipelineStore } from "../storage/pipeline-store.js";
import type { FollowupSchedule } from "../types.js";

export default class ScheduleFollowupTool extends AbstractTool {
  private readonly leadStore: LeadStore;
  private readonly pipelineStore: PipelineStore;

  constructor(leadStore: LeadStore, pipelineStore: PipelineStore) {
    super();
    this.leadStore = leadStore;
    this.pipelineStore = pipelineStore;
  }

  register(server: McpServer): void {
    server.tool(
      "sdr_schedule_followup",
      "リードへのフォローアップを予約。指定日時にメッセージを送信するスケジュールを作成。",
      {
        leadId: z.string().describe("リードID"),
        channel: z
          .enum(["line", "email", "sms", "voice"])
          .describe("配信チャネル"),
        scheduledAt: z
          .string()
          .describe("送信予定日時 (ISO 8601形式)"),
        message: z.string().describe("フォローアップメッセージ"),
      },
      async ({ leadId, channel, scheduledAt, message }) => {
        try {
          const lead = this.leadStore.getLeadById(leadId);
          if (!lead) {
            return createErrorResponse(`リードが見つかりません: ${leadId}`);
          }

          const scheduledDate = new Date(scheduledAt);
          if (isNaN(scheduledDate.getTime())) {
            return createErrorResponse("無効な日時形式です。ISO 8601形式で指定してください。");
          }

          const followup: FollowupSchedule = {
            id: uuidv4(),
            leadId,
            channel,
            scheduledAt: scheduledDate.toISOString(),
            message,
            status: "scheduled",
          };

          this.pipelineStore.addFollowup(followup);

          if (
            lead.pipelineStage === "outreach" ||
            lead.pipelineStage === "qualification"
          ) {
            this.pipelineStore.updateStage(leadId, "follow_up");
          }

          return createSuccessResponse({
            message: `フォローアップを予約しました: ${scheduledDate.toISOString()}`,
            followup,
          });
        } catch (error) {
          const msg =
            error instanceof Error ? error.message : String(error);
          return createErrorResponse(`フォローアップ予約失敗: ${msg}`);
        }
      }
    );
  }
}
