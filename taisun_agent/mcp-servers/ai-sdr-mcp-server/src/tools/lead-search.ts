import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AbstractTool } from "./AbstractTool.js";
import { createSuccessResponse, createErrorResponse } from "../common/response.js";
import type { LeadStore } from "../storage/lead-store.js";

export default class LeadSearchTool extends AbstractTool {
  private readonly store: LeadStore;

  constructor(store: LeadStore) {
    super();
    this.store = store;
  }

  register(server: McpServer): void {
    server.tool(
      "sdr_lead_search",
      "条件を指定してリードを検索。複数条件はAND結合。",
      {
        name: z.string().optional().describe("名前(部分一致)"),
        email: z.string().optional().describe("メール(部分一致)"),
        company: z.string().optional().describe("会社名(部分一致)"),
        industry: z.string().optional().describe("業種(部分一致)"),
        companySize: z
          .enum(["small", "medium", "large", "enterprise"])
          .optional()
          .describe("企業規模"),
        region: z.string().optional().describe("地域"),
        rank: z
          .enum(["HOT", "WARM", "COLD", "DISQUALIFIED"])
          .optional()
          .describe("ランク"),
        pipelineStage: z
          .enum([
            "discovery",
            "qualification",
            "outreach",
            "follow_up",
            "meeting",
            "closed_won",
            "closed_lost",
          ])
          .optional()
          .describe("パイプラインステージ"),
        source: z.string().optional().describe("リードソース"),
        minScore: z.number().optional().describe("最低スコア"),
        maxScore: z.number().optional().describe("最高スコア"),
      },
      async (filters) => {
        try {
          const results = this.store.searchLeads(filters);
          return createSuccessResponse({
            message: `${results.length}件のリードが見つかりました`,
            count: results.length,
            leads: results,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          return createErrorResponse(`リード検索失敗: ${message}`);
        }
      }
    );
  }
}
