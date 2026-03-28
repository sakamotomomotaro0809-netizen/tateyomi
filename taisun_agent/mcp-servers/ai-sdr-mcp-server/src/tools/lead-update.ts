import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AbstractTool } from "./AbstractTool.js";
import { createSuccessResponse, createErrorResponse } from "../common/response.js";
import type { LeadStore } from "../storage/lead-store.js";

export default class LeadUpdateTool extends AbstractTool {
  private readonly store: LeadStore;

  constructor(store: LeadStore) {
    super();
    this.store = store;
  }

  register(server: McpServer): void {
    server.tool(
      "sdr_lead_update",
      "リード情報を更新。指定したフィールドのみ更新される。",
      {
        leadId: z.string().describe("リードID"),
        name: z.string().optional().describe("名前"),
        email: z.string().email().optional().describe("メールアドレス"),
        phone: z.string().optional().describe("電話番号"),
        lineUserId: z.string().optional().describe("LINE User ID"),
        company: z.string().optional().describe("会社名"),
        position: z.string().optional().describe("役職"),
        industry: z.string().optional().describe("業種"),
        companySize: z
          .enum(["small", "medium", "large", "enterprise"])
          .optional()
          .describe("企業規模"),
        region: z.string().optional().describe("地域"),
        source: z.string().optional().describe("リードソース"),
        tags: z.array(z.string()).optional().describe("タグ"),
      },
      async ({ leadId, ...data }) => {
        try {
          const cleanData = Object.fromEntries(
            Object.entries(data).filter(([, v]) => v !== undefined)
          );
          const updated = this.store.updateLead(leadId, cleanData);
          return createSuccessResponse({
            message: "リードを更新しました",
            lead: updated,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          return createErrorResponse(`リード更新失敗: ${message}`);
        }
      }
    );
  }
}
