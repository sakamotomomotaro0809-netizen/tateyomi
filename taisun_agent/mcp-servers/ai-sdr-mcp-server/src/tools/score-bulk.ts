import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AbstractTool } from "./AbstractTool.js";
import { createSuccessResponse, createErrorResponse } from "../common/response.js";
import type { LeadStore } from "../storage/lead-store.js";
import { scoreBulk } from "../scoring/lead-scorer.js";
import type { SignalContext } from "../scoring/scoring-rules.js";

const SignalSchema = z.object({
  pagesViewed: z.number().optional(),
  downloadedResources: z.boolean().optional(),
  attendedSeminar: z.boolean().optional(),
  requestedDemo: z.boolean().optional(),
  emailOpened: z.boolean().optional(),
  lineResponded: z.boolean().optional(),
  replied: z.boolean().optional(),
  attendedMeeting: z.boolean().optional(),
  viewedPricingPage: z.boolean().optional(),
  requestedMaterials: z.boolean().optional(),
  madeInquiry: z.boolean().optional(),
  viewedComparisonPage: z.boolean().optional(),
});

export default class ScoreBulkTool extends AbstractTool {
  private readonly store: LeadStore;

  constructor(store: LeadStore) {
    super();
    this.store = store;
  }

  register(server: McpServer): void {
    server.tool(
      "sdr_score_bulk",
      "複数リードを一括スコアリング。leadIdをキーとしたシグナルマップを受け取る。",
      {
        signalsMap: z
          .record(z.string(), SignalSchema)
          .describe("leadIdをキー、シグナル情報を値とするマップ"),
      },
      async ({ signalsMap }) => {
        try {
          const leadIds = Object.keys(signalsMap);
          const leads = leadIds
            .map((id) => this.store.getLeadById(id))
            .filter((lead): lead is NonNullable<typeof lead> => lead !== null);

          if (leads.length === 0) {
            return createErrorResponse("有効なリードが見つかりません");
          }

          const typedSignalsMap: Record<string, SignalContext> = signalsMap;
          const results = scoreBulk(leads, typedSignalsMap);

          for (const result of results) {
            this.store.updateLead(result.leadId, {
              score: result.totalScore,
              rank: result.rank,
            });
          }

          const summary = {
            HOT: results.filter((r) => r.rank === "HOT").length,
            WARM: results.filter((r) => r.rank === "WARM").length,
            COLD: results.filter((r) => r.rank === "COLD").length,
            DISQUALIFIED: results.filter((r) => r.rank === "DISQUALIFIED").length,
          };

          return createSuccessResponse({
            message: `${results.length}件のリードをスコアリングしました`,
            scoredCount: results.length,
            summary,
            scores: results,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          return createErrorResponse(`一括スコアリング失敗: ${message}`);
        }
      }
    );
  }
}
