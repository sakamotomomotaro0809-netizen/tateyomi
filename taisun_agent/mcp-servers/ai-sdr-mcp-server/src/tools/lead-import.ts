import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AbstractTool } from "./AbstractTool.js";
import { createSuccessResponse, createErrorResponse } from "../common/response.js";
import type { LeadStore } from "../storage/lead-store.js";

const LeadRowSchema = z.object({
  name: z.string().describe("リード名"),
  email: z.string().email().describe("メールアドレス"),
  phone: z.string().optional().describe("電話番号"),
  lineUserId: z.string().optional().describe("LINE User ID"),
  company: z.string().describe("会社名"),
  position: z.string().describe("役職"),
  industry: z.string().describe("業種"),
  companySize: z
    .enum(["small", "medium", "large", "enterprise"])
    .optional()
    .describe("企業規模"),
  region: z.string().describe("地域"),
  source: z.string().optional().describe("リードソース"),
  tags: z.string().optional().describe("タグ (カンマ区切り)"),
});

export default class LeadImportTool extends AbstractTool {
  private readonly store: LeadStore;

  constructor(store: LeadStore) {
    super();
    this.store = store;
  }

  register(server: McpServer): void {
    server.tool(
      "sdr_lead_import",
      "CSV/APIからリードを一括取り込み。各リードのname, email, company, position, industry, regionは必須。",
      {
        leads: z
          .array(LeadRowSchema)
          .min(1)
          .describe("インポートするリードの配列"),
      },
      async ({ leads }) => {
        try {
          const imported = this.store.importLeads(leads);
          return createSuccessResponse({
            message: `${imported.length}件のリードをインポートしました`,
            importedCount: imported.length,
            leads: imported,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          return createErrorResponse(`リードインポート失敗: ${message}`);
        }
      }
    );
  }
}
