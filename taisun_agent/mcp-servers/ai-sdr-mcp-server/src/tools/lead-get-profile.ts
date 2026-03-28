import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AbstractTool } from "./AbstractTool.js";
import { createSuccessResponse, createErrorResponse } from "../common/response.js";
import type { LeadStore } from "../storage/lead-store.js";
import type { PipelineStore } from "../storage/pipeline-store.js";

export default class LeadGetProfileTool extends AbstractTool {
  private readonly leadStore: LeadStore;
  private readonly pipelineStore: PipelineStore;

  constructor(leadStore: LeadStore, pipelineStore: PipelineStore) {
    super();
    this.leadStore = leadStore;
    this.pipelineStore = pipelineStore;
  }

  register(server: McpServer): void {
    server.tool(
      "sdr_lead_get_profile",
      "リードの詳細プロフィールを取得。基本情報、シーケンス状況、フォローアップ履歴を含む。",
      {
        leadId: z.string().describe("リードID"),
      },
      async ({ leadId }) => {
        try {
          const lead = this.leadStore.getLeadById(leadId);
          if (!lead) {
            return createErrorResponse(`リードが見つかりません: ${leadId}`);
          }

          const sequences = this.pipelineStore.getSequencesByLeadId(leadId);
          const followups = this.pipelineStore.getFollowupsByLeadId(leadId);

          return createSuccessResponse({
            lead,
            sequences,
            followups,
            summary: {
              activeSequences: sequences.filter(
                (s) => s.status === "active"
              ).length,
              completedSequences: sequences.filter(
                (s) => s.status === "completed"
              ).length,
              pendingFollowups: followups.filter(
                (f) => f.status === "scheduled"
              ).length,
            },
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          return createErrorResponse(`プロフィール取得失敗: ${message}`);
        }
      }
    );
  }
}
