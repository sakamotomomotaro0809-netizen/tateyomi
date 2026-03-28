import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AbstractTool } from "./AbstractTool.js";
import { createSuccessResponse, createErrorResponse } from "../common/response.js";
import type { PipelineStore } from "../storage/pipeline-store.js";

export default class GetAnalyticsTool extends AbstractTool {
  private readonly pipelineStore: PipelineStore;

  constructor(pipelineStore: PipelineStore) {
    super();
    this.pipelineStore = pipelineStore;
  }

  register(server: McpServer): void {
    server.tool(
      "sdr_get_analytics",
      "KPIダッシュボード。チャネル別パフォーマンス、コンバージョン率、レコメンデーションを含む分析レポート。",
      {
        period: z
          .string()
          .optional()
          .describe("分析期間 (例: '2024-01', 'last_30_days', 'all_time')"),
      },
      async ({ period }) => {
        try {
          const report = this.pipelineStore.getAnalytics(period);

          return createSuccessResponse({
            message: "アナリティクスレポート",
            report,
          });
        } catch (error) {
          const msg =
            error instanceof Error ? error.message : String(error);
          return createErrorResponse(`アナリティクス取得失敗: ${msg}`);
        }
      }
    );
  }
}
