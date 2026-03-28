import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AbstractTool } from "./AbstractTool.js";
import { createSuccessResponse, createErrorResponse } from "../common/response.js";
import type { LeadStore } from "../storage/lead-store.js";
import { scoreLead } from "../scoring/lead-scorer.js";
import type { SignalContext } from "../scoring/scoring-rules.js";

export default class ScoreLeadTool extends AbstractTool {
  private readonly store: LeadStore;

  constructor(store: LeadStore) {
    super();
    this.store = store;
  }

  register(server: McpServer): void {
    server.tool(
      "sdr_score_lead",
      "リードを4次元(Demographic/Behavioral/Engagement/Intent)でスコアリング。シグナル情報を基にスコアとランクを算出。",
      {
        leadId: z.string().describe("リードID"),
        pagesViewed: z.number().optional().describe("閲覧ページ数"),
        downloadedResources: z.boolean().optional().describe("資料DL済み"),
        attendedSeminar: z.boolean().optional().describe("セミナー参加済み"),
        requestedDemo: z.boolean().optional().describe("デモ申込済み"),
        emailOpened: z.boolean().optional().describe("メール開封済み"),
        lineResponded: z.boolean().optional().describe("LINE反応あり"),
        replied: z.boolean().optional().describe("返信あり"),
        attendedMeeting: z.boolean().optional().describe("ミーティング参加済み"),
        viewedPricingPage: z.boolean().optional().describe("価格ページ閲覧"),
        requestedMaterials: z.boolean().optional().describe("資料請求済み"),
        madeInquiry: z.boolean().optional().describe("問合せあり"),
        viewedComparisonPage: z.boolean().optional().describe("競合比較ページ閲覧"),
      },
      async ({ leadId, ...signals }) => {
        try {
          const lead = this.store.getLeadById(leadId);
          if (!lead) {
            return createErrorResponse(`リードが見つかりません: ${leadId}`);
          }

          const signalContext: SignalContext = {
            ...signals,
          };

          const result = scoreLead(lead, signalContext);

          this.store.updateLead(leadId, {
            score: result.totalScore,
            rank: result.rank,
          });

          return createSuccessResponse({
            message: `スコアリング完了: ${result.rank} (${result.totalScore}点)`,
            score: result,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          return createErrorResponse(`スコアリング失敗: ${message}`);
        }
      }
    );
  }
}
