import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AbstractTool } from "./AbstractTool.js";
import { createSuccessResponse, createErrorResponse } from "../common/response.js";
import type { LeadStore } from "../storage/lead-store.js";
import type { PipelineStore } from "../storage/pipeline-store.js";

const VALID_TRANSITIONS: Record<string, readonly string[]> = {
  discovery: ["qualification", "closed_lost"],
  qualification: ["outreach", "closed_lost"],
  outreach: ["follow_up", "meeting", "closed_lost"],
  follow_up: ["meeting", "outreach", "closed_lost"],
  meeting: ["closed_won", "closed_lost", "follow_up"],
  closed_won: [],
  closed_lost: ["discovery"],
};

export default class UpdatePipelineStageTool extends AbstractTool {
  private readonly leadStore: LeadStore;
  private readonly pipelineStore: PipelineStore;

  constructor(leadStore: LeadStore, pipelineStore: PipelineStore) {
    super();
    this.leadStore = leadStore;
    this.pipelineStore = pipelineStore;
  }

  register(server: McpServer): void {
    server.tool(
      "sdr_update_pipeline_stage",
      "リードのパイプラインステージを遷移。有効な遷移パスのみ許可。",
      {
        leadId: z.string().describe("リードID"),
        stage: z
          .enum([
            "discovery",
            "qualification",
            "outreach",
            "follow_up",
            "meeting",
            "closed_won",
            "closed_lost",
          ])
          .describe("遷移先ステージ"),
        force: z
          .boolean()
          .optional()
          .describe("強制遷移 (バリデーションスキップ)"),
      },
      async ({ leadId, stage, force }) => {
        try {
          const lead = this.leadStore.getLeadById(leadId);
          if (!lead) {
            return createErrorResponse(`リードが見つかりません: ${leadId}`);
          }

          if (!force) {
            const allowed = VALID_TRANSITIONS[lead.pipelineStage] ?? [];
            if (!allowed.includes(stage)) {
              return createErrorResponse(
                `無効なステージ遷移: ${lead.pipelineStage} -> ${stage}。` +
                `有効な遷移先: ${allowed.join(", ") || "なし"}`
              );
            }
          }

          const previousStage = lead.pipelineStage;
          this.pipelineStore.updateStage(leadId, stage);
          const updatedLead = this.leadStore.getLeadById(leadId);

          return createSuccessResponse({
            message: `ステージを遷移しました: ${previousStage} -> ${stage}`,
            previousStage,
            newStage: stage,
            lead: updatedLead,
            forced: force === true,
          });
        } catch (error) {
          const msg =
            error instanceof Error ? error.message : String(error);
          return createErrorResponse(`ステージ更新失敗: ${msg}`);
        }
      }
    );
  }
}
